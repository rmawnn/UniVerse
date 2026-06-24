import math
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequest, Forbidden, NotFound
from app.models.poll import PollOption, PollVote
from app.models.post import Post
from app.models.user import User
from app.repositories.comment_repository import CommentRepository
from app.repositories.community_repository import CommunityRepository
from app.repositories.post_like_repository import PostLikeRepository
from app.repositories.post_repository import PostRepository
from app.repositories.repost_repository import RepostRepository
from app.repositories.saved_post_repository import SavedPostRepository
from app.repositories.user_repository import UserRepository
from app.schemas.common import PaginatedResponse
from app.schemas.post import (
    PostAuthorSummary,
    PostCreateRequest,
    PostResponse,
    PollOptionResponse,
    PollResponse,
)
from app.services.categorization_service import categorize_post


SHORTS_DAILY_LIMIT = 10


async def create_post(
    db: AsyncSession,
    community_id: UUID,
    current_user: User,
    data: PostCreateRequest,
) -> PostResponse:
    if not current_user.is_active:
        raise BadRequest("Account is deactivated")

    post_repo = PostRepository(db)

    if data.post_type == "short":
        if not data.video_url:
            raise BadRequest("Short posts require a video")
        today_count = await post_repo.count_shorts_by_author_today(current_user.id)
        if today_count >= SHORTS_DAILY_LIMIT:
            raise BadRequest(
                f"You can create up to {SHORTS_DAILY_LIMIT} shorts per day. "
                f"Try again tomorrow."
            )

    if data.post_type == "poll":
        if not data.poll_options or len(data.poll_options) < 2:
            raise BadRequest("Poll posts require at least 2 options")

    community_repo = CommunityRepository(db)
    community = await community_repo.get_by_id(community_id)
    if not community:
        raise NotFound("Community")

    if not await community_repo.is_member(community_id, current_user.id):
        raise Forbidden("You must be a member of this community to post")

    post = Post(
        community_id=community_id,
        author_id=current_user.id,
        content=data.content,
        image_url=data.image_url,
        video_url=data.video_url,
        post_type=data.post_type,
    )
    post = await post_repo.create(post)

    if data.post_type == "poll" and data.poll_options:
        for i, label in enumerate(data.poll_options):
            option = PollOption(post_id=post.id, label=label, position=i)
            db.add(option)
        await db.commit()

    await categorize_post(db, post.id, data.content)
    await db.refresh(post)

    poll_data = None
    if data.post_type == "poll":
        poll_data = await _load_poll(db, post.id, current_user.id)

    return _build_response(
        post, current_user,
        like_count=0, liked_by_me=False, saved_by_me=False,
        poll=poll_data,
    )


async def get_post(
    db: AsyncSession,
    post_id: UUID,
    current_user: User | None = None,
) -> PostResponse:
    post_repo = PostRepository(db)
    post = await post_repo.get_by_id(post_id)
    if not post:
        raise NotFound("Post")

    user_repo = UserRepository(db)
    author = await user_repo.get_by_id(post.author_id)

    like_repo = PostLikeRepository(db)
    like_count = await like_repo.count_by_post(post_id)
    liked_by_me = False
    saved_by_me = False
    reposted_by_me = False
    if current_user:
        liked_by_me = await like_repo.get_like(post_id, current_user.id) is not None
        save_repo = SavedPostRepository(db)
        saved_by_me = await save_repo.exists(current_user.id, post_id)
        repost_repo = RepostRepository(db)
        reposted_by_me = await repost_repo.get(post_id, current_user.id) is not None

    comment_repo = CommentRepository(db)
    comment_count = await comment_repo.count_by_post(post_id)
    repost_repo_count = RepostRepository(db)
    repost_count = await repost_repo_count.count_by_post(post_id)

    poll_data = None
    if post.post_type == "poll":
        poll_data = await _load_poll(db, post_id, current_user.id if current_user else None)

    return _build_response(
        post, author,
        like_count=like_count, comment_count=comment_count,
        repost_count=repost_count,
        liked_by_me=liked_by_me, saved_by_me=saved_by_me,
        reposted_by_me=reposted_by_me,
        poll=poll_data,
    )


async def list_posts(
    db: AsyncSession,
    community_id: UUID,
    *,
    page: int = 1,
    page_size: int = 20,
    current_user: User | None = None,
) -> PaginatedResponse[PostResponse]:
    community_repo = CommunityRepository(db)
    if not await community_repo.get_by_id(community_id):
        raise NotFound("Community")

    post_repo = PostRepository(db)
    skip = (page - 1) * page_size
    total = await post_repo.count_by_community(community_id)
    posts = await post_repo.list_by_community(community_id, skip=skip, limit=page_size)

    if not posts:
        return PaginatedResponse(
            items=[], total=total, page=page, page_size=page_size,
            total_pages=math.ceil(total / page_size) if total else 0,
        )

    items = await _build_list_responses(db, posts, current_user)
    return PaginatedResponse(
        items=items, total=total, page=page, page_size=page_size,
        total_pages=math.ceil(total / page_size) if total else 0,
    )


async def list_user_posts(
    db: AsyncSession,
    author_id: UUID,
    *,
    page: int = 1,
    page_size: int = 20,
    post_type: str | None = None,
    current_user: User | None = None,
) -> PaginatedResponse[PostResponse]:
    post_repo = PostRepository(db)
    skip = (page - 1) * page_size
    total = await post_repo.count_by_author(author_id, post_type=post_type)
    posts = await post_repo.list_by_author(author_id, skip=skip, limit=page_size, post_type=post_type)

    if not posts:
        return PaginatedResponse(
            items=[], total=total, page=page, page_size=page_size,
            total_pages=math.ceil(total / page_size) if total else 0,
        )

    items = await _build_list_responses(db, posts, current_user)
    return PaginatedResponse(
        items=items, total=total, page=page, page_size=page_size,
        total_pages=math.ceil(total / page_size) if total else 0,
    )


async def list_shorts(
    db: AsyncSession,
    *,
    page: int = 1,
    page_size: int = 20,
    current_user: User | None = None,
) -> PaginatedResponse[PostResponse]:
    post_repo = PostRepository(db)
    skip = (page - 1) * page_size
    total = await post_repo.count_shorts()
    posts = await post_repo.list_shorts(skip=skip, limit=page_size)

    if not posts:
        return PaginatedResponse(
            items=[], total=total, page=page, page_size=page_size,
            total_pages=math.ceil(total / page_size) if total else 0,
        )

    items = await _build_list_responses(db, posts, current_user)
    return PaginatedResponse(
        items=items, total=total, page=page, page_size=page_size,
        total_pages=math.ceil(total / page_size) if total else 0,
    )


async def _build_list_responses(
    db: AsyncSession,
    posts: list[Post],
    current_user: User | None,
) -> list[PostResponse]:
    user_repo = UserRepository(db)
    author_ids = {p.author_id for p in posts}
    authors = await user_repo.get_by_ids(author_ids)

    post_ids = [p.id for p in posts]
    like_repo = PostLikeRepository(db)
    like_counts = await like_repo.count_by_posts(post_ids)
    comment_repo = CommentRepository(db)
    comment_counts = await comment_repo.count_by_posts(post_ids)
    repost_repo = RepostRepository(db)
    repost_counts = await repost_repo.count_by_posts(post_ids)
    liked_set: set[UUID] = set()
    saved_set: set[UUID] = set()
    reposted_set: set[UUID] = set()
    if current_user:
        liked_set = await like_repo.liked_by_user(post_ids, current_user.id)
        save_repo = SavedPostRepository(db)
        saved_set = await save_repo.saved_by_user(post_ids, current_user.id)
        reposted_set = await repost_repo.reposted_by_user(post_ids, current_user.id)

    poll_post_ids = [p.id for p in posts if p.post_type == "poll"]
    polls: dict[UUID, PollResponse] = {}
    if poll_post_ids:
        uid = current_user.id if current_user else None
        for pid in poll_post_ids:
            polls[pid] = await _load_poll(db, pid, uid)

    return [
        _build_response(
            p, authors.get(p.author_id),
            like_count=like_counts.get(p.id, 0),
            comment_count=comment_counts.get(p.id, 0),
            repost_count=repost_counts.get(p.id, 0),
            liked_by_me=p.id in liked_set,
            saved_by_me=p.id in saved_set,
            reposted_by_me=p.id in reposted_set,
            poll=polls.get(p.id),
        )
        for p in posts
    ]


async def _load_poll(
    db: AsyncSession,
    post_id: UUID,
    user_id: UUID | None,
) -> PollResponse:
    options = (await db.execute(
        select(PollOption)
        .where(PollOption.post_id == post_id)
        .order_by(PollOption.position)
    )).scalars().all()

    if not options:
        return PollResponse()

    option_ids = [o.id for o in options]

    vote_counts_rows = (await db.execute(
        select(PollVote.option_id, func.count())
        .where(PollVote.post_id == post_id)
        .group_by(PollVote.option_id)
    )).all()
    vote_counts = {row[0]: row[1] for row in vote_counts_rows}

    total_votes = sum(vote_counts.values())

    voted_option_id = None
    if user_id:
        vote = (await db.execute(
            select(PollVote.option_id)
            .where(PollVote.post_id == post_id, PollVote.user_id == user_id)
        )).scalar_one_or_none()
        voted_option_id = vote

    option_responses = []
    for o in options:
        count = vote_counts.get(o.id, 0)
        pct = round((count / total_votes * 100) if total_votes > 0 else 0, 1)
        option_responses.append(PollOptionResponse(
            id=o.id,
            label=o.label,
            position=o.position,
            vote_count=count,
            pct=pct,
        ))

    return PollResponse(
        options=option_responses,
        total_votes=total_votes,
        voted_option_id=voted_option_id,
    )


def _build_response(
    post: Post,
    author: User | None,
    *,
    like_count: int = 0,
    comment_count: int = 0,
    repost_count: int = 0,
    liked_by_me: bool = False,
    saved_by_me: bool = False,
    reposted_by_me: bool = False,
    feed_label: str | None = None,
    recommendation_score: float | None = None,
    poll: PollResponse | None = None,
) -> PostResponse:
    author_summary = PostAuthorSummary(
        id=author.id,
        username=author.username,
        full_name=author.full_name,
        profile_image_url=author.profile_image_url,
    ) if author else PostAuthorSummary(
        id=post.author_id,
        username="[deleted]",
        full_name="Deleted User",
        profile_image_url=None,
    )

    return PostResponse(
        id=post.id,
        community_id=post.community_id,
        author=author_summary,
        content=post.content,
        image_url=post.image_url,
        video_url=post.video_url,
        post_type=post.post_type,
        category=post.category,
        like_count=like_count,
        comment_count=comment_count,
        repost_count=repost_count,
        liked_by_me=liked_by_me,
        saved_by_me=saved_by_me,
        reposted_by_me=reposted_by_me,
        feed_label=feed_label,
        recommendation_score=recommendation_score,
        poll=poll,
        created_at=post.created_at,
        updated_at=post.updated_at,
    )
