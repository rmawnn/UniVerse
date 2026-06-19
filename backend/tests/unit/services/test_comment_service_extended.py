"""Extended tests for comment_service — create_comment guard clauses and list_comments."""

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.core.exceptions import BadRequest, Forbidden, NotFound
from app.services.comment_service import create_comment, list_comments


class TestCreateComment:
    @pytest.mark.asyncio
    async def test_deactivated(self, mock_db, sample_user):
        sample_user.is_active = False
        data = MagicMock()
        with pytest.raises(BadRequest, match="deactivated"):
            await create_comment(mock_db, uuid4(), sample_user, data)

    @pytest.mark.asyncio
    async def test_post_not_found(self, mock_db, sample_user):
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=None)
        data = MagicMock()

        with patch("app.services.comment_service.PostRepository", return_value=mock_repo):
            with pytest.raises(NotFound, match="Post"):
                await create_comment(mock_db, uuid4(), sample_user, data)

    @pytest.mark.asyncio
    async def test_not_community_member(self, mock_db, sample_user):
        post = MagicMock()
        post.community_id = uuid4()

        mock_post_repo = MagicMock()
        mock_post_repo.get_by_id = AsyncMock(return_value=post)

        mock_comm_repo = MagicMock()
        mock_comm_repo.is_member = AsyncMock(return_value=False)

        data = MagicMock()

        with (
            patch("app.services.comment_service.PostRepository", return_value=mock_post_repo),
            patch("app.services.comment_service.CommunityRepository", return_value=mock_comm_repo),
        ):
            with pytest.raises(Forbidden, match="member"):
                await create_comment(mock_db, uuid4(), sample_user, data)

    @pytest.mark.asyncio
    async def test_parent_not_found(self, mock_db, sample_user):
        post = MagicMock()
        post.community_id = uuid4()

        mock_post_repo = MagicMock()
        mock_post_repo.get_by_id = AsyncMock(return_value=post)

        mock_comm_repo = MagicMock()
        mock_comm_repo.is_member = AsyncMock(return_value=True)

        mock_comment_repo = MagicMock()
        mock_comment_repo.get_by_id = AsyncMock(return_value=None)

        data = MagicMock()
        data.parent_comment_id = uuid4()

        with (
            patch("app.services.comment_service.PostRepository", return_value=mock_post_repo),
            patch("app.services.comment_service.CommunityRepository", return_value=mock_comm_repo),
            patch("app.services.comment_service.CommentRepository", return_value=mock_comment_repo),
        ):
            with pytest.raises(NotFound, match="Parent comment"):
                await create_comment(mock_db, uuid4(), sample_user, data)

    @pytest.mark.asyncio
    async def test_parent_wrong_post(self, mock_db, sample_user):
        post_id = uuid4()
        post = MagicMock()
        post.community_id = uuid4()

        parent = MagicMock()
        parent.post_id = uuid4()

        mock_post_repo = MagicMock()
        mock_post_repo.get_by_id = AsyncMock(return_value=post)

        mock_comm_repo = MagicMock()
        mock_comm_repo.is_member = AsyncMock(return_value=True)

        mock_comment_repo = MagicMock()
        mock_comment_repo.get_by_id = AsyncMock(return_value=parent)

        data = MagicMock()
        data.parent_comment_id = uuid4()

        with (
            patch("app.services.comment_service.PostRepository", return_value=mock_post_repo),
            patch("app.services.comment_service.CommunityRepository", return_value=mock_comm_repo),
            patch("app.services.comment_service.CommentRepository", return_value=mock_comment_repo),
        ):
            with pytest.raises(BadRequest, match="does not belong"):
                await create_comment(mock_db, post_id, sample_user, data)

    @pytest.mark.asyncio
    async def test_nested_reply(self, mock_db, sample_user):
        post_id = uuid4()
        post = MagicMock()
        post.community_id = uuid4()

        parent = MagicMock()
        parent.post_id = post_id
        parent.parent_comment_id = uuid4()

        mock_post_repo = MagicMock()
        mock_post_repo.get_by_id = AsyncMock(return_value=post)

        mock_comm_repo = MagicMock()
        mock_comm_repo.is_member = AsyncMock(return_value=True)

        mock_comment_repo = MagicMock()
        mock_comment_repo.get_by_id = AsyncMock(return_value=parent)

        data = MagicMock()
        data.parent_comment_id = uuid4()

        with (
            patch("app.services.comment_service.PostRepository", return_value=mock_post_repo),
            patch("app.services.comment_service.CommunityRepository", return_value=mock_comm_repo),
            patch("app.services.comment_service.CommentRepository", return_value=mock_comment_repo),
        ):
            with pytest.raises(BadRequest, match="one level"):
                await create_comment(mock_db, post_id, sample_user, data)


class TestCreateCommentSuccess:
    @pytest.mark.asyncio
    async def test_top_level_comment(self, mock_db, sample_user):
        post_id = uuid4()
        post = MagicMock()
        post.community_id = uuid4()
        post.author_id = uuid4()

        created_comment = MagicMock()
        created_comment.id = uuid4()
        created_comment.post_id = post_id
        created_comment.author_id = sample_user.id
        created_comment.content = "Great post!"
        created_comment.parent_comment_id = None
        created_comment.created_at = MagicMock()
        created_comment.updated_at = MagicMock()

        mock_post_repo = MagicMock()
        mock_post_repo.get_by_id = AsyncMock(return_value=post)

        mock_comm_repo = MagicMock()
        mock_comm_repo.is_member = AsyncMock(return_value=True)

        mock_comment_repo = MagicMock()
        mock_comment_repo.create = AsyncMock(return_value=created_comment)

        data = MagicMock()
        data.content = "Great post!"
        data.parent_comment_id = None

        with (
            patch("app.services.comment_service.PostRepository", return_value=mock_post_repo),
            patch("app.services.comment_service.CommunityRepository", return_value=mock_comm_repo),
            patch("app.services.comment_service.CommentRepository", return_value=mock_comment_repo),
            patch("app.services.comment_service.notification_service") as mock_notif,
        ):
            mock_notif.notify = AsyncMock()
            result = await create_comment(mock_db, post_id, sample_user, data)
            assert result.content == "Great post!"
            assert result.reply_count == 0
            mock_notif.notify.assert_called_once()

    @pytest.mark.asyncio
    async def test_comment_own_post_no_notification(self, mock_db, sample_user):
        post_id = uuid4()
        post = MagicMock()
        post.community_id = uuid4()
        post.author_id = sample_user.id

        created_comment = MagicMock()
        created_comment.id = uuid4()
        created_comment.post_id = post_id
        created_comment.author_id = sample_user.id
        created_comment.content = "My own comment"
        created_comment.parent_comment_id = None
        created_comment.created_at = MagicMock()
        created_comment.updated_at = MagicMock()

        mock_post_repo = MagicMock()
        mock_post_repo.get_by_id = AsyncMock(return_value=post)

        mock_comm_repo = MagicMock()
        mock_comm_repo.is_member = AsyncMock(return_value=True)

        mock_comment_repo = MagicMock()
        mock_comment_repo.create = AsyncMock(return_value=created_comment)

        data = MagicMock()
        data.content = "My own comment"
        data.parent_comment_id = None

        with (
            patch("app.services.comment_service.PostRepository", return_value=mock_post_repo),
            patch("app.services.comment_service.CommunityRepository", return_value=mock_comm_repo),
            patch("app.services.comment_service.CommentRepository", return_value=mock_comment_repo),
            patch("app.services.comment_service.notification_service") as mock_notif,
        ):
            mock_notif.notify = AsyncMock()
            result = await create_comment(mock_db, post_id, sample_user, data)
            assert result.content == "My own comment"
            mock_notif.notify.assert_not_called()

    @pytest.mark.asyncio
    async def test_reply_notifies_parent_author(self, mock_db, sample_user):
        post_id = uuid4()
        parent_author_id = uuid4()
        post_author_id = uuid4()

        post = MagicMock()
        post.community_id = uuid4()
        post.author_id = post_author_id

        parent_comment = MagicMock()
        parent_comment.post_id = post_id
        parent_comment.parent_comment_id = None
        parent_comment.author_id = parent_author_id

        created_comment = MagicMock()
        created_comment.id = uuid4()
        created_comment.post_id = post_id
        created_comment.author_id = sample_user.id
        created_comment.content = "Nice reply"
        created_comment.parent_comment_id = uuid4()
        created_comment.created_at = MagicMock()
        created_comment.updated_at = MagicMock()

        mock_post_repo = MagicMock()
        mock_post_repo.get_by_id = AsyncMock(return_value=post)

        mock_comm_repo = MagicMock()
        mock_comm_repo.is_member = AsyncMock(return_value=True)

        mock_comment_repo = MagicMock()
        mock_comment_repo.get_by_id = AsyncMock(return_value=parent_comment)
        mock_comment_repo.create = AsyncMock(return_value=created_comment)

        data = MagicMock()
        data.content = "Nice reply"
        data.parent_comment_id = uuid4()

        with (
            patch("app.services.comment_service.PostRepository", return_value=mock_post_repo),
            patch("app.services.comment_service.CommunityRepository", return_value=mock_comm_repo),
            patch("app.services.comment_service.CommentRepository", return_value=mock_comment_repo),
            patch("app.services.comment_service.notification_service") as mock_notif,
        ):
            mock_notif.notify = AsyncMock()
            result = await create_comment(mock_db, post_id, sample_user, data)
            assert result.content == "Nice reply"
            assert mock_notif.notify.call_count == 2


class TestListComments:
    @pytest.mark.asyncio
    async def test_post_not_found(self, mock_db):
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=None)

        with patch("app.services.comment_service.PostRepository", return_value=mock_repo):
            with pytest.raises(NotFound, match="Post"):
                await list_comments(mock_db, uuid4())
