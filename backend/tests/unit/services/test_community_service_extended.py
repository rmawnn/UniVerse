"""Extended tests for community_service — guard clauses, list operations, and happy paths."""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.core.exceptions import AlreadyExists, BadRequest, Forbidden, NotFound
from app.services.community_service import (
    create_community,
    delete_community,
    explore_communities,
    get_community,
    join_community,
    leave_community,
    list_communities,
    search_communities,
    update_community,
)


def _make_community(**kwargs):
    c = MagicMock()
    c.id = kwargs.get("id", uuid4())
    c.name = kwargs.get("name", "Test Community")
    c.description = kwargs.get("description", "A test community")
    c.university_id = kwargs.get("university_id", uuid4())
    c.created_by = kwargs.get("created_by", uuid4())
    c.is_public = kwargs.get("is_public", True)
    c.created_at = kwargs.get("created_at", datetime(2024, 6, 1, tzinfo=timezone.utc))
    c.updated_at = kwargs.get("updated_at", datetime(2024, 6, 1, tzinfo=timezone.utc))
    return c


class TestGetCommunity:
    @pytest.mark.asyncio
    async def test_not_found(self, mock_db):
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=None)

        with patch("app.services.community_service.CommunityRepository", return_value=mock_repo):
            with pytest.raises(NotFound, match="Community"):
                await get_community(mock_db, uuid4())


class TestDeleteCommunity:
    @pytest.mark.asyncio
    async def test_not_found(self, mock_db, sample_user):
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=None)

        with patch("app.services.community_service.CommunityRepository", return_value=mock_repo):
            with pytest.raises(NotFound, match="Community"):
                await delete_community(mock_db, uuid4(), sample_user)

    @pytest.mark.asyncio
    async def test_not_creator(self, mock_db, sample_user):
        community = MagicMock()
        community.created_by = uuid4()

        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=community)

        with patch("app.services.community_service.CommunityRepository", return_value=mock_repo):
            with pytest.raises(Forbidden, match="creator"):
                await delete_community(mock_db, uuid4(), sample_user)


class TestJoinCommunity:
    @pytest.mark.asyncio
    async def test_deactivated_user(self, mock_db, sample_user):
        sample_user.is_active = False

        with pytest.raises(BadRequest, match="deactivated"):
            await join_community(mock_db, uuid4(), sample_user)

    @pytest.mark.asyncio
    async def test_community_not_found(self, mock_db, sample_user):
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=None)

        with patch("app.services.community_service.CommunityRepository", return_value=mock_repo):
            with pytest.raises(NotFound, match="Community"):
                await join_community(mock_db, uuid4(), sample_user)

    @pytest.mark.asyncio
    async def test_private_community(self, mock_db, sample_user):
        community = MagicMock()
        community.is_public = False

        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=community)

        with patch("app.services.community_service.CommunityRepository", return_value=mock_repo):
            with pytest.raises(BadRequest, match="not open"):
                await join_community(mock_db, uuid4(), sample_user)


class TestLeaveCommunity:
    @pytest.mark.asyncio
    async def test_not_found(self, mock_db, sample_user):
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=None)

        with patch("app.services.community_service.CommunityRepository", return_value=mock_repo):
            with pytest.raises(NotFound, match="Community"):
                await leave_community(mock_db, uuid4(), sample_user)

    @pytest.mark.asyncio
    async def test_not_member(self, mock_db, sample_user):
        community = MagicMock()
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=community)
        mock_repo.get_member = AsyncMock(return_value=None)

        with patch("app.services.community_service.CommunityRepository", return_value=mock_repo):
            with pytest.raises(BadRequest, match="not a member"):
                await leave_community(mock_db, uuid4(), sample_user)


class TestSearchCommunities:
    @pytest.mark.asyncio
    async def test_short_query(self, mock_db):
        with pytest.raises(BadRequest, match="at least 2"):
            await search_communities(mock_db, "x")

    @pytest.mark.asyncio
    async def test_empty_results(self, mock_db):
        mock_repo = MagicMock()
        mock_repo.count_search = AsyncMock(return_value=0)
        mock_repo.search = AsyncMock(return_value=[])

        with patch("app.services.community_service.CommunityRepository", return_value=mock_repo):
            result = await search_communities(mock_db, "nonexistent")
            assert result.total == 0
            assert result.items == []


class TestExploreCommunities:
    @pytest.mark.asyncio
    async def test_empty(self, mock_db):
        mock_repo = MagicMock()
        mock_repo.count_public = AsyncMock(return_value=0)
        mock_repo.list_trending = AsyncMock(return_value=[])

        with patch("app.services.community_service.CommunityRepository", return_value=mock_repo):
            result = await explore_communities(mock_db)
            assert result.total == 0
            assert result.items == []


class TestListCommunities:
    @pytest.mark.asyncio
    async def test_empty(self, mock_db):
        mock_repo = MagicMock()
        mock_repo.count_by_university = AsyncMock(return_value=0)
        mock_repo.list_by_university = AsyncMock(return_value=[])

        with patch("app.services.community_service.CommunityRepository", return_value=mock_repo):
            result = await list_communities(mock_db, uuid4())
            assert result.total == 0
            assert result.items == []

    @pytest.mark.asyncio
    async def test_with_results(self, mock_db):
        comm = _make_community(name="Active Community")
        mock_repo = MagicMock()
        mock_repo.count_by_university = AsyncMock(return_value=1)
        mock_repo.list_by_university = AsyncMock(return_value=[comm])
        mock_repo.member_count = AsyncMock(return_value=10)

        with patch("app.services.community_service.CommunityRepository", return_value=mock_repo):
            result = await list_communities(mock_db, uuid4())
            assert result.total == 1
            assert len(result.items) == 1
            assert result.items[0].name == "Active Community"


class TestCreateCommunityHappyPath:
    @pytest.mark.asyncio
    async def test_success(self, mock_db, sample_user):
        sample_user.university_id = uuid4()

        created_community = _make_community(
            created_by=sample_user.id,
            university_id=sample_user.university_id,
        )

        data = MagicMock()
        data.name = "My Community"
        data.description = "Description"
        data.is_public = True

        mock_repo = MagicMock()
        mock_repo.create = AsyncMock(return_value=created_community)
        mock_repo.add_member = AsyncMock()

        with patch("app.services.community_service.CommunityRepository", return_value=mock_repo):
            result = await create_community(mock_db, sample_user, data)
            assert result.is_member is True
            assert result.my_role == "admin"
            mock_repo.add_member.assert_called_once()


class TestUpdateCommunityHappyPath:
    @pytest.mark.asyncio
    async def test_success(self, mock_db, sample_user):
        community = _make_community(created_by=sample_user.id)

        data = MagicMock()
        data.model_dump.return_value = {"description": "Updated"}

        updated = _make_community(
            id=community.id, created_by=sample_user.id,
            description="Updated",
        )

        member = MagicMock()
        member.role = "admin"

        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=community)
        mock_repo.update = AsyncMock(return_value=updated)
        mock_repo.member_count = AsyncMock(return_value=5)
        mock_repo.get_member = AsyncMock(return_value=member)

        with patch("app.services.community_service.CommunityRepository", return_value=mock_repo):
            result = await update_community(mock_db, community.id, sample_user, data)
            assert result.description == "Updated"
            assert result.member_count == 5
            assert result.my_role == "admin"


class TestDeleteCommunitySuccess:
    @pytest.mark.asyncio
    async def test_success(self, mock_db, sample_user):
        community = MagicMock()
        community.created_by = sample_user.id

        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=community)
        mock_repo.soft_delete = AsyncMock()

        with patch("app.services.community_service.CommunityRepository", return_value=mock_repo):
            await delete_community(mock_db, uuid4(), sample_user)
            mock_repo.soft_delete.assert_called_once()


class TestGetCommunityWithUser:
    @pytest.mark.asyncio
    async def test_with_member(self, mock_db, sample_user):
        community = _make_community()

        member = MagicMock()
        member.role = "member"

        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=community)
        mock_repo.member_count = AsyncMock(return_value=15)
        mock_repo.get_member = AsyncMock(return_value=member)

        with patch("app.services.community_service.CommunityRepository", return_value=mock_repo):
            result = await get_community(mock_db, community.id, current_user=sample_user)
            assert result.is_member is True
            assert result.my_role == "member"
            assert result.member_count == 15

    @pytest.mark.asyncio
    async def test_without_user(self, mock_db):
        community = _make_community()

        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=community)
        mock_repo.member_count = AsyncMock(return_value=10)

        with patch("app.services.community_service.CommunityRepository", return_value=mock_repo):
            result = await get_community(mock_db, community.id, current_user=None)
            assert result.is_member is False
            assert result.my_role is None
