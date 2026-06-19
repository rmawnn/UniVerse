"""Unit tests for the recommendation scoring engine and config."""

from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest

from app.recommendation.config import (
    PRESETS,
    WeightConfig,
    get_active_weights,
)
from app.recommendation.scoring import (
    MAX_CANDIDATES,
    PostSignals,
    ScoredPost,
    _compute_label,
    _norm_community,
    _norm_engagement,
    _norm_follow,
    _norm_freshness,
    _norm_interaction,
    score_and_rank,
    score_post,
)


class TestNormEngagement:
    def test_zero(self):
        assert _norm_engagement(0, 0) == 0.0

    def test_positive(self):
        result = _norm_engagement(5, 3)
        assert result > 0

    def test_high_likes(self):
        low = _norm_engagement(1, 0)
        high = _norm_engagement(100, 0)
        assert high > low


class TestNormFreshness:
    def test_recent(self):
        now = datetime.now(timezone.utc)
        result = _norm_freshness(now)
        assert result > 0.9

    def test_old(self):
        old = datetime.now(timezone.utc) - timedelta(days=7)
        result = _norm_freshness(old)
        assert result < 0.1

    def test_24_hours_half(self):
        day_ago = datetime.now(timezone.utc) - timedelta(hours=24)
        result = _norm_freshness(day_ago)
        assert abs(result - 0.5) < 0.05


class TestNormFollow:
    def test_true(self):
        assert _norm_follow(True) == 1.0

    def test_false(self):
        assert _norm_follow(False) == 0.0


class TestNormCommunity:
    def test_zero(self):
        assert _norm_community(0) == 0.0

    def test_positive(self):
        assert _norm_community(10) > 0


class TestNormInteraction:
    def test_zero(self):
        assert _norm_interaction(0) == 0.0

    def test_positive(self):
        assert _norm_interaction(5) > 0


class TestComputeLabel:
    def _make_signals(self, **kwargs):
        defaults = dict(
            post_id=uuid4(),
            author_id=uuid4(),
            community_id=uuid4(),
            created_at=datetime.now(timezone.utc),
        )
        defaults.update(kwargs)
        return PostSignals(**defaults)

    def test_followed_author(self):
        signals = self._make_signals(author_is_followed=True)
        scored = ScoredPost(post_id=signals.post_id)
        weights = PRESETS["balanced"]
        label = _compute_label(signals, scored, weights)
        assert label == "From someone you follow"

    def test_high_engagement(self):
        signals = self._make_signals()
        scored = ScoredPost(post_id=signals.post_id, engagement_score=3.0)
        weights = PRESETS["balanced"]
        label = _compute_label(signals, scored, weights)
        assert label == "Popular post"

    def test_no_label(self):
        signals = self._make_signals()
        scored = ScoredPost(post_id=signals.post_id, engagement_score=0.5)
        weights = PRESETS["balanced"]
        label = _compute_label(signals, scored, weights)
        assert label is None

    def test_community_affinity(self):
        signals = self._make_signals(community_interaction_count=10)
        scored = ScoredPost(post_id=signals.post_id, community_score=1.0)
        weights = PRESETS["balanced"]
        label = _compute_label(signals, scored, weights)
        assert label == "Active in your community"

    def test_author_interaction(self):
        signals = self._make_signals(author_interaction_count=5)
        scored = ScoredPost(post_id=signals.post_id, interaction_score=1.0)
        weights = PRESETS["balanced"]
        label = _compute_label(signals, scored, weights)
        assert label == "From an author you engage with"


class TestScorePost:
    def test_basic(self):
        signals = PostSignals(
            post_id=uuid4(),
            author_id=uuid4(),
            community_id=uuid4(),
            created_at=datetime.now(timezone.utc),
            like_count=10,
            comment_count=5,
            author_is_followed=True,
        )
        weights = PRESETS["balanced"]
        result = score_post(signals, weights)
        assert result.final_score > 0
        assert result.engagement_score > 0
        assert result.freshness_score > 0
        assert result.follow_score == 1.0


class TestScoreAndRank:
    def test_ranking(self):
        now = datetime.now(timezone.utc)
        s1 = PostSignals(
            post_id=uuid4(), author_id=uuid4(), community_id=uuid4(),
            created_at=now, like_count=100, comment_count=50,
        )
        s2 = PostSignals(
            post_id=uuid4(), author_id=uuid4(), community_id=uuid4(),
            created_at=now, like_count=1, comment_count=0,
        )
        weights = PRESETS["balanced"]
        ranked = score_and_rank([s1, s2], weights)
        assert len(ranked) == 2
        assert ranked[0].final_score >= ranked[1].final_score

    def test_empty(self):
        weights = PRESETS["balanced"]
        assert score_and_rank([], weights) == []


class TestWeightConfig:
    def test_presets_exist(self):
        assert "balanced" in PRESETS
        assert "baseline" in PRESETS
        assert "engagement_heavy" in PRESETS
        assert "freshness_heavy" in PRESETS
        assert "social_heavy" in PRESETS

    def test_as_dict(self):
        config = PRESETS["balanced"]
        d = config.as_dict()
        assert "w_engagement" in d
        assert "w_freshness" in d

    def test_get_active_default(self):
        weights = get_active_weights()
        assert weights.name in PRESETS


class TestConstants:
    def test_max_candidates(self):
        assert MAX_CANDIDATES == 500
