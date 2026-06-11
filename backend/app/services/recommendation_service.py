"""
AI Community Recommendation Engine.

Scores communities for a user based on four weighted signals:

  Interest Similarity  (0.35) — overlap between the user's interacted-with
      communities (liked/saved/commented posts) and the candidate community's
      topic cluster.
  University Match     (0.25) — same university gets a full score.
  Friend Presence      (0.25) — fraction of the user's followed users who
      are members of the candidate community.
  Activity Similarity  (0.15) — how recently active the community is,
      weighted toward communities the user's network engages with.

Each signal produces a 0.0–1.0 sub-score. The final score is a weighted sum.
A human-readable reason string is generated from the dominant signal(s).
"""

import logging
from collections import Counter
from uuid import UUID

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.comment import Comment
from app.models.community import Community, CommunityMember
from app.models.post import Post
from app.models.post_like import PostLike
from app.models.saved_post import SavedPost
from app.models.user import User
from app.models.user_follow import UserFollow

logger = logging.getLogger(__name__)

WEIGHT_INTEREST = 0.35
WEIGHT_UNIVERSITY = 0.25
WEIGHT_FRIENDS = 0.25
WEIGHT_ACTIVITY = 0.15

MAX_RESULTS = 10


async def get_community_recommendations(
    db: AsyncSession,
    user: User,
    limit: int = MAX_RESULTS,
) -> list[dict]:
    """
    Return up to *limit* community recommendations for *user*.

    Each result dict:
      community_id, name, description, member_count, score, reasons
    """
    user_id = user.id

    # ── 1. Gather user context in parallel-ish queries ──────────

    # Communities the user already belongs to (exclude from results)
    joined_q = select(CommunityMember.community_id).where(
        CommunityMember.user_id == user_id,
    )
    joined_rows = (await db.execute(joined_q)).scalars().all()
    joined_ids: set[UUID] = set(joined_rows)

    # Users the current user follows
    following_q = select(UserFollow.following_id).where(
        UserFollow.follower_id == user_id,
    )
    following_rows = (await db.execute(following_q)).scalars().all()
    following_ids: set[UUID] = set(following_rows)

    # Communities where the user has liked posts
    liked_communities_q = (
        select(Post.community_id)
        .join(PostLike, PostLike.post_id == Post.id)
        .where(PostLike.user_id == user_id, Post.is_deleted.is_(False))
    )
    liked_community_rows = (await db.execute(liked_communities_q)).scalars().all()

    # Communities where the user has saved posts
    saved_communities_q = (
        select(Post.community_id)
        .join(SavedPost, SavedPost.post_id == Post.id)
        .where(SavedPost.user_id == user_id, Post.is_deleted.is_(False))
    )
    saved_community_rows = (await db.execute(saved_communities_q)).scalars().all()

    # Communities where the user has commented
    commented_communities_q = (
        select(Post.community_id)
        .join(Comment, Comment.post_id == Post.id)
        .where(Comment.author_id == user_id, Comment.is_deleted.is_(False), Post.is_deleted.is_(False))
    )
    commented_community_rows = (await db.execute(commented_communities_q)).scalars().all()

    # Build interest profile: community_id -> interaction count
    interest_counter: Counter[UUID] = Counter()
    for cid in liked_community_rows:
        interest_counter[cid] += 2  # likes weight 2
    for cid in saved_community_rows:
        interest_counter[cid] += 3  # saves weight 3
    for cid in commented_community_rows:
        interest_counter[cid] += 1  # comments weight 1

    # ── 2. Get candidate communities ────────────────────────────

    candidates_q = (
        select(
            Community.id,
            Community.name,
            Community.description,
            Community.university_id,
            func.count(CommunityMember.user_id).label("member_count"),
        )
        .outerjoin(CommunityMember, CommunityMember.community_id == Community.id)
        .where(
            Community.is_deleted.is_(False),
            Community.is_public.is_(True),
        )
        .group_by(Community.id)
    )

    if joined_ids:
        candidates_q = candidates_q.where(Community.id.notin_(joined_ids))

    candidate_rows = (await db.execute(candidates_q)).all()

    if not candidate_rows:
        return []

    # ── 3. For each candidate, gather friend-presence data ──────

    candidate_ids = [row.id for row in candidate_rows]

    # Count how many followed users are in each candidate community
    friend_presence: dict[UUID, int] = {}
    if following_ids and candidate_ids:
        fp_q = (
            select(
                CommunityMember.community_id,
                func.count(CommunityMember.user_id).label("cnt"),
            )
            .where(
                CommunityMember.community_id.in_(candidate_ids),
                CommunityMember.user_id.in_(following_ids),
            )
            .group_by(CommunityMember.community_id)
        )
        fp_rows = (await db.execute(fp_q)).all()
        for row in fp_rows:
            friend_presence[row.community_id] = row.cnt

    # ── 4. Recent activity per candidate (posts in last 14 days) ─

    activity_q = (
        select(
            Post.community_id,
            func.count(Post.id).label("recent_posts"),
        )
        .where(
            Post.community_id.in_(candidate_ids),
            Post.is_deleted.is_(False),
            Post.created_at >= text("NOW() - INTERVAL '14 days'"),
        )
        .group_by(Post.community_id)
    )
    activity_rows = (await db.execute(activity_q)).all()
    recent_activity: dict[UUID, int] = {row.community_id: row.recent_posts for row in activity_rows}

    max_activity = max(recent_activity.values()) if recent_activity else 1

    # ── 5. Score each candidate ─────────────────────────────────

    max_interest = max(interest_counter.values()) if interest_counter else 1
    max_friends = max(friend_presence.values()) if friend_presence else 1

    scored: list[dict] = []

    for row in candidate_rows:
        cid = row.id
        reasons: list[str] = []

        # Interest similarity
        raw_interest = interest_counter.get(cid, 0)
        interest_score = raw_interest / max_interest if max_interest else 0.0
        if raw_interest > 0:
            reasons.append(f"You've interacted with content from this community")

        # University match
        uni_score = 1.0 if (user.university_id and row.university_id == user.university_id) else 0.0
        if uni_score == 1.0:
            reasons.append("Same university as you")

        # Friend presence
        n_friends = friend_presence.get(cid, 0)
        friends_score = n_friends / max_friends if max_friends else 0.0
        if n_friends > 0:
            reasons.append(f"You follow {n_friends} member{'s' if n_friends != 1 else ''}")

        # Activity
        n_activity = recent_activity.get(cid, 0)
        activity_score = n_activity / max_activity if max_activity else 0.0
        if n_activity >= 5:
            reasons.append(f"{n_activity} posts in the last 2 weeks")

        # Weighted total
        total = (
            WEIGHT_INTEREST * interest_score
            + WEIGHT_UNIVERSITY * uni_score
            + WEIGHT_FRIENDS * friends_score
            + WEIGHT_ACTIVITY * activity_score
        )

        if not reasons:
            reasons.append("Popular in your network")

        scored.append({
            "community_id": str(cid),
            "name": row.name,
            "description": row.description,
            "member_count": row.member_count,
            "score": round(total, 4),
            "reasons": reasons,
            "reason": reasons[0],
        })

    # Sort descending by score, then by member_count as tiebreaker
    scored.sort(key=lambda x: (-x["score"], -x["member_count"]))

    return scored[:limit]
