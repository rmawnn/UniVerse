"""Unit tests for conversation_service — guard clauses and operations."""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.core.exceptions import BadRequest, Forbidden, NotFound
from app.services.conversation_service import (
    _build_response,
    create_conversation,
    list_conversations,
    mark_conversation_read,
)


class TestCreateConversation:
    @pytest.mark.asyncio
    async def test_self_conversation(self, mock_db, sample_user):
        with pytest.raises(BadRequest, match="yourself"):
            await create_conversation(mock_db, sample_user, sample_user.id)

    @pytest.mark.asyncio
    async def test_user_not_found(self, mock_db, sample_user):
        mock_user_repo = MagicMock()
        mock_user_repo.get_by_id = AsyncMock(return_value=None)

        with patch("app.services.conversation_service.UserRepository", return_value=mock_user_repo):
            with pytest.raises(NotFound, match="User"):
                await create_conversation(mock_db, sample_user, uuid4())

    @pytest.mark.asyncio
    async def test_existing_conv_reused(self, mock_db, sample_user):
        other_id = uuid4()
        other_user = MagicMock()
        other_user.id = other_id
        other_user.username = "other"
        other_user.full_name = "Other User"
        other_user.profile_image_url = None

        existing_conv = MagicMock()
        existing_conv.id = uuid4()
        existing_conv.created_at = datetime(2024, 6, 1, tzinfo=timezone.utc)

        participant = MagicMock()
        participant.user_id = sample_user.id
        participant2 = MagicMock()
        participant2.user_id = other_id

        mock_user_repo = MagicMock()
        mock_user_repo.get_by_id = AsyncMock(return_value=other_user)

        mock_conv_repo = MagicMock()
        mock_conv_repo.get_between_users = AsyncMock(return_value=existing_conv)
        mock_conv_repo.get_participants = AsyncMock(return_value=[participant, participant2])

        with (
            patch("app.services.conversation_service.UserRepository", return_value=mock_user_repo),
            patch("app.services.conversation_service.ConversationRepository", return_value=mock_conv_repo),
        ):
            result = await create_conversation(mock_db, sample_user, other_id)
            assert result.id == existing_conv.id
            assert len(result.participants) == 2

    @pytest.mark.asyncio
    async def test_new_conv_created(self, mock_db, sample_user):
        other_id = uuid4()
        other_user = MagicMock()
        other_user.id = other_id
        other_user.username = "newuser"
        other_user.full_name = "New User"
        other_user.profile_image_url = None

        new_conv = MagicMock()
        new_conv.id = uuid4()
        new_conv.created_at = datetime(2024, 6, 1, tzinfo=timezone.utc)

        mock_user_repo = MagicMock()
        mock_user_repo.get_by_id = AsyncMock(return_value=other_user)

        mock_conv_repo = MagicMock()
        mock_conv_repo.get_between_users = AsyncMock(return_value=None)
        mock_conv_repo.create = AsyncMock(return_value=new_conv)
        mock_conv_repo.add_participant = AsyncMock()

        with (
            patch("app.services.conversation_service.UserRepository", return_value=mock_user_repo),
            patch("app.services.conversation_service.ConversationRepository", return_value=mock_conv_repo),
        ):
            result = await create_conversation(mock_db, sample_user, other_id)
            assert result.id == new_conv.id
            assert mock_conv_repo.add_participant.call_count == 2


class TestMarkConversationRead:
    @pytest.mark.asyncio
    async def test_not_found(self, mock_db, sample_user):
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=None)

        with patch("app.services.conversation_service.ConversationRepository", return_value=mock_repo):
            with pytest.raises(NotFound, match="Conversation"):
                await mark_conversation_read(mock_db, uuid4(), sample_user)

    @pytest.mark.asyncio
    async def test_not_participant(self, mock_db, sample_user):
        conv = MagicMock()
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=conv)
        mock_repo.is_participant = AsyncMock(return_value=False)

        with patch("app.services.conversation_service.ConversationRepository", return_value=mock_repo):
            with pytest.raises(Forbidden, match="not a participant"):
                await mark_conversation_read(mock_db, uuid4(), sample_user)

    @pytest.mark.asyncio
    async def test_success(self, mock_db, sample_user):
        conv = MagicMock()
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=conv)
        mock_repo.is_participant = AsyncMock(return_value=True)
        mock_repo.mark_read = AsyncMock()

        with patch("app.services.conversation_service.ConversationRepository", return_value=mock_repo):
            await mark_conversation_read(mock_db, uuid4(), sample_user)
            mock_repo.mark_read.assert_called_once()


class TestListConversations:
    @pytest.mark.asyncio
    async def test_empty(self, mock_db, sample_user):
        mock_repo = MagicMock()
        mock_repo.count_by_user = AsyncMock(return_value=0)
        mock_repo.list_by_user = AsyncMock(return_value=[])

        with patch("app.services.conversation_service.ConversationRepository", return_value=mock_repo):
            result = await list_conversations(mock_db, sample_user)
            assert result.total == 0
            assert result.items == []


class TestBuildResponse:
    def test_with_users(self):
        uid1 = uuid4()
        uid2 = uuid4()

        user1 = MagicMock()
        user1.id = uid1
        user1.username = "alice"
        user1.full_name = "Alice Smith"
        user1.profile_image_url = None

        user2 = MagicMock()
        user2.id = uid2
        user2.username = "bob"
        user2.full_name = "Bob Jones"
        user2.profile_image_url = None

        conv = MagicMock()
        conv.id = uuid4()
        conv.created_at = datetime(2024, 6, 1, tzinfo=timezone.utc)

        result = _build_response(
            conv, [uid1, uid2], {uid1: user1, uid2: user2},
            last_message=None,
        )
        assert len(result.participants) == 2
        usernames = {p.username for p in result.participants}
        assert "alice" in usernames
        assert "bob" in usernames
        assert result.last_message is None
        assert result.unread_count == 0

    def test_with_deleted_user(self):
        uid1 = uuid4()
        uid2 = uuid4()

        user1 = MagicMock()
        user1.id = uid1
        user1.username = "alice"
        user1.full_name = "Alice Smith"
        user1.profile_image_url = None

        conv = MagicMock()
        conv.id = uuid4()
        conv.created_at = datetime(2024, 6, 1, tzinfo=timezone.utc)

        result = _build_response(
            conv, [uid1, uid2], {uid1: user1},
            last_message=None,
        )
        assert len(result.participants) == 2
        deleted = [p for p in result.participants if p.username == "[deleted]"]
        assert len(deleted) == 1

    def test_with_unread_count(self):
        uid = uuid4()
        user = MagicMock()
        user.id = uid
        user.username = "test"
        user.full_name = "Test"
        user.profile_image_url = None

        conv = MagicMock()
        conv.id = uuid4()
        conv.created_at = datetime(2024, 6, 1, tzinfo=timezone.utc)

        result = _build_response(
            conv, [uid], {uid: user},
            last_message=None, unread_count=5,
        )
        assert result.unread_count == 5
