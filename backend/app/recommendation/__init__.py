"""
Tunable recommendation engine for UniVerse feed ranking.

Architecture (retrieve → score → rank):

1. **Candidate retrieval**: SQL fetches recent posts from joined communities.
2. **Signal computation**: Batch queries load engagement, freshness,
   follow-relationship, community-activity, and interaction signals.
3. **Weighted scoring**: Each signal is normalised and combined with
   configurable weights defined in ``config.py``.
4. **Pagination**: Scored posts are sorted and sliced for the requested page.

Tuning is done via weight presets (see ``config.PRESETS``) selectable
through the ``RECOMMENDATION_PRESET`` environment variable.
"""

from app.recommendation.config import get_active_weights, WeightConfig  # noqa: F401
from app.recommendation.scoring import score_and_rank  # noqa: F401
