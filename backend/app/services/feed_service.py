"""
Home feed service — retrieve → score → rank using the recommendation engine.

Pipeline:
  1. Fetch candidate posts from joined communities (recent, capped).
  2. Batch-load all signals in parallel-style queries (no N+1).
  3. Score each post with configurable weights.
  4. Sort by score, paginate, build response objects.
"""

import math
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.post import Post
from app.models.user import User
from app.recommendation.config import get_active_weights
from app.recommendation.scoring import (
    MAX_CANDIDATES,
    PostSignals,
    ScoredPost,
    score_and_rank,
)
from app.repositories.comment_repository import CommentRepository
from app.repositories.community_repository import CommunityRepository
from app.repositories.post_like_repository import PostLikeRepository
from app.repositories.post_repository import PostRepository
from app.repositories.repost_repository import RepostRepository
from app.repositories.saved_post_repository import SavedPostRepository
from app.repositories.user_repository import UserRepository
from app.schemas.common import PaginatedResponse
from app.schemas.post import PostResponse
from app.services.post_service import _build_response, _load_poll


async def get_home_feed(
    db: AsyncSession,
    current_user: User,
    *,
    page: int = 1,
    page_size: int = 20,
) -> PaginatedResponse[PostResponse]:
    """
    Personalised home timeline powered by the recommendation engine.

    Scoring model:
        final_score =  w_engagement  * engagement_score
                     + w_freshness   * freshness_score
                     + w_follow      * follow_score
                     + w_community   * community_score
                     + w_interaction * interaction_score

    Weights are loaded from the active preset (env RECOMMENDATION_PRESET).
    ``recommendation_score`` is only included in development mode.
    """
    # ── 0. Resolve joined communities ───────────────────────────
    community_repo = CommunityRepository(db)
    community_ids = await community_repo.get_joined_ids(current_user.id)

    if not community_ids:
        return PaginatedResponse(
            items=[], total=0, page=page, page_size=page_size, total_pages=0,
        )

    # ── 1. Candidate retrieval ──────────────────────────────────
    post_repo = PostRepository(db)
    total = await post_repo.count_by_communities(community_ids)
    candidates = await post_repo.list_candidates(
        community_ids, limit=MAX_CANDIDATES,
    )

    if not candidates:
        return PaginatedResponse(
            items=[], total=total, page=page, page_size=page_size,
            total_pages=math.ceil(total / page_size) if total else 0,
        )

    # ── 2. Batch-load signals (all candidates at once) ──────────
    post_ids = [p.id for p in candidates]
    candidate_author_ids = {p.author_id for p in candidates}
    candidate_community_ids = list({p.community_id for p in candidates})

    user_repo = UserRepository(db)
    like_repo = PostLikeRepository(db)
    comment_repo = CommentRepository(db)
    save_repo = SavedPostRepository(db)

    # Engagement signals
    like_counts = await like_repo.count_by_posts(post_ids)
    comment_counts = await comment_repo.count_by_posts(post_ids)

    # Social signals
    following_ids = await user_repo.get_following_ids(current_user.id)

    # Interaction signals — author & community affinity
    author_affinity = await like_repo.author_affinity(
        current_user.id, candidate_author_ids,
    )
    community_affinity = await like_repo.community_affinity(
        current_user.id, candidate_community_ids,
    )

    # Repost counts
    repost_repo = RepostRepository(db)
    repost_counts = await repost_repo.count_by_posts(post_ids)

    # User's own like/save/repost state (for response fields)
    liked_set = await like_repo.liked_by_user(post_ids, current_user.id)
    saved_set = await save_repo.saved_by_user(post_ids, current_user.id)
    reposted_set = await repost_repo.reposted_by_user(post_ids, current_user.id)

    authors = await user_repo.get_by_ids(candidate_author_ids)

    # ── 3. Build signal objects & score ──────────────────────────
    signals_list: list[PostSignals] = []
    for p in candidates:
        signals_list.append(PostSignals(
            post_id=p.id,
            author_id=p.author_id,
            community_id=p.community_id,
            created_at=p.created_at,
            like_count=like_counts.get(p.id, 0),
            comment_count=comment_counts.get(p.id, 0),
            author_is_followed=(p.author_id in following_ids),
            author_interaction_count=author_affinity.get(p.author_id, 0),
            community_interaction_count=community_affinity.get(p.community_id, 0),
        ))

    weights = get_active_weights()
    scored = score_and_rank(signals_list, weights)

    # ── 4. Paginate from scored list ────────────────────────────
    effective_total = min(total, len(scored))
    total_pages = math.ceil(effective_total / page_size) if effective_total else 0
    skip = (page - 1) * page_size
    page_scored = scored[skip : skip + page_size]

    # Build a lookup from post_id → Post model for the page slice
    post_map: dict[UUID, Post] = {p.id: p for p in candidates}

    show_score = settings.is_development

    poll_post_ids = [sp.post_id for sp in page_scored if post_map[sp.post_id].post_type == "poll"]
    polls = {}
    for pid in poll_post_ids:
        polls[pid] = await _load_poll(db, pid, current_user.id)

    items: list[PostResponse] = []
    for sp in page_scored:
        post = post_map[sp.post_id]
        items.append(_build_response(
            post,
            authors.get(post.author_id),
            like_count=like_counts.get(post.id, 0),
            comment_count=comment_counts.get(post.id, 0),
            repost_count=repost_counts.get(post.id, 0),
            liked_by_me=post.id in liked_set,
            saved_by_me=post.id in saved_set,
            reposted_by_me=post.id in reposted_set,
            feed_label=sp.label,
            recommendation_score=sp.final_score if show_score else None,
            poll=polls.get(post.id),
        ))

    return PaginatedResponse(
        items=items,
        total=effective_total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )
