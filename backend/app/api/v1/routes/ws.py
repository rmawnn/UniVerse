import json
from uuid import UUID

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from jose import JWTError

from app.core.database import async_session_factory
from app.core.logging import logger
from app.core.security import decode_token
from app.core.ws_manager import ws_manager
from app.repositories.conversation_repository import ConversationRepository
from app.repositories.user_repository import UserRepository

router = APIRouter()


async def _authenticate_ws(token: str) -> UUID | None:
    """Validate JWT and return user_id, or None on failure."""
    try:
        payload = decode_token(token)
        user_id_str = payload.get("sub")
        if not user_id_str:
            logger.debug("WS auth: token has no 'sub' claim")
            return None
        user_id = UUID(user_id_str)
    except (JWTError, ValueError) as exc:
        logger.debug("WS auth: token decode failed — %s", exc)
        return None

    # Quick DB check: user exists and is active
    async with async_session_factory() as session:
        repo = UserRepository(session)
        user = await repo.get_by_id(user_id)
        if not user or not user.is_active:
            logger.debug("WS auth: user %s not found or inactive", user_id)
            return None

    return user_id


async def _handle_typing(user_id: UUID, data: dict, event_type: str) -> None:
    """Forward a typing_start / typing_stop event to the other participant."""
    conv_id_str = data.get("conversation_id")
    if not conv_id_str:
        return
    try:
        conversation_id = UUID(conv_id_str)
    except ValueError:
        return

    # Verify user is a participant and find the other user(s)
    async with async_session_factory() as session:
        conv_repo = ConversationRepository(session)
        participants = await conv_repo.get_participants(conversation_id)

    other_ids = [p.user_id for p in participants if p.user_id != user_id]
    if not other_ids:
        return

    event = {
        "type": event_type,
        "data": {
            "conversation_id": str(conversation_id),
            "user_id": str(user_id),
        },
    }
    for other_id in other_ids:
        await ws_manager.send_to_user(other_id, event)


@router.websocket("/ws")
async def websocket_endpoint(
    ws: WebSocket,
    token: str = Query(...),
):
    """
    Single WebSocket endpoint for all real-time events.

    Client connects with ?token=<JWT>.
    Server pushes events as JSON:
      {"type": "new_message", "data": {...}}
      {"type": "new_notification", "data": {...}}
      {"type": "typing_start", "data": {"conversation_id": ..., "user_id": ...}}
      {"type": "typing_stop",  "data": {"conversation_id": ..., "user_id": ...}}

    Client can also send events:
      {"type": "typing_start", "data": {"conversation_id": "..."}}
      {"type": "typing_stop",  "data": {"conversation_id": "..."}}
    """
    user_id = await _authenticate_ws(token)
    if user_id is None:
        # Must accept before closing so the client receives the 4001 code.
        # Without accept(), the browser sees a generic connection error and
        # never gets the close code — causing infinite reconnect loops.
        await ws.accept()
        await ws.close(code=4001, reason="Authentication failed")
        return

    await ws_manager.connect(user_id, ws)

    # Broadcast presence online via Supabase Realtime (if configured)
    from app.services.realtime_service import broadcast_presence
    await broadcast_presence(user_id, "online")

    try:
        while True:
            raw = await ws.receive_text()
            # Parse and handle client-sent events
            try:
                msg = json.loads(raw)
                msg_type = msg.get("type")
                msg_data = msg.get("data", {})

                if msg_type in ("typing_start", "typing_stop"):
                    await _handle_typing(user_id, msg_data, msg_type)
            except (json.JSONDecodeError, AttributeError):
                # Ignore malformed frames
                pass
    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.debug("WS error for user=%s: %s", user_id, exc)
    finally:
        ws_manager.disconnect(user_id, ws)
        await broadcast_presence(user_id, "offline")
