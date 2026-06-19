"""Unit tests for app.services.recommendation_service — weights and constants."""

from app.services.recommendation_service import (
    MAX_RESULTS,
    WEIGHT_ACTIVITY,
    WEIGHT_FRIENDS,
    WEIGHT_INTEREST,
    WEIGHT_UNIVERSITY,
)


class TestRecommendationWeights:
    def test_weights_sum_to_one(self):
        total = WEIGHT_INTEREST + WEIGHT_UNIVERSITY + WEIGHT_FRIENDS + WEIGHT_ACTIVITY
        assert abs(total - 1.0) < 1e-9

    def test_interest_is_largest_weight(self):
        assert WEIGHT_INTEREST >= max(WEIGHT_UNIVERSITY, WEIGHT_FRIENDS, WEIGHT_ACTIVITY)

    def test_max_results(self):
        assert MAX_RESULTS == 10

    def test_individual_weights(self):
        assert WEIGHT_INTEREST == 0.35
        assert WEIGHT_UNIVERSITY == 0.25
        assert WEIGHT_FRIENDS == 0.25
        assert WEIGHT_ACTIVITY == 0.15
