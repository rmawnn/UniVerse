"""Unit tests for app.services.community_service — with mocked repositories."""

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.core.exceptions import AlreadyExists, BadRequest, Forbidden, NotFound
from app.services import community_service


class TestCommunityToDict:
    def test_converts_community(self):
        community = MagicMock()
        community.id = uuid4()
        community.name = "Test Community"
        community.description = "A test"
        community.university_id = uuid4()
        community.created_by = uuid4()
        community.is_public = True
        community.created_at = "2024-01-01"
        community.updated_at = "2024-06-01"

        result = community_service._community_to_dict(community)
        assert result["name"] == "Test Community"
        assert result["description"] == "A test"
        assert result["is_public"] is True
        assert "id" in result


class TestCreateCommunity:
    @pytest.mark.asyncio
    async def test_no_university_raises(self, mock_db, sample_user):
        sample_user.university_id = None
        req = MagicMock()
        with pytest.raises(BadRequest, match="university"):
            await community_service.create_community(mock_db, sample_user, req)


class TestUpdateCommunity:
    @pytest.mark.asyncio
    async def test_not_found(self, mock_db, sample_user):
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=None)

        with patch("app.services.community_service.CommunityRepository", return_value=mock_repo):
            with pytest.raises(NotFound, match="Community"):
                await community_service.update_community(mock_db, uuid4(), sample_user, MagicMock())

    @pytest.mark.asyncio
    async def test_not_creator_forbidden(self, mock_db, sample_user):
        community = MagicMock()
        community.created_by = uuid4()  # different user
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=community)

        with patch("app.services.community_service.CommunityRepository", return_value=mock_repo):
            with pytest.raises(Forbidden, match="creator"):
                await community_service.update_community(mock_db, uuid4(), sample_user, MagicMock())

    @pytest.mark.asyncio
    async def test_empty_update_raises(self, mock_db, sample_user):
        community = MagicMock()
        community.created_by = sample_user.id
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=community)

        req = MagicMock()
        req.model_dump.return_value = {}

        with patch("app.services.community_service.CommunityRepository", return_value=mock_repo):
            with pytest.raises(BadRequest, match="No fields"):
                await community_service.update_community(mock_db, uuid4(), sample_user, req)


class TestDeleteCommunity:
    @pytest.mark.asyncio
    async def test_not_found(self, mock_db, sample_user):
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=None)

        with patch("app.services.community_service.CommunityRepository", return_value=mock_repo):
            with pytest.raises(NotFound, match="Community"):
                await community_service.delete_community(mock_db, uuid4(), sample_user)

    @pytest.mark.asyncio
    async def test_not_creator_forbidden(self, mock_db, sample_user):
        community = MagicMock()
        community.created_by = uuid4()
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=community)

        with patch("app.services.community_service.CommunityRepository", return_value=mock_repo):
            with pytest.raises(Forbidden, match="creator"):
                await community_service.delete_community(mock_db, uuid4(), sample_user)


class TestGetCommunity:
    @pytest.mark.asyncio
    async def test_not_found(self, mock_db):
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=None)

        with patch("app.services.community_service.CommunityRepository", return_value=mock_repo):
            with pytest.raises(NotFound, match="Community"):
                await community_service.get_community(mock_db, uuid4())


class TestJoinCommunity:
    @pytest.mark.asyncio
    async def test_deactivated_account(self, mock_db, sample_user):
        sample_user.is_active = False
        with pytest.raises(BadRequest, match="deactivated"):
            await community_service.join_community(mock_db, uuid4(), sample_user)

    @pytest.mark.asyncio
    async def test_community_not_found(self, mock_db, sample_user):
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=None)

        with patch("app.services.community_service.CommunityRepository", return_value=mock_repo):
            with pytest.raises(NotFound, match="Community"):
                await community_service.join_community(mock_db, uuid4(), sample_user)

    @pytest.mark.asyncio
    async def test_private_community_blocked(self, mock_db, sample_user):
        community = MagicMock()
        community.is_public = False
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=community)

        with patch("app.services.community_service.CommunityRepository", return_value=mock_repo):
            with pytest.raises(BadRequest, match="not open"):
                await community_service.join_community(mock_db, uuid4(), sample_user)

    @pytest.mark.asyncio
    async def test_already_member(self, mock_db, sample_user):
        community = MagicMock()
        community.is_public = True
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=community)
        mock_repo.is_member = AsyncMock(return_value=True)

        with patch("app.services.community_service.CommunityRepository", return_value=mock_repo):
            with pytest.raises(AlreadyExists, match="already a member"):
                await community_service.join_community(mock_db, uuid4(), sample_user)


class TestLeaveCommunity:
    @pytest.mark.asyncio
    async def test_not_found(self, mock_db, sample_user):
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=None)

        with patch("app.services.community_service.CommunityRepository", return_value=mock_repo):
            with pytest.raises(NotFound, match="Community"):
                await community_service.leave_community(mock_db, uuid4(), sample_user)

    @pytest.mark.asyncio
    async def test_not_member(self, mock_db, sample_user):
        community = MagicMock()
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=community)
        mock_repo.get_member = AsyncMock(return_value=None)

        with patch("app.services.community_service.CommunityRepository", return_value=mock_repo):
            with pytest.raises(BadRequest, match="not a member"):
                await community_service.leave_community(mock_db, uuid4(), sample_user)

    @pytest.mark.asyncio
    async def test_sole_admin_blocked(self, mock_db, sample_user):
        community = MagicMock()
        member = MagicMock()
        member.role = "admin"
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=community)
        mock_repo.get_member = AsyncMock(return_value=member)
        mock_repo.count_admins = AsyncMock(return_value=1)

        with patch("app.services.community_service.CommunityRepository", return_value=mock_repo):
            with pytest.raises(BadRequest, match="only admin"):
                await community_service.leave_community(mock_db, uuid4(), sample_user)


class TestSearchCommunities:
    @pytest.mark.asyncio
    async def test_short_query_raises(self, mock_db):
        with pytest.raises(BadRequest, match="at least 2"):
            await community_service.search_communities(mock_db, "a")
