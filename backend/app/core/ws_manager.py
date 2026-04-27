"""
In-memory WebSocket connection manager.

Tracks connected users and allows broadcasting JSON events
to all of a user's active connections (they may have multiple
browser tabs open).

Thread-safety note: asyncio is single-threaded, so plain dicts
are safe here — no locks needed.
"""

from uuid import UUID

from fastapi import WebSocket

from app.core.logging import logger


class ConnectionManager:
    """Simple pub/sub: user_id → set of WebSocket connections."""

    def __init__(self) -> None:
        self._connections: dict[UUID, set[WebSocket]] = {}

    async def connect(self, user_id: UUID, ws: WebSocket) -> None:
        await ws.accept()
        if user_id not in self._connections:
            self._connections[user_id] = set()
        self._connections[user_id].add(ws)
        logger.debug("WS connect: user=%s (total=%d)", user_id, len(self._connections[user_id]))

    def disconnect(self, user_id: UUID, ws: WebSocket) -> None:
        conns = self._connections.get(user_id)
        if conns:
            conns.discard(ws)
            if not conns:
                del self._connections[user_id]
        logger.debug("WS disconnect: user=%s", user_id)

    async def send_to_user(self, user_id: UUID, event: dict) -> None:
        """Send a JSON event to all active connections of a user."""
        conns = self._connections.get(user_id)
        if not conns:
            return
        dead: list[WebSocket] = []
        for ws in conns:
            try:
                await ws.send_json(event)
            except Exception:
                dead.append(ws)
        # Clean up broken connections
        for ws in dead:
            conns.discard(ws)
        if not conns:
            self._connections.pop(user_id, None)


# Singleton used by services and the WS route
ws_manager = ConnectionManager()
