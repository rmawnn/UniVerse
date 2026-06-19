"""Unit tests for message_service — guard clauses and operations."""

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.core.exceptions import BadRequest, Forbidden, NotFound
from app.services.message_service import (
    list_messages,
    search_messages,
    send_message,
)


class TestSendMessage:
    @pytest.mark.asyncio
    async def test_deactivated_user(self, mock_db, sample_user):
        sample_user.is_active = False
        with pytest.raises(BadRequest, match="deactivated"):
            await send_message(mock_db, uuid4(), sample_user, "hello")

    @pytest.mark.asyncio
    async def test_conv_not_found(self, mock_db, sample_user):
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=None)

        with patch("app.services.message_service.ConversationRepository", return_value=mock_repo):
            with pytest.raises(NotFound, match="Conversation"):
                await send_message(mock_db, uuid4(), sample_user, "hello")

    @pytest.mark.asyncio
    async def test_not_participant(self, mock_db, sample_user):
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=MagicMock())
        mock_repo.is_participant = AsyncMock(return_value=False)

        with patch("app.services.message_service.ConversationRepository", return_value=mock_repo):
            with pytest.raises(Forbidden, match="not a participant"):
                await send_message(mock_db, uuid4(), sample_user, "hello")


class TestListMessages:
    @pytest.mark.asyncio
    async def test_conv_not_found(self, mock_db, sample_user):
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=None)

        with patch("app.services.message_service.ConversationRepository", return_value=mock_repo):
            with pytest.raises(NotFound, match="Conversation"):
                await list_messages(mock_db, uuid4(), sample_user)

    @pytest.mark.asyncio
    async def test_not_participant(self, mock_db, sample_user):
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=MagicMock())
        mock_repo.is_participant = AsyncMock(return_value=False)

        with patch("app.services.message_service.ConversationRepository", return_value=mock_repo):
            with pytest.raises(Forbidden, match="not a participant"):
                await list_messages(mock_db, uuid4(), sample_user)

    @pytest.mark.asyncio
    async def test_empty(self, mock_db, sample_user):
        mock_conv_repo = MagicMock()
        mock_conv_repo.get_by_id = AsyncMock(return_value=MagicMock())
        mock_conv_repo.is_participant = AsyncMock(return_value=True)

        mock_msg_repo = MagicMock()
        mock_msg_repo.count_by_conversation = AsyncMock(return_value=0)
        mock_msg_repo.list_by_conversation = AsyncMock(return_value=[])

        with (
            patch("app.services.message_service.ConversationRepository", return_value=mock_conv_repo),
            patch("app.services.message_service.MessageRepository", return_value=mock_msg_repo),
        ):
            result = await list_messages(mock_db, uuid4(), sample_user)
            assert result.total == 0


class TestSearchMessages:
    @pytest.mark.asyncio
    async def test_conv_not_found(self, mock_db, sample_user):
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=None)

        with patch("app.services.message_service.ConversationRepository", return_value=mock_repo):
            with pytest.raises(NotFound, match="Conversation"):
                await search_messages(mock_db, uuid4(), sample_user, "query")

    @pytest.mark.asyncio
    async def test_not_participant(self, mock_db, sample_user):
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=MagicMock())
        mock_repo.is_participant = AsyncMock(return_value=False)

        with patch("app.services.message_service.ConversationRepository", return_value=mock_repo):
            with pytest.raises(Forbidden, match="not a participant"):
                await search_messages(mock_db, uuid4(), sample_user, "query")

    @pytest.mark.asyncio
    async def test_empty(self, mock_db, sample_user):
        mock_conv_repo = MagicMock()
        mock_conv_repo.get_by_id = AsyncMock(return_value=MagicMock())
        mock_conv_repo.is_participant = AsyncMock(return_value=True)

        mock_msg_repo = MagicMock()
        mock_msg_repo.count_search_by_conversation = AsyncMock(return_value=0)
        mock_msg_repo.search_by_conversation = AsyncMock(return_value=[])

        with (
            patch("app.services.message_service.ConversationRepository", return_value=mock_conv_repo),
            patch("app.services.message_service.MessageRepository", return_value=mock_msg_repo),
        ):
            result = await search_messages(mock_db, uuid4(), sample_user, "query")
            assert result.total == 0
