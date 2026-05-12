from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories.comment_repository import CommentRepository
from app.repositories.community_repository import CommunityRepository
from app.repositories.post_like_repository import PostLikeRepository
from app.repositories.post_repository import PostRepository
from app.repositories.saved_post_repository import SavedPostRepository
from app.repositories.user_repository import UserRepository
from app.schemas.community import ExploreCommunityResponse
from app.schemas.explore import ExploreResponse
from app.schemas.user import UserSearchResponse
from app.services.post_service import _build_response


async def get_explore(
    db: AsyncSession,
    current_user: User | None = None,
) -> ExploreResponse:
    """Build the combined explore page data.

    - trending_posts: top 10 posts globally ranked by engagement
    - suggested_communities: top 6 trending public communities
    - suggested_users: up to 6 random users the caller is not following
    """
    # ── Trending posts ───────────────────────────────────────
    post_repo = PostRepository(db)
    posts = await post_repo.list_trending(limit=10)

    trending_posts = []
    if posts:
        user_repo = UserRepository(db)
        author_ids = {p.author_id for p in posts}
        authors: dict[UUID, User] = {}
        for aid in author_ids:
            user = await user_repo.get_by_id(aid)
            if user:
                authors[aid] = user

        post_ids = [p.id for p in posts]
        like_repo = PostLikeRepository(db)
        like_counts = await like_repo.count_by_posts(post_ids)
        comment_repo = CommentRepository(db)
        comment_counts = await comment_repo.count_by_posts(post_ids)

        liked_set: set[UUID] = set()
        saved_set: set[UUID] = set()
        if current_user:
            liked_set = await like_repo.liked_by_user(post_ids, current_user.id)
            save_repo = SavedPostRepository(db)
            saved_set = await save_repo.saved_by_user(post_ids, current_user.id)

        trending_posts = [
            _build_response(
                p,
                authors.get(p.author_id),
                like_count=like_counts.get(p.id, 0),
                comment_count=comment_counts.get(p.id, 0),
                liked_by_me=p.id in liked_set,
                saved_by_me=p.id in saved_set,
            )
            for p in posts
        ]

    # ── Suggested communities ────────────────────────────────
    community_repo = CommunityRepository(db)
    communities = await community_repo.list_trending(limit=6)

    joined_ids: set[UUID] = set()
    if current_user:
        joined_ids = set(await community_repo.get_joined_ids(current_user.id))

    community_ids = [c.id for c in communities]
    member_counts = await community_repo.member_counts_batch(community_ids)

    suggested_communities = [
        ExploreCommunityResponse(
            id=c.id,
            name=c.name,
            description=c.description,
            member_count=member_counts.get(c.id, 0),
            is_member=(c.id in joined_ids) if current_user else None,
        )
        for c in communities
    ]

    # ── Suggested users ──────────────────────────────────────
    suggested_users: list[UserSearchResponse] = []
    if current_user:
        user_repo = UserRepository(db)
        users = await user_repo.list_suggested(current_user.id, limit=6)
        suggested_users = [
            UserSearchResponse.model_validate(u) for u in users
        ]

    return ExploreResponse(
        trending_posts=trending_posts,
        suggested_communities=suggested_communities,
        suggested_users=suggested_users,
    )
