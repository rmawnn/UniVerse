"""Unit tests for post_service — guard clauses, edge cases, and response builders."""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.core.exceptions import BadRequest, Forbidden, NotFound
from app.services.post_service import (
    SHORTS_DAILY_LIMIT,
    _build_response,
    create_post,
    get_post,
    list_posts,
    list_shorts,
    list_user_posts,
)


class TestCreatePost:
    @pytest.mark.asyncio
    async def test_deactivated(self, mock_db, sample_user):
        sample_user.is_active = False
        data = MagicMock()
        with pytest.raises(BadRequest, match="deactivated"):
            await create_post(mock_db, uuid4(), sample_user, data)

    @pytest.mark.asyncio
    async def test_short_no_video(self, mock_db, sample_user):
        data = MagicMock()
        data.post_type = "short"
        data.video_url = None

        mock_post_repo = MagicMock()

        with patch("app.services.post_service.PostRepository", return_value=mock_post_repo):
            with pytest.raises(BadRequest, match="require a video"):
                await create_post(mock_db, uuid4(), sample_user, data)

    @pytest.mark.asyncio
    async def test_short_daily_limit(self, mock_db, sample_user):
        data = MagicMock()
        data.post_type = "short"
        data.video_url = "http://example.com/v.mp4"

        mock_post_repo = MagicMock()
        mock_post_repo.count_shorts_by_author_today = AsyncMock(return_value=SHORTS_DAILY_LIMIT)

        with patch("app.services.post_service.PostRepository", return_value=mock_post_repo):
            with pytest.raises(BadRequest, match="shorts per day"):
                await create_post(mock_db, uuid4(), sample_user, data)

    @pytest.mark.asyncio
    async def test_community_not_found(self, mock_db, sample_user):
        data = MagicMock()
        data.post_type = "post"

        mock_post_repo = MagicMock()
        mock_comm_repo = MagicMock()
        mock_comm_repo.get_by_id = AsyncMock(return_value=None)

        with (
            patch("app.services.post_service.PostRepository", return_value=mock_post_repo),
            patch("app.services.post_service.CommunityRepository", return_value=mock_comm_repo),
        ):
            with pytest.raises(NotFound, match="Community"):
                await create_post(mock_db, uuid4(), sample_user, data)

    @pytest.mark.asyncio
    async def test_not_member(self, mock_db, sample_user):
        data = MagicMock()
        data.post_type = "post"

        community = MagicMock()
        mock_post_repo = MagicMock()
        mock_comm_repo = MagicMock()
        mock_comm_repo.get_by_id = AsyncMock(return_value=community)
        mock_comm_repo.is_member = AsyncMock(return_value=False)

        with (
            patch("app.services.post_service.PostRepository", return_value=mock_post_repo),
            patch("app.services.post_service.CommunityRepository", return_value=mock_comm_repo),
        ):
            with pytest.raises(Forbidden, match="member"):
                await create_post(mock_db, uuid4(), sample_user, data)


class TestGetPost:
    @pytest.mark.asyncio
    async def test_not_found(self, mock_db):
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=None)

        with patch("app.services.post_service.PostRepository", return_value=mock_repo):
            with pytest.raises(NotFound, match="Post"):
                await get_post(mock_db, uuid4())


class TestListPosts:
    @pytest.mark.asyncio
    async def test_community_not_found(self, mock_db):
        mock_comm_repo = MagicMock()
        mock_comm_repo.get_by_id = AsyncMock(return_value=None)

        with patch("app.services.post_service.CommunityRepository", return_value=mock_comm_repo):
            with pytest.raises(NotFound, match="Community"):
                await list_posts(mock_db, uuid4())

    @pytest.mark.asyncio
    async def test_empty(self, mock_db):
        community = MagicMock()
        mock_comm_repo = MagicMock()
        mock_comm_repo.get_by_id = AsyncMock(return_value=community)

        mock_post_repo = MagicMock()
        mock_post_repo.count_by_community = AsyncMock(return_value=0)
        mock_post_repo.list_by_community = AsyncMock(return_value=[])

        with (
            patch("app.services.post_service.CommunityRepository", return_value=mock_comm_repo),
            patch("app.services.post_service.PostRepository", return_value=mock_post_repo),
        ):
            result = await list_posts(mock_db, uuid4())
            assert result.total == 0
            assert result.items == []


class TestListUserPosts:
    @pytest.mark.asyncio
    async def test_empty(self, mock_db):
        mock_repo = MagicMock()
        mock_repo.count_by_author = AsyncMock(return_value=0)
        mock_repo.list_by_author = AsyncMock(return_value=[])

        with patch("app.services.post_service.PostRepository", return_value=mock_repo):
            result = await list_user_posts(mock_db, uuid4())
            assert result.total == 0
            assert result.items == []


class TestListShorts:
    @pytest.mark.asyncio
    async def test_empty(self, mock_db):
        mock_repo = MagicMock()
        mock_repo.count_shorts = AsyncMock(return_value=0)
        mock_repo.list_shorts = AsyncMock(return_value=[])

        with patch("app.services.post_service.PostRepository", return_value=mock_repo):
            result = await list_shorts(mock_db)
            assert result.total == 0
            assert result.items == []


class TestBuildResponse:
    def _make_post(self, **kwargs):
        post = MagicMock()
        post.id = kwargs.get("id", uuid4())
        post.community_id = kwargs.get("community_id", uuid4())
        post.author_id = kwargs.get("author_id", uuid4())
        post.content = kwargs.get("content", "Hello world")
        post.image_url = kwargs.get("image_url", None)
        post.video_url = kwargs.get("video_url", None)
        post.post_type = kwargs.get("post_type", "post")
        post.category = kwargs.get("category", "general")
        post.created_at = kwargs.get("created_at", datetime(2024, 6, 1, tzinfo=timezone.utc))
        post.updated_at = kwargs.get("updated_at", datetime(2024, 6, 1, tzinfo=timezone.utc))
        return post

    def _make_author(self, **kwargs):
        user = MagicMock()
        user.id = kwargs.get("id", uuid4())
        user.username = kwargs.get("username", "poster")
        user.full_name = kwargs.get("full_name", "Post Author")
        user.profile_image_url = kwargs.get("profile_image_url", None)
        return user

    def test_with_author(self):
        post = self._make_post(content="Test content")
        author = self._make_author(username="alice")
        result = _build_response(post, author, like_count=10, liked_by_me=True, saved_by_me=False)
        assert result.content == "Test content"
        assert result.author.username == "alice"
        assert result.like_count == 10
        assert result.liked_by_me is True

    def test_without_author(self):
        post = self._make_post()
        result = _build_response(post, None)
        assert result.author.username == "[deleted]"
        assert result.author.full_name == "Deleted User"

    def test_defaults(self):
        post = self._make_post()
        author = self._make_author()
        result = _build_response(post, author)
        assert result.like_count == 0
        assert result.comment_count == 0
        assert result.repost_count == 0
        assert result.liked_by_me is False
        assert result.saved_by_me is False
        assert result.reposted_by_me is False
        assert result.feed_label is None
        assert result.recommendation_score is None

    def test_with_all_flags(self):
        post = self._make_post()
        author = self._make_author()
        result = _build_response(
            post, author,
            like_count=5, comment_count=3, repost_count=2,
            liked_by_me=True, saved_by_me=True, reposted_by_me=True,
            feed_label="Trending", recommendation_score=0.95,
        )
        assert result.liked_by_me is True
        assert result.saved_by_me is True
        assert result.reposted_by_me is True
        assert result.feed_label == "Trending"
        assert result.recommendation_score == 0.95


class TestConstants:
    def test_shorts_limit(self):
        assert SHORTS_DAILY_LIMIT == 10
