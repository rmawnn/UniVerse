"""
Offline evaluation metrics for recommendation presets.

Computes quality indicators over a scored ranking:

- **Mean engagement / freshness scores** — how much each signal
  contributes to the final ranking.
- **Author diversity** — unique authors in top-K (higher = more varied).
- **Community diversity** — unique communities in top-K.
- **Score distribution** — mean, median, std of final scores.

These metrics don't measure "accuracy" (there's no ground truth) — they
show *how a preset shapes the feed* so you can compare trade-offs between
engagement-heavy vs freshness-heavy vs social-heavy tuning.
"""

from __future__ import annotations

import statistics
from dataclasses import dataclass
from uuid import UUID

from app.recommendation.scoring import PostSignals, ScoredPost


@dataclass
class EvaluationResult:
    """Evaluation metrics for a single preset over a scored ranking."""

    preset_name: str
    total_candidates: int
    top_k: int

    # Average signal scores in top-K
    avg_engagement: float
    avg_freshness: float
    avg_follow: float
    avg_community: float
    avg_interaction: float

    # Final score distribution in top-K
    mean_score: float
    median_score: float
    std_score: float

    # Diversity in top-K
    unique_authors: int
    unique_communities: int
    author_diversity_ratio: float   # unique_authors / top_k
    community_diversity_ratio: float  # unique_communities / top_k

    def summary_line(self) -> str:
        return (
            f"[{self.preset_name:>18s}]  "
            f"score={self.mean_score:.2f}±{self.std_score:.2f}  "
            f"eng={self.avg_engagement:.2f}  "
            f"fresh={self.avg_freshness:.2f}  "
            f"fol={self.avg_follow:.2f}  "
            f"comm={self.avg_community:.2f}  "
            f"inter={self.avg_interaction:.2f}  "
            f"authors={self.unique_authors}/{self.top_k} "
            f"({self.author_diversity_ratio:.0%})  "
            f"communities={self.unique_communities}/{self.top_k} "
            f"({self.community_diversity_ratio:.0%})"
        )


def evaluate(
    preset_name: str,
    scored: list[ScoredPost],
    signals_map: dict[UUID, PostSignals],
    top_k: int = 10,
) -> EvaluationResult:
    """Compute evaluation metrics for a scored ranking."""
    top = scored[:top_k]
    k = len(top)

    if k == 0:
        return EvaluationResult(
            preset_name=preset_name,
            total_candidates=len(scored),
            top_k=0,
            avg_engagement=0, avg_freshness=0, avg_follow=0,
            avg_community=0, avg_interaction=0,
            mean_score=0, median_score=0, std_score=0,
            unique_authors=0, unique_communities=0,
            author_diversity_ratio=0, community_diversity_ratio=0,
        )

    # Signal averages
    avg_eng = sum(s.engagement_score for s in top) / k
    avg_fresh = sum(s.freshness_score for s in top) / k
    avg_fol = sum(s.follow_score for s in top) / k
    avg_comm = sum(s.community_score for s in top) / k
    avg_inter = sum(s.interaction_score for s in top) / k

    # Score distribution
    scores = [s.final_score for s in top]
    mean_sc = statistics.mean(scores)
    median_sc = statistics.median(scores)
    std_sc = statistics.pstdev(scores)

    # Diversity
    author_ids: set[UUID] = set()
    community_ids: set[UUID] = set()
    for s in top:
        sig = signals_map.get(s.post_id)
        if sig:
            author_ids.add(sig.author_id)
            community_ids.add(sig.community_id)

    return EvaluationResult(
        preset_name=preset_name,
        total_candidates=len(scored),
        top_k=k,
        avg_engagement=round(avg_eng, 4),
        avg_freshness=round(avg_fresh, 4),
        avg_follow=round(avg_fol, 4),
        avg_community=round(avg_comm, 4),
        avg_interaction=round(avg_inter, 4),
        mean_score=round(mean_sc, 4),
        median_score=round(median_sc, 4),
        std_score=round(std_sc, 4),
        unique_authors=len(author_ids),
        unique_communities=len(community_ids),
        author_diversity_ratio=round(len(author_ids) / k, 4),
        community_diversity_ratio=round(len(community_ids) / k, 4),
    )
