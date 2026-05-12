from uuid import UUID

from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.post import Post
from app.models.saved_collection import SavedCollection, SavedCollectionItem


class SavedCollectionRepository:
    """Database access for SavedCollection and SavedCollectionItem."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Collections ──────────────────────────────────────────

    async def create(self, collection: SavedCollection) -> SavedCollection:
        self.db.add(collection)
        await self.db.flush()
        await self.db.refresh(collection)
        return collection

    async def get_by_id(self, collection_id: UUID) -> SavedCollection | None:
        return await self.db.get(SavedCollection, collection_id)

    async def list_by_user(self, user_id: UUID) -> list[SavedCollection]:
        """Return all collections for a user, newest first."""
        stmt = (
            select(SavedCollection)
            .where(SavedCollection.user_id == user_id)
            .order_by(SavedCollection.created_at.desc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def count_items(self, collection_id: UUID) -> int:
        """Count non-deleted posts in a collection."""
        stmt = (
            select(func.count())
            .select_from(SavedCollectionItem)
            .join(Post, Post.id == SavedCollectionItem.post_id)
            .where(
                SavedCollectionItem.collection_id == collection_id,
                Post.is_deleted == False,  # noqa: E712
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def count_items_batch(
        self, collection_ids: list[UUID],
    ) -> dict[UUID, int]:
        """Count non-deleted posts for multiple collections in one query."""
        if not collection_ids:
            return {}
        stmt = (
            select(
                SavedCollectionItem.collection_id,
                func.count().label("cnt"),
            )
            .join(Post, Post.id == SavedCollectionItem.post_id)
            .where(
                SavedCollectionItem.collection_id.in_(collection_ids),
                Post.is_deleted == False,  # noqa: E712
            )
            .group_by(SavedCollectionItem.collection_id)
        )
        result = await self.db.execute(stmt)
        return {row[0]: row[1] for row in result.all()}

    # ── Collection items ─────────────────────────────────────

    async def add_post(self, collection_id: UUID, post_id: UUID) -> SavedCollectionItem:
        item = SavedCollectionItem(
            collection_id=collection_id,
            post_id=post_id,
        )
        self.db.add(item)
        await self.db.flush()
        return item

    async def remove_post(self, collection_id: UUID, post_id: UUID) -> bool:
        """Remove a post from a collection. Returns True if a row was deleted."""
        stmt = (
            delete(SavedCollectionItem)
            .where(
                SavedCollectionItem.collection_id == collection_id,
                SavedCollectionItem.post_id == post_id,
            )
        )
        result = await self.db.execute(stmt)
        await self.db.flush()
        return result.rowcount > 0

    async def item_exists(self, collection_id: UUID, post_id: UUID) -> bool:
        stmt = (
            select(func.count())
            .select_from(SavedCollectionItem)
            .where(
                SavedCollectionItem.collection_id == collection_id,
                SavedCollectionItem.post_id == post_id,
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one() > 0

    async def list_posts(
        self, collection_id: UUID, *, skip: int = 0, limit: int = 20,
    ) -> list[Post]:
        """Return non-deleted posts in a collection, newest-added first."""
        stmt = (
            select(Post)
            .join(SavedCollectionItem, SavedCollectionItem.post_id == Post.id)
            .where(
                SavedCollectionItem.collection_id == collection_id,
                Post.is_deleted == False,  # noqa: E712
            )
            .order_by(SavedCollectionItem.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
