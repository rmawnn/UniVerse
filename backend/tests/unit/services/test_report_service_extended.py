"""Extended tests for report_service — validate_target and get_target_label."""

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.core.exceptions import NotFound
from app.services.report_service import _validate_target, _get_target_label, VALID_TARGET_TYPES, VALID_STATUSES


class TestValidateTarget:
    @pytest.mark.asyncio
    async def test_post_found(self, mock_db):
        mock_db.get = AsyncMock(return_value=MagicMock())
        await _validate_target(mock_db, "post", uuid4())

    @pytest.mark.asyncio
    async def test_post_not_found(self, mock_db):
        mock_db.get = AsyncMock(return_value=None)
        with pytest.raises(NotFound):
            await _validate_target(mock_db, "post", uuid4())

    @pytest.mark.asyncio
    async def test_user_found(self, mock_db):
        mock_db.get = AsyncMock(return_value=MagicMock())
        await _validate_target(mock_db, "user", uuid4())

    @pytest.mark.asyncio
    async def test_comment_not_found(self, mock_db):
        mock_db.get = AsyncMock(return_value=None)
        with pytest.raises(NotFound):
            await _validate_target(mock_db, "comment", uuid4())


class TestGetTargetLabel:
    @pytest.mark.asyncio
    async def test_post_found(self, mock_db):
        post = MagicMock()
        post.content = "Short post"
        mock_db.get = AsyncMock(return_value=post)
        result = await _get_target_label(mock_db, "post", uuid4())
        assert result == "Short post"

    @pytest.mark.asyncio
    async def test_post_long(self, mock_db):
        post = MagicMock()
        post.content = "x" * 100
        mock_db.get = AsyncMock(return_value=post)
        result = await _get_target_label(mock_db, "post", uuid4())
        assert result.endswith("...")
        assert len(result) == 83  # 80 + "..."

    @pytest.mark.asyncio
    async def test_post_deleted(self, mock_db):
        mock_db.get = AsyncMock(return_value=None)
        result = await _get_target_label(mock_db, "post", uuid4())
        assert result == "[Deleted post]"

    @pytest.mark.asyncio
    async def test_user_found(self, mock_db):
        user = MagicMock()
        user.username = "testuser"
        mock_db.get = AsyncMock(return_value=user)
        result = await _get_target_label(mock_db, "user", uuid4())
        assert result == "@testuser"

    @pytest.mark.asyncio
    async def test_user_deleted(self, mock_db):
        mock_db.get = AsyncMock(return_value=None)
        result = await _get_target_label(mock_db, "user", uuid4())
        assert result == "[Deleted user]"

    @pytest.mark.asyncio
    async def test_community_found(self, mock_db):
        community = MagicMock()
        community.name = "Test Community"
        mock_db.get = AsyncMock(return_value=community)
        result = await _get_target_label(mock_db, "community", uuid4())
        assert result == "Test Community"

    @pytest.mark.asyncio
    async def test_job_found(self, mock_db):
        job = MagicMock()
        job.title = "Developer"
        mock_db.get = AsyncMock(return_value=job)
        result = await _get_target_label(mock_db, "job", uuid4())
        assert result == "Developer"

    @pytest.mark.asyncio
    async def test_unknown_type(self, mock_db):
        result = await _get_target_label(mock_db, "unknown", uuid4())
        assert result == "[Unknown]"


class TestConstants:
    def test_valid_target_types(self):
        assert "post" in VALID_TARGET_TYPES
        assert "comment" in VALID_TARGET_TYPES
        assert "community" in VALID_TARGET_TYPES
        assert "job" in VALID_TARGET_TYPES
        assert "user" in VALID_TARGET_TYPES

    def test_valid_statuses(self):
        assert "reviewed" in VALID_STATUSES
        assert "dismissed" in VALID_STATUSES
        assert "action_taken" in VALID_STATUSES
