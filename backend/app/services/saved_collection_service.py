import math
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequest, Forbidden, NotFound
from app.models.saved_collection import SavedCollection
from app.models.user import User
from app.repositories.comment_repository import CommentRepository
from app.repositories.post_like_repository import PostLikeRepository
from app.repositories.post_repository import PostRepository
from app.repositories.saved_collection_repository import SavedCollectionRepository
from app.repositories.saved_post_repository import SavedPostRepository
from app.repositories.user_repository import UserRepository
from app.schemas.common import PaginatedResponse
from app.schemas.post import PostResponse
from app.schemas.saved_collection import SavedCollectionResponse
from app.services.post_service import _build_response


MAX_COLLECTIONS_PER_USER = 50


async def list_collections(
    db: AsyncSession,
    current_user: User,
) -> list[SavedCollectionResponse]:
    """Return all collections for the current user, with post counts."""
    repo = SavedCollectionRepository(db)
    collections = await repo.list_by_user(current_user.id)

    if not collections:
        return []

    # Batch-load item counts
    coll_ids = [c.id for c in collections]
    counts = await repo.count_items_batch(coll_ids)

    return [
        SavedCollectionResponse(
            id=c.id,
            name=c.name,
            post_count=counts.get(c.id, 0),
            created_at=c.created_at,
        )
        for c in collections
    ]


async def create_collection(
    db: AsyncSession,
    current_user: User,
    name: str,
) -> SavedCollectionResponse:
    """Create a new saved collection."""
    repo = SavedCollectionRepository(db)

    # Enforce cap
    existing = await repo.list_by_user(current_user.id)
    if len(existing) >= MAX_COLLECTIONS_PER_USER:
        raise BadRequest(
            f"You can have up to {MAX_COLLECTIONS_PER_USER} collections"
        )

    collection = SavedCollection(
        user_id=current_user.id,
        name=name.strip(),
    )
    collection = await repo.create(collection)

    return SavedCollectionResponse(
        id=collection.id,
        name=collection.name,
        post_count=0,
        created_at=collection.created_at,
    )


async def get_collection_posts(
    db: AsyncSession,
    collection_id: UUID,
    current_user: User,
    *,
    page: int = 1,
    page_size: int = 20,
) -> PaginatedResponse[PostResponse]:
    """Return posts in a collection, newest-added first."""
    repo = SavedCollectionRepository(db)
    collection = await repo.get_by_id(collection_id)
    if not collection:
        raise NotFound("Collection")
    if collection.user_id != current_user.id:
        raise Forbidden("This collection does not belong to you")

    skip = (page - 1) * page_size
    total = await repo.count_items(collection_id)
    posts = await repo.list_posts(collection_id, skip=skip, limit=page_size)

    if not posts:
        return PaginatedResponse(
            items=[], total=total, page=page, page_size=page_size,
            total_pages=math.ceil(total / page_size) if total else 0,
        )

    # Batch-load authors
    user_repo = UserRepository(db)
    author_ids = {p.author_id for p in posts}
    authors: dict[UUID, User] = {}
    for aid in author_ids:
        user = await user_repo.get_by_id(aid)
        if user:
            authors[aid] = user

    # Batch-load like/comment/repost/save data
    post_ids = [p.id for p in posts]
    like_repo = PostLikeRepository(db)
    like_counts = await like_repo.count_by_posts(post_ids)
    comment_repo = CommentRepository(db)
    comment_counts = await comment_repo.count_by_posts(post_ids)
    from app.repositories.repost_repository import RepostRepository
    repost_repo = RepostRepository(db)
    repost_counts = await repost_repo.count_by_posts(post_ids)
    liked_set = await like_repo.liked_by_user(post_ids, current_user.id)
    save_repo = SavedPostRepository(db)
    saved_set = await save_repo.saved_by_user(post_ids, current_user.id)
    reposted_set = await repost_repo.reposted_by_user(post_ids, current_user.id)

    items = [
        _build_response(
            p, authors.get(p.author_id),
            like_count=like_counts.get(p.id, 0),
            comment_count=comment_counts.get(p.id, 0),
            repost_count=repost_counts.get(p.id, 0),
            liked_by_me=p.id in liked_set,
            saved_by_me=p.id in saved_set,
            reposted_by_me=p.id in reposted_set,
        )
        for p in posts
    ]

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total else 0,
    )


async def add_post_to_collection(
    db: AsyncSession,
    collection_id: UUID,
    post_id: UUID,
    current_user: User,
) -> dict:
    """Add a post to a collection. Idempotent."""
    repo = SavedCollectionRepository(db)
    collection = await repo.get_by_id(collection_id)
    if not collection:
        raise NotFound("Collection")
    if collection.user_id != current_user.id:
        raise Forbidden("This collection does not belong to you")

    # Verify post exists
    post_repo = PostRepository(db)
    post = await post_repo.get_by_id(post_id)
    if not post:
        raise NotFound("Post")

    if not await repo.item_exists(collection_id, post_id):
        await repo.add_post(collection_id, post_id)

    return {"added": True}


async def remove_post_from_collection(
    db: AsyncSession,
    collection_id: UUID,
    post_id: UUID,
    current_user: User,
) -> dict:
    """Remove a post from a collection. Idempotent."""
    repo = SavedCollectionRepository(db)
    collection = await repo.get_by_id(collection_id)
    if not collection:
        raise NotFound("Collection")
    if collection.user_id != current_user.id:
        raise Forbidden("This collection does not belong to you")

    await repo.remove_post(collection_id, post_id)

    return {"removed": True}
