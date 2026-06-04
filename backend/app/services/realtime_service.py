"""
Supabase Realtime broadcast service with FastAPI WebSocket fallback.

When Supabase is configured, this service broadcasts events via
Supabase Realtime channels — allowing the frontend to subscribe
directly from the browser (scaling beyond a single FastAPI process).

When Supabase is NOT configured, it delegates to the existing
in-memory ConnectionManager (single-process WebSocket).

The FastAPI WebSocket endpoint (ws.py) is always kept as the primary
connection mechanism — Supabase Realtime is used as an additional
broadcast channel for horizontal scaling.
"""

import logging
from uuid import UUID

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class SupabaseRealtimePublisher:
    """
    Publishes events to Supabase Realtime channels via the REST API.

    This is the server-side publisher; clients subscribe directly to
    Supabase Realtime channels from the browser using the anon key.

    Channel scheme:
      - ``user:{user_id}`` — per-user channel for DMs, notifications
      - ``conversation:{conv_id}`` — per-conversation typing/read receipts
      - ``presence`` — global online/offline presence
    """

    def __init__(self) -> None:
        self.base_url = settings.SUPABASE_URL.rstrip("/")
        self.realtime_url = f"{self.base_url}/realtime/v1"
        self.headers = {
            "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": "application/json",
        }

    async def broadcast(
        self,
        channel: str,
        event: str,
        payload: dict,
    ) -> None:
        """
        Broadcast a message to a Supabase Realtime channel.

        Uses the Supabase Realtime REST broadcast endpoint so that
        any subscriber to the channel receives the event — regardless
        of which FastAPI instance originated it.
        """
        body = {
            "messages": [
                {
                    "topic": channel,
                    "event": event,
                    "payload": payload,
                }
            ],
        }
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"{self.realtime_url}/api/broadcast",
                    headers=self.headers,
                    json=body,
                    timeout=5.0,
                )
                if resp.status_code not in (200, 201, 202):
                    logger.warning(
                        "Supabase Realtime broadcast failed: %s %s",
                        resp.status_code, resp.text,
                    )
        except Exception as exc:
            # Non-fatal: the in-memory WS manager is the primary path
            logger.debug("Supabase Realtime broadcast error: %s", exc)


# ── Singleton ──────────────────────────────────────────────────

_publisher: SupabaseRealtimePublisher | None = None


def _get_publisher() -> SupabaseRealtimePublisher | None:
    global _publisher
    if not settings.supabase_configured:
        return None
    if _publisher is None:
        _publisher = SupabaseRealtimePublisher()
    return _publisher


# ── High-level broadcast API ───────────────────────────────────


async def broadcast_to_user(user_id: UUID, event_type: str, data: dict) -> None:
    """
    Broadcast an event to a specific user via Supabase Realtime.
    Also sends via in-memory WS manager (the primary path).
    """
    from app.core.ws_manager import ws_manager

    # Always send via in-memory WS (works in single-process mode)
    event = {"type": event_type, "data": data}
    await ws_manager.send_to_user(user_id, event)

    # Additionally broadcast via Supabase Realtime (multi-process)
    publisher = _get_publisher()
    if publisher:
        await publisher.broadcast(
            channel=f"user:{user_id}",
            event=event_type,
            payload=data,
        )


async def broadcast_to_conversation(
    conversation_id: UUID,
    event_type: str,
    data: dict,
    *,
    exclude_user: UUID | None = None,
) -> None:
    """
    Broadcast an event to all participants of a conversation.
    Uses the conversation channel for typing indicators, read receipts.
    """
    publisher = _get_publisher()
    if publisher:
        payload = {**data}
        if exclude_user:
            payload["_exclude_user"] = str(exclude_user)
        await publisher.broadcast(
            channel=f"conversation:{conversation_id}",
            event=event_type,
            payload=payload,
        )


async def broadcast_presence(user_id: UUID, status: str) -> None:
    """Broadcast online/offline status change."""
    publisher = _get_publisher()
    if publisher:
        await publisher.broadcast(
            channel="presence",
            event="presence_update",
            payload={
                "user_id": str(user_id),
                "status": status,
            },
        )
