"""
Post scoring engine — retrieve → signal → score → rank.

All signal values are normalised to roughly [0, 1] before weighting
so that preset weights are intuitive and comparable across dimensions.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import UUID

from app.recommendation.config import WeightConfig


# Maximum candidate posts fetched for scoring per request.
# Keeps memory and query cost bounded; 500 is plenty for typical feeds.
MAX_CANDIDATES = 500


@dataclass
class PostSignals:
    """Raw signal values for a single post, computed from batch queries."""

    post_id: UUID
    author_id: UUID
    community_id: UUID
    created_at: datetime

    like_count: int = 0
    comment_count: int = 0

    author_is_followed: bool = False
    community_member: bool = True  # always true for feed candidates

    # How many times the viewer previously interacted with this author
    author_interaction_count: int = 0
    # How many times the viewer previously interacted in this community
    community_interaction_count: int = 0


@dataclass
class ScoredPost:
    """A post with its computed score breakdown."""

    post_id: UUID
    final_score: float = 0.0

    engagement_score: float = 0.0
    freshness_score: float = 0.0
    follow_score: float = 0.0
    community_score: float = 0.0
    interaction_score: float = 0.0

    label: str | None = None


# ── Normalisers ─────────────────────────────────────────────────


def _norm_engagement(likes: int, comments: int) -> float:
    """Log-scaled engagement.  log1p avoids log(0) and compresses outliers."""
    raw = likes * 2 + comments
    return math.log1p(raw)  # e.g. 0 → 0, 10 → 2.4, 100 → 4.6


def _norm_freshness(created_at: datetime) -> float:
    """Exponential time decay with 24-hour half-life.

    - 0 hours old → 1.0
    - 24 hours → 0.5
    - 48 hours → 0.25
    - 7 days → ~0.008
    """
    now = datetime.now(timezone.utc)
    age_hours = max((now - created_at).total_seconds() / 3600, 0)
    return math.pow(0.5, age_hours / 24)


def _norm_follow(is_followed: bool) -> float:
    return 1.0 if is_followed else 0.0


def _norm_community(interaction_count: int) -> float:
    """Log-scaled community activity affinity."""
    return math.log1p(interaction_count)


def _norm_interaction(author_count: int) -> float:
    """Log-scaled author interaction affinity."""
    return math.log1p(author_count)


# ── Label generation ────────────────────────────────────────────

def _compute_label(
    signals: PostSignals,
    scored: ScoredPost,
    weights: WeightConfig,
) -> str | None:
    """Pick the most relevant contextual label for a post.

    Priority order (first match wins):
      1. Followed author with high follow weight
      2. High community affinity
      3. High interaction affinity
      4. High engagement
    """
    if signals.author_is_followed and weights.w_follow > 0:
        return "From someone you follow"

    if signals.community_interaction_count >= 5 and scored.community_score > 0.5:
        return "Active in your community"

    if signals.author_interaction_count >= 3 and scored.interaction_score > 0.5:
        return "From an author you engage with"

    if scored.engagement_score > 2.0:
        return "Popular post"

    return None


# ── Core scorer ─────────────────────────────────────────────────


def score_post(signals: PostSignals, weights: WeightConfig) -> ScoredPost:
    """Compute the weighted score for a single post."""
    eng = _norm_engagement(signals.like_count, signals.comment_count)
    fresh = _norm_freshness(signals.created_at)
    fol = _norm_follow(signals.author_is_followed)
    comm = _norm_community(signals.community_interaction_count)
    inter = _norm_interaction(signals.author_interaction_count)

    final = (
        weights.w_engagement * eng
        + weights.w_freshness * fresh
        + weights.w_follow * fol
        + weights.w_community * comm
        + weights.w_interaction * inter
    )

    scored = ScoredPost(
        post_id=signals.post_id,
        final_score=round(final, 4),
        engagement_score=round(eng, 4),
        freshness_score=round(fresh, 4),
        follow_score=round(fol, 4),
        community_score=round(comm, 4),
        interaction_score=round(inter, 4),
    )
    scored.label = _compute_label(signals, scored, weights)
    return scored


def score_and_rank(
    signals_list: list[PostSignals],
    weights: WeightConfig,
) -> list[ScoredPost]:
    """Score all candidates and return sorted by final_score descending.

    Ties are broken by post_id for deterministic ordering.
    """
    scored = [score_post(s, weights) for s in signals_list]
    scored.sort(key=lambda s: (-s.final_score, str(s.post_id)))
    return scored
