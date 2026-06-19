"""Unit tests for app.services.comment_service — build_response and validation."""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.core.exceptions import BadRequest, Forbidden, NotFound
from app.services.comment_service import _build_response, create_comment


class TestBuildResponse:
    def _make_comment(self, **kwargs):
        c = MagicMock()
        c.id = kwargs.get("id", uuid4())
        c.post_id = kwargs.get("post_id", uuid4())
        c.author_id = kwargs.get("author_id", uuid4())
        c.content = kwargs.get("content", "Test comment")
        c.parent_comment_id = kwargs.get("parent_comment_id", None)
        c.created_at = datetime(2024, 1, 1, tzinfo=timezone.utc)
        c.updated_at = datetime(2024, 6, 1, tzinfo=timezone.utc)
        return c

    def _make_author(self, **kwargs):
        a = MagicMock()
        a.id = kwargs.get("id", uuid4())
        a.username = kwargs.get("username", "commenter")
        a.full_name = kwargs.get("full_name", "Comment Author")
        a.profile_image_url = None
        return a

    def test_basic_response(self):
        comment = self._make_comment()
        author = self._make_author()
        result = _build_response(comment, author)
        assert result.content == "Test comment"
        assert result.author.username == "commenter"
        assert result.reply_count == 0
        assert result.replies == []

    def test_deleted_author(self):
        comment = self._make_comment()
        result = _build_response(comment, None)
        assert result.author.username == "[deleted]"
        assert result.author.full_name == "Deleted User"

    def test_with_reply_count(self):
        comment = self._make_comment()
        author = self._make_author()
        result = _build_response(comment, author, reply_count=2)
        assert result.reply_count == 2

    def test_with_parent(self):
        parent_id = uuid4()
        comment = self._make_comment(parent_comment_id=parent_id)
        author = self._make_author()
        result = _build_response(comment, author)
        assert result.parent_comment_id == parent_id


class TestCreateComment:
    @pytest.mark.asyncio
    async def test_deactivated_user(self, mock_db, sample_user):
        sample_user.is_active = False
        req = MagicMock()
        req.content = "Hello"
        req.parent_comment_id = None

        with pytest.raises(BadRequest, match="deactivated"):
            await create_comment(mock_db, uuid4(), sample_user, req)

    @pytest.mark.asyncio
    async def test_post_not_found(self, mock_db, sample_user):
        req = MagicMock()
        req.content = "Hello"
        req.parent_comment_id = None

        mock_post_repo = MagicMock()
        mock_post_repo.get_by_id = AsyncMock(return_value=None)

        with patch("app.services.comment_service.PostRepository", return_value=mock_post_repo):
            with pytest.raises(NotFound, match="Post"):
                await create_comment(mock_db, uuid4(), sample_user, req)

    @pytest.mark.asyncio
    async def test_non_member_forbidden(self, mock_db, sample_user):
        req = MagicMock()
        req.content = "Hello"
        req.parent_comment_id = None

        post = MagicMock()
        post.community_id = uuid4()
        mock_post_repo = MagicMock()
        mock_post_repo.get_by_id = AsyncMock(return_value=post)

        mock_community_repo = MagicMock()
        mock_community_repo.is_member = AsyncMock(return_value=False)

        with (
            patch("app.services.comment_service.PostRepository", return_value=mock_post_repo),
            patch("app.services.comment_service.CommunityRepository", return_value=mock_community_repo),
        ):
            with pytest.raises(Forbidden, match="member"):
                await create_comment(mock_db, uuid4(), sample_user, req)

    @pytest.mark.asyncio
    async def test_parent_not_found(self, mock_db, sample_user):
        parent_id = uuid4()
        req = MagicMock()
        req.content = "Reply"
        req.parent_comment_id = parent_id

        post = MagicMock()
        post.community_id = uuid4()
        mock_post_repo = MagicMock()
        mock_post_repo.get_by_id = AsyncMock(return_value=post)

        mock_community_repo = MagicMock()
        mock_community_repo.is_member = AsyncMock(return_value=True)

        mock_comment_repo = MagicMock()
        mock_comment_repo.get_by_id = AsyncMock(return_value=None)

        with (
            patch("app.services.comment_service.PostRepository", return_value=mock_post_repo),
            patch("app.services.comment_service.CommunityRepository", return_value=mock_community_repo),
            patch("app.services.comment_service.CommentRepository", return_value=mock_comment_repo),
        ):
            with pytest.raises(NotFound, match="Parent comment"):
                await create_comment(mock_db, uuid4(), sample_user, req)

    @pytest.mark.asyncio
    async def test_nested_reply_blocked(self, mock_db, sample_user):
        parent_id = uuid4()
        post_id = uuid4()
        req = MagicMock()
        req.content = "Nested reply"
        req.parent_comment_id = parent_id

        post = MagicMock()
        post.community_id = uuid4()
        mock_post_repo = MagicMock()
        mock_post_repo.get_by_id = AsyncMock(return_value=post)

        mock_community_repo = MagicMock()
        mock_community_repo.is_member = AsyncMock(return_value=True)

        parent_comment = MagicMock()
        parent_comment.post_id = post_id
        parent_comment.parent_comment_id = uuid4()  # already a reply
        mock_comment_repo = MagicMock()
        mock_comment_repo.get_by_id = AsyncMock(return_value=parent_comment)

        with (
            patch("app.services.comment_service.PostRepository", return_value=mock_post_repo),
            patch("app.services.comment_service.CommunityRepository", return_value=mock_community_repo),
            patch("app.services.comment_service.CommentRepository", return_value=mock_comment_repo),
        ):
            with pytest.raises(BadRequest, match="one level"):
                await create_comment(mock_db, post_id, sample_user, req)

    @pytest.mark.asyncio
    async def test_reply_wrong_post(self, mock_db, sample_user):
        parent_id = uuid4()
        post_id = uuid4()
        req = MagicMock()
        req.content = "Reply"
        req.parent_comment_id = parent_id

        post = MagicMock()
        post.community_id = uuid4()
        mock_post_repo = MagicMock()
        mock_post_repo.get_by_id = AsyncMock(return_value=post)

        mock_community_repo = MagicMock()
        mock_community_repo.is_member = AsyncMock(return_value=True)

        parent_comment = MagicMock()
        parent_comment.post_id = uuid4()  # different post
        parent_comment.parent_comment_id = None
        mock_comment_repo = MagicMock()
        mock_comment_repo.get_by_id = AsyncMock(return_value=parent_comment)

        with (
            patch("app.services.comment_service.PostRepository", return_value=mock_post_repo),
            patch("app.services.comment_service.CommunityRepository", return_value=mock_community_repo),
            patch("app.services.comment_service.CommentRepository", return_value=mock_comment_repo),
        ):
            with pytest.raises(BadRequest, match="does not belong"):
                await create_comment(mock_db, post_id, sample_user, req)
