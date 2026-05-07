from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequest, Forbidden, NotFound
from app.models.user import User
from app.repositories.community_repository import CommunityRepository
from app.repositories.post_like_repository import PostLikeRepository
from app.repositories.post_repository import PostRepository
from app.schemas.post_like import PostLikeToggleResponse
from app.services import notification_service


async def toggle_like(
    db: AsyncSession,
    post_id: UUID,
    current_user: User,
) -> PostLikeToggleResponse:
    """
    Toggle a like on a post:
      - If the user hasn't liked it → create like
      - If the user already liked it → remove like

    Rules:
      - Post must exist and not be deleted
      - User must be a member of the post's community
    """
    if not current_user.is_active:
        raise BadRequest("Account is deactivated")

    post_repo = PostRepository(db)
    post = await post_repo.get_by_id(post_id)
    if not post:
        raise NotFound("Post")

    community_repo = CommunityRepository(db)
    if not await community_repo.is_member(post.community_id, current_user.id):
        raise Forbidden("You must be a member of the community to like posts")

    like_repo = PostLikeRepository(db)
    existing = await like_repo.get_like(post_id, current_user.id)

    if existing:
        await like_repo.delete_like(post_id, current_user.id)
        liked = False
    else:
        await like_repo.create_like(post_id, current_user.id)
        liked = True

        # Notify post author (don't notify yourself)
        if post.author_id != current_user.id:
            await notification_service.notify(
                db,
                user_id=post.author_id,
                actor_id=current_user.id,
                type="like",
                reference_id=post_id,
                content=f"{current_user.username} liked your post",
            )

    count = await like_repo.count_by_post(post_id)

    return PostLikeToggleResponse(liked=liked, like_count=count)
