"""Unit tests for saved_collection_service — guard clauses and operations."""

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.core.exceptions import BadRequest, Forbidden, NotFound
from app.services.saved_collection_service import (
    MAX_COLLECTIONS_PER_USER,
    add_post_to_collection,
    create_collection,
    get_collection_posts,
    list_collections,
    remove_post_from_collection,
)


class TestListCollections:
    @pytest.mark.asyncio
    async def test_empty(self, mock_db, sample_user):
        mock_repo = MagicMock()
        mock_repo.list_by_user = AsyncMock(return_value=[])

        with patch("app.services.saved_collection_service.SavedCollectionRepository", return_value=mock_repo):
            result = await list_collections(mock_db, sample_user)
            assert result == []

    @pytest.mark.asyncio
    async def test_with_collections(self, mock_db, sample_user):
        coll = MagicMock()
        coll.id = uuid4()
        coll.name = "My Collection"
        coll.created_at = MagicMock()

        mock_repo = MagicMock()
        mock_repo.list_by_user = AsyncMock(return_value=[coll])
        mock_repo.count_items_batch = AsyncMock(return_value={coll.id: 3})

        with patch("app.services.saved_collection_service.SavedCollectionRepository", return_value=mock_repo):
            result = await list_collections(mock_db, sample_user)
            assert len(result) == 1
            assert result[0].name == "My Collection"


class TestCreateCollection:
    @pytest.mark.asyncio
    async def test_cap_exceeded(self, mock_db, sample_user):
        existing = [MagicMock() for _ in range(MAX_COLLECTIONS_PER_USER)]
        mock_repo = MagicMock()
        mock_repo.list_by_user = AsyncMock(return_value=existing)

        with patch("app.services.saved_collection_service.SavedCollectionRepository", return_value=mock_repo):
            with pytest.raises(BadRequest, match="up to"):
                await create_collection(mock_db, sample_user, "New Collection")

    @pytest.mark.asyncio
    async def test_success(self, mock_db, sample_user):
        mock_repo = MagicMock()
        mock_repo.list_by_user = AsyncMock(return_value=[])

        created = MagicMock()
        created.id = uuid4()
        created.name = "My Collection"
        created.created_at = MagicMock()
        mock_repo.create = AsyncMock(return_value=created)

        with patch("app.services.saved_collection_service.SavedCollectionRepository", return_value=mock_repo):
            result = await create_collection(mock_db, sample_user, "My Collection")
            assert result.name == "My Collection"
            assert result.post_count == 0


class TestGetCollectionPosts:
    @pytest.mark.asyncio
    async def test_not_found(self, mock_db, sample_user):
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=None)

        with patch("app.services.saved_collection_service.SavedCollectionRepository", return_value=mock_repo):
            with pytest.raises(NotFound, match="Collection"):
                await get_collection_posts(mock_db, uuid4(), sample_user)

    @pytest.mark.asyncio
    async def test_not_owner(self, mock_db, sample_user):
        coll = MagicMock()
        coll.user_id = uuid4()
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=coll)

        with patch("app.services.saved_collection_service.SavedCollectionRepository", return_value=mock_repo):
            with pytest.raises(Forbidden, match="does not belong"):
                await get_collection_posts(mock_db, uuid4(), sample_user)

    @pytest.mark.asyncio
    async def test_empty(self, mock_db, sample_user):
        coll = MagicMock()
        coll.user_id = sample_user.id
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=coll)
        mock_repo.count_items = AsyncMock(return_value=0)
        mock_repo.list_posts = AsyncMock(return_value=[])

        with patch("app.services.saved_collection_service.SavedCollectionRepository", return_value=mock_repo):
            result = await get_collection_posts(mock_db, uuid4(), sample_user)
            assert result.total == 0


class TestAddPostToCollection:
    @pytest.mark.asyncio
    async def test_collection_not_found(self, mock_db, sample_user):
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=None)

        with patch("app.services.saved_collection_service.SavedCollectionRepository", return_value=mock_repo):
            with pytest.raises(NotFound, match="Collection"):
                await add_post_to_collection(mock_db, uuid4(), uuid4(), sample_user)

    @pytest.mark.asyncio
    async def test_not_owner(self, mock_db, sample_user):
        coll = MagicMock()
        coll.user_id = uuid4()
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=coll)

        with patch("app.services.saved_collection_service.SavedCollectionRepository", return_value=mock_repo):
            with pytest.raises(Forbidden, match="does not belong"):
                await add_post_to_collection(mock_db, uuid4(), uuid4(), sample_user)

    @pytest.mark.asyncio
    async def test_post_not_found(self, mock_db, sample_user):
        coll = MagicMock()
        coll.user_id = sample_user.id
        mock_coll_repo = MagicMock()
        mock_coll_repo.get_by_id = AsyncMock(return_value=coll)

        mock_post_repo = MagicMock()
        mock_post_repo.get_by_id = AsyncMock(return_value=None)

        with (
            patch("app.services.saved_collection_service.SavedCollectionRepository", return_value=mock_coll_repo),
            patch("app.services.saved_collection_service.PostRepository", return_value=mock_post_repo),
        ):
            with pytest.raises(NotFound, match="Post"):
                await add_post_to_collection(mock_db, uuid4(), uuid4(), sample_user)

    @pytest.mark.asyncio
    async def test_success(self, mock_db, sample_user):
        coll = MagicMock()
        coll.user_id = sample_user.id
        mock_coll_repo = MagicMock()
        mock_coll_repo.get_by_id = AsyncMock(return_value=coll)
        mock_coll_repo.item_exists = AsyncMock(return_value=False)
        mock_coll_repo.add_post = AsyncMock()

        mock_post_repo = MagicMock()
        mock_post_repo.get_by_id = AsyncMock(return_value=MagicMock())

        with (
            patch("app.services.saved_collection_service.SavedCollectionRepository", return_value=mock_coll_repo),
            patch("app.services.saved_collection_service.PostRepository", return_value=mock_post_repo),
        ):
            result = await add_post_to_collection(mock_db, uuid4(), uuid4(), sample_user)
            assert result["added"] is True


class TestRemovePostFromCollection:
    @pytest.mark.asyncio
    async def test_not_found(self, mock_db, sample_user):
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=None)

        with patch("app.services.saved_collection_service.SavedCollectionRepository", return_value=mock_repo):
            with pytest.raises(NotFound, match="Collection"):
                await remove_post_from_collection(mock_db, uuid4(), uuid4(), sample_user)

    @pytest.mark.asyncio
    async def test_not_owner(self, mock_db, sample_user):
        coll = MagicMock()
        coll.user_id = uuid4()
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=coll)

        with patch("app.services.saved_collection_service.SavedCollectionRepository", return_value=mock_repo):
            with pytest.raises(Forbidden, match="does not belong"):
                await remove_post_from_collection(mock_db, uuid4(), uuid4(), sample_user)

    @pytest.mark.asyncio
    async def test_success(self, mock_db, sample_user):
        coll = MagicMock()
        coll.user_id = sample_user.id
        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=coll)
        mock_repo.remove_post = AsyncMock()

        with patch("app.services.saved_collection_service.SavedCollectionRepository", return_value=mock_repo):
            result = await remove_post_from_collection(mock_db, uuid4(), uuid4(), sample_user)
            assert result["removed"] is True
