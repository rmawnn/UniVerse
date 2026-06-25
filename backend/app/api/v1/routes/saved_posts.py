from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.post import PostResponse
from app.schemas.saved_collection import (
    CreateCollectionRequest,
    RenameCollectionRequest,
    SavedCollectionResponse,
)
from app.services import saved_post_service
from app.services import saved_collection_service

router = APIRouter()


# ── Saved posts (flat list) ──────────────────────────────────

@router.post("/posts/{post_id}/save", status_code=201)
async def save_post(
    post_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Save/bookmark a post."""
    return await saved_post_service.save_post(db, post_id, current_user)


@router.delete("/posts/{post_id}/save")
async def unsave_post(
    post_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a saved/bookmarked post."""
    return await saved_post_service.unsave_post(db, post_id, current_user)


@router.get("/users/me/saved-posts", response_model=PaginatedResponse[PostResponse])
async def list_saved_posts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List the current user's saved posts, newest-saved first."""
    return await saved_post_service.list_saved_posts(
        db, current_user, page=page, page_size=page_size,
    )


# ── Saved collections ───────────────────────────────────────

@router.get(
    "/users/me/saved-collections",
    response_model=list[SavedCollectionResponse],
)
async def list_collections(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all saved-post collections for the current user."""
    return await saved_collection_service.list_collections(db, current_user)


@router.post(
    "/users/me/saved-collections",
    response_model=SavedCollectionResponse,
    status_code=201,
)
async def create_collection(
    body: CreateCollectionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new saved-post collection."""
    return await saved_collection_service.create_collection(
        db, current_user, body.name,
    )


@router.delete("/users/me/saved-collections/{collection_id}")
async def delete_collection(
    collection_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a collection and all its items."""
    return await saved_collection_service.delete_collection(
        db, collection_id, current_user,
    )


@router.patch(
    "/users/me/saved-collections/{collection_id}",
    response_model=SavedCollectionResponse,
)
async def rename_collection(
    collection_id: UUID,
    body: RenameCollectionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Rename a collection."""
    return await saved_collection_service.rename_collection(
        db, collection_id, current_user, body.name,
    )


@router.get(
    "/users/me/saved-collections/{collection_id}",
    response_model=PaginatedResponse[PostResponse],
)
async def get_collection_posts(
    collection_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List posts inside a collection, newest-added first."""
    return await saved_collection_service.get_collection_posts(
        db, collection_id, current_user, page=page, page_size=page_size,
    )


@router.post(
    "/users/me/saved-collections/{collection_id}/posts/{post_id}",
    status_code=201,
)
async def add_post_to_collection(
    collection_id: UUID,
    post_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a post to a collection."""
    return await saved_collection_service.add_post_to_collection(
        db, collection_id, post_id, current_user,
    )


@router.delete(
    "/users/me/saved-collections/{collection_id}/posts/{post_id}",
)
async def remove_post_from_collection(
    collection_id: UUID,
    post_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a post from a collection."""
    return await saved_collection_service.remove_post_from_collection(
        db, collection_id, post_id, current_user,
    )
