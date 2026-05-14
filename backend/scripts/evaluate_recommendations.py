#!/usr/bin/env python3
"""
Offline recommendation evaluator.

Generates synthetic posts with varied signals, scores them under every
preset, and prints a comparison table showing how each preset shapes the
top-10 ranking.

Usage:
    cd backend
    python -m scripts.evaluate_recommendations

No database or server required — runs entirely on synthetic data.
"""

from __future__ import annotations

import random
import uuid
from datetime import datetime, timedelta, timezone

from app.recommendation.config import PRESETS, WeightConfig
from app.recommendation.evaluator import EvaluationResult, evaluate
from app.recommendation.scoring import PostSignals, ScoredPost, score_and_rank


# ── Synthetic data generation ───────────────────────────────────

NUM_POSTS = 200
NUM_AUTHORS = 25
NUM_COMMUNITIES = 8
FOLLOWED_RATIO = 0.3   # 30% of authors are followed
TOP_K = 10


def generate_synthetic_data() -> tuple[
    list[PostSignals], set[uuid.UUID], list[uuid.UUID],
]:
    """Create synthetic posts spanning a realistic range of signals."""
    random.seed(42)
    now = datetime.now(timezone.utc)

    authors = [uuid.uuid4() for _ in range(NUM_AUTHORS)]
    communities = [uuid.uuid4() for _ in range(NUM_COMMUNITIES)]
    followed = set(random.sample(authors, int(len(authors) * FOLLOWED_RATIO)))

    signals: list[PostSignals] = []

    for i in range(NUM_POSTS):
        author = random.choice(authors)
        community = random.choice(communities)
        age_hours = random.expovariate(1 / 48)  # median ~48h, some very fresh
        created = now - timedelta(hours=age_hours)

        likes = int(random.expovariate(1 / 10))   # median ~10 likes
        comments = int(random.expovariate(1 / 3))  # median ~3 comments

        signals.append(PostSignals(
            post_id=uuid.uuid4(),
            author_id=author,
            community_id=community,
            created_at=created,
            like_count=likes,
            comment_count=comments,
            author_is_followed=(author in followed),
            author_interaction_count=random.randint(0, 15) if author in followed else random.randint(0, 3),
            community_interaction_count=random.randint(0, 20),
        ))

    return signals, followed, communities


# ── Main ────────────────────────────────────────────────────────

def main() -> None:
    signals, followed, communities = generate_synthetic_data()

    # Build lookup for evaluator
    signals_map = {s.post_id: s for s in signals}

    print("=" * 100)
    print("UniVerse Recommendation Engine — Offline Evaluation")
    print(f"Candidates: {len(signals)} posts, {NUM_AUTHORS} authors, "
          f"{NUM_COMMUNITIES} communities, "
          f"{len(followed)} followed authors ({FOLLOWED_RATIO:.0%})")
    print("=" * 100)
    print()

    results: list[EvaluationResult] = []

    for name, weights in PRESETS.items():
        scored = score_and_rank(signals, weights)
        result = evaluate(name, scored, signals_map, top_k=TOP_K)
        results.append(result)

    # ── Summary table ───────────────────────────────────────────
    print(f"{'Preset':>18s} | {'Score':>12s} | {'Engage':>7s} | "
          f"{'Fresh':>7s} | {'Follow':>7s} | {'Comm':>7s} | "
          f"{'Inter':>7s} | {'Authors':>10s} | {'Communities':>14s}")
    print("-" * 115)

    for r in results:
        print(
            f"{r.preset_name:>18s} | "
            f"{r.mean_score:>5.2f}±{r.std_score:<5.2f} | "
            f"{r.avg_engagement:>7.2f} | "
            f"{r.avg_freshness:>7.2f} | "
            f"{r.avg_follow:>7.2f} | "
            f"{r.avg_community:>7.2f} | "
            f"{r.avg_interaction:>7.2f} | "
            f"{r.unique_authors:>3d}/{r.top_k:<3d} "
            f"({r.author_diversity_ratio:>4.0%}) | "
            f"{r.unique_communities:>3d}/{r.top_k:<3d} "
            f"({r.community_diversity_ratio:>4.0%})"
        )

    # ── Detailed breakdown per preset ───────────────────────────
    print()
    print("=" * 100)
    print("Detailed Top-10 per Preset")
    print("=" * 100)

    for name, weights in PRESETS.items():
        scored = score_and_rank(signals, weights)
        print(f"\n-- {name.upper()} (weights: {weights.as_dict()}) --")
        print(f"  {'#':>3s}  {'Score':>8s}  {'Eng':>6s}  {'Fresh':>6s}  "
              f"{'Fol':>5s}  {'Comm':>6s}  {'Inter':>6s}  {'Label'}")
        print(f"  {'-' * 70}")

        for i, sp in enumerate(scored[:TOP_K], 1):
            print(
                f"  {i:>3d}  {sp.final_score:>8.3f}  "
                f"{sp.engagement_score:>6.3f}  {sp.freshness_score:>6.3f}  "
                f"{sp.follow_score:>5.1f}  {sp.community_score:>6.3f}  "
                f"{sp.interaction_score:>6.3f}  "
                f"{sp.label or '—'}"
            )

    # ── Weight sensitivity analysis ─────────────────────────────
    print()
    print("=" * 100)
    print("Weight Sensitivity: Varying w_engagement from 0.0 to 4.0 (balanced baseline)")
    print("=" * 100)

    base = PRESETS["balanced"]
    print(f"  {'w_eng':>6s}  {'Avg Score':>10s}  {'Avg Engage':>11s}  "
          f"{'Avg Fresh':>10s}  {'Auth Div':>9s}")
    print(f"  {'-' * 55}")

    for w in [0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0]:
        tweaked = WeightConfig(
            name=f"eng={w}",
            w_engagement=w,
            w_freshness=base.w_freshness,
            w_follow=base.w_follow,
            w_community=base.w_community,
            w_interaction=base.w_interaction,
        )
        scored = score_and_rank(signals, tweaked)
        result = evaluate(f"eng={w}", scored, signals_map, top_k=TOP_K)
        print(
            f"  {w:>6.1f}  {result.mean_score:>10.3f}  "
            f"{result.avg_engagement:>11.3f}  {result.avg_freshness:>10.3f}  "
            f"{result.author_diversity_ratio:>8.0%}"
        )

    print()
    print("Done. Use RECOMMENDATION_PRESET env var to select a preset at runtime.")


if __name__ == "__main__":
    main()
