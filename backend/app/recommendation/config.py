"""
Weight presets for the recommendation scoring model.

Each preset defines multipliers for five signal dimensions:

- **w_engagement**: likes + comments (normalised)
- **w_freshness**: time-decay boost for recent posts
- **w_follow**: boost for posts by followed users
- **w_community**: boost for posts in the user's most-active communities
- **w_interaction**: boost for authors/communities the user previously
  interacted with (liked/commented)

Select a preset at runtime via the ``RECOMMENDATION_PRESET`` env var.
Default: ``"balanced"``.
"""

from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class WeightConfig:
    """Immutable weight vector for the scoring model."""

    name: str

    w_engagement: float
    w_freshness: float
    w_follow: float
    w_community: float
    w_interaction: float

    def as_dict(self) -> dict[str, float]:
        return {
            "w_engagement": self.w_engagement,
            "w_freshness": self.w_freshness,
            "w_follow": self.w_follow,
            "w_community": self.w_community,
            "w_interaction": self.w_interaction,
        }


# ── Preset definitions ──────────────────────────────────────────

PRESETS: dict[str, WeightConfig] = {
    "baseline": WeightConfig(
        name="baseline",
        w_engagement=1.0,
        w_freshness=1.0,
        w_follow=0.0,
        w_community=0.0,
        w_interaction=0.0,
    ),
    "engagement_heavy": WeightConfig(
        name="engagement_heavy",
        w_engagement=3.0,
        w_freshness=0.5,
        w_follow=0.5,
        w_community=0.3,
        w_interaction=0.5,
    ),
    "freshness_heavy": WeightConfig(
        name="freshness_heavy",
        w_engagement=0.5,
        w_freshness=3.0,
        w_follow=0.5,
        w_community=0.3,
        w_interaction=0.3,
    ),
    "social_heavy": WeightConfig(
        name="social_heavy",
        w_engagement=0.5,
        w_freshness=0.8,
        w_follow=3.0,
        w_community=1.0,
        w_interaction=2.0,
    ),
    "balanced": WeightConfig(
        name="balanced",
        w_engagement=1.5,
        w_freshness=1.2,
        w_follow=1.5,
        w_community=0.8,
        w_interaction=1.0,
    ),
}


def get_active_weights() -> WeightConfig:
    """Return the weight preset selected by RECOMMENDATION_PRESET env var."""
    preset_name = os.environ.get("RECOMMENDATION_PRESET", "balanced").lower()
    if preset_name not in PRESETS:
        preset_name = "balanced"
    return PRESETS[preset_name]
