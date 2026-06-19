"""Unit tests for app.core.ws_manager — WebSocket connection manager."""

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.core.ws_manager import ConnectionManager


class TestConnectionManager:
    @pytest.fixture
    def manager(self):
        return ConnectionManager()

    @pytest.fixture
    def mock_ws(self):
        ws = AsyncMock()
        ws.accept = AsyncMock()
        ws.send_json = AsyncMock()
        return ws

    @pytest.mark.asyncio
    async def test_connect_accepts_websocket(self, manager, mock_ws):
        user_id = uuid4()
        await manager.connect(user_id, mock_ws)
        mock_ws.accept.assert_called_once()

    @pytest.mark.asyncio
    async def test_connect_stores_connection(self, manager, mock_ws):
        user_id = uuid4()
        await manager.connect(user_id, mock_ws)
        assert user_id in manager._connections
        assert mock_ws in manager._connections[user_id]

    @pytest.mark.asyncio
    async def test_connect_multiple_tabs(self, manager):
        user_id = uuid4()
        ws1 = AsyncMock()
        ws2 = AsyncMock()
        await manager.connect(user_id, ws1)
        await manager.connect(user_id, ws2)
        assert len(manager._connections[user_id]) == 2

    def test_disconnect_removes_connection(self, manager, mock_ws):
        user_id = uuid4()
        manager._connections[user_id] = {mock_ws}
        manager.disconnect(user_id, mock_ws)
        assert user_id not in manager._connections

    def test_disconnect_keeps_other_connections(self, manager):
        user_id = uuid4()
        ws1 = MagicMock()
        ws2 = MagicMock()
        manager._connections[user_id] = {ws1, ws2}
        manager.disconnect(user_id, ws1)
        assert user_id in manager._connections
        assert ws2 in manager._connections[user_id]

    def test_disconnect_nonexistent_user(self, manager, mock_ws):
        manager.disconnect(uuid4(), mock_ws)

    @pytest.mark.asyncio
    async def test_send_to_user(self, manager, mock_ws):
        user_id = uuid4()
        manager._connections[user_id] = {mock_ws}
        event = {"type": "test", "data": "hello"}
        await manager.send_to_user(user_id, event)
        mock_ws.send_json.assert_called_once_with(event)

    @pytest.mark.asyncio
    async def test_send_to_user_no_connections(self, manager):
        await manager.send_to_user(uuid4(), {"type": "test"})

    @pytest.mark.asyncio
    async def test_send_to_user_cleans_dead_connections(self, manager):
        user_id = uuid4()
        dead_ws = AsyncMock()
        dead_ws.send_json = AsyncMock(side_effect=Exception("connection closed"))
        manager._connections[user_id] = {dead_ws}
        await manager.send_to_user(user_id, {"type": "test"})
        assert user_id not in manager._connections
