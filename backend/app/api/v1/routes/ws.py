from uuid import UUID

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from jose import JWTError

from app.core.database import async_session_factory
from app.core.logging import logger
from app.core.security import decode_token
from app.core.ws_manager import ws_manager
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

    The client sends nothing after connecting — this is a
    one-way push channel. Connection stays open until the
    client disconnects or the token expires.
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
    try:
        # Keep connection alive — just read and discard client frames
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.debug("WS error for user=%s: %s", user_id, exc)
    finally:
        ws_manager.disconnect(user_id, ws)
