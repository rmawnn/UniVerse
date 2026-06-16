"""
Evaluation: Community Recommendation Algorithm.

Since the recommendation engine requires a live database, this evaluator
tests the scoring formula offline using synthetic user-community scenarios
with known ground-truth relevance labels.

Measures: Precision@K, Recall@K, NDCG@K, Mean Reciprocal Rank (MRR).
"""

import json
import math
from dataclasses import dataclass, field
from uuid import UUID, uuid4

WEIGHT_INTEREST = 0.35
WEIGHT_UNIVERSITY = 0.25
WEIGHT_FRIENDS = 0.25
WEIGHT_ACTIVITY = 0.15


@dataclass
class MockCommunity:
    id: UUID = field(default_factory=uuid4)
    name: str = ""
    university_id: UUID | None = None
    interest_score: float = 0.0
    friend_count: int = 0
    recent_activity: int = 0
    relevant: bool = False


@dataclass
class MockUser:
    id: UUID = field(default_factory=uuid4)
    university_id: UUID | None = None


def score_community(
    community: MockCommunity,
    user: MockUser,
    max_interest: float,
    max_friends: int,
    max_activity: int,
) -> float:
    """Replicate the scoring formula from recommendation_service.py."""
    interest = community.interest_score / max_interest if max_interest > 0 else 0.0
    uni = 1.0 if (user.university_id and community.university_id == user.university_id) else 0.0
    friends = community.friend_count / max_friends if max_friends > 0 else 0.0
    activity = community.recent_activity / max_activity if max_activity > 0 else 0.0

    return (
        WEIGHT_INTEREST * interest
        + WEIGHT_UNIVERSITY * uni
        + WEIGHT_FRIENDS * friends
        + WEIGHT_ACTIVITY * activity
    )


def dcg_at_k(relevances: list[bool], k: int) -> float:
    """Discounted Cumulative Gain at K."""
    total = 0.0
    for i, rel in enumerate(relevances[:k]):
        if rel:
            total += 1.0 / math.log2(i + 2)
    return total


def ndcg_at_k(relevances: list[bool], k: int) -> float:
    """Normalized DCG at K."""
    dcg = dcg_at_k(relevances, k)
    ideal = dcg_at_k(sorted(relevances, reverse=True), k)
    return dcg / ideal if ideal > 0 else 0.0


def build_scenarios() -> list[dict]:
    """
    Create 20 test scenarios with known relevant communities.
    Each scenario simulates a user and a set of candidate communities.
    """
    scenarios = []
    uni_a = uuid4()
    uni_b = uuid4()

    # Scenario 1: CS student with strong interest signals
    user = MockUser(university_id=uni_a)
    communities = [
        MockCommunity(name="AI Club", university_id=uni_a, interest_score=8, friend_count=5, recent_activity=20, relevant=True),
        MockCommunity(name="Web Dev", university_id=uni_a, interest_score=6, friend_count=3, recent_activity=15, relevant=True),
        MockCommunity(name="Chess Club", university_id=uni_a, interest_score=0, friend_count=0, recent_activity=2, relevant=False),
        MockCommunity(name="Photography", university_id=uni_b, interest_score=0, friend_count=0, recent_activity=5, relevant=False),
        MockCommunity(name="Data Science", university_id=uni_a, interest_score=5, friend_count=2, recent_activity=12, relevant=True),
        MockCommunity(name="Music Society", university_id=uni_a, interest_score=0, friend_count=1, recent_activity=8, relevant=False),
        MockCommunity(name="Robotics", university_id=uni_a, interest_score=3, friend_count=4, recent_activity=10, relevant=True),
        MockCommunity(name="Cooking Club", university_id=uni_b, interest_score=0, friend_count=0, recent_activity=3, relevant=False),
    ]
    scenarios.append({"name": "CS student, strong interest signals", "user": user, "communities": communities})

    # Scenario 2: New user with no interactions (cold start)
    user = MockUser(university_id=uni_a)
    communities = [
        MockCommunity(name="CS Hub", university_id=uni_a, interest_score=0, friend_count=0, recent_activity=25, relevant=True),
        MockCommunity(name="Campus Events", university_id=uni_a, interest_score=0, friend_count=0, recent_activity=30, relevant=True),
        MockCommunity(name="Art Gallery", university_id=uni_b, interest_score=0, friend_count=0, recent_activity=5, relevant=False),
        MockCommunity(name="Study Buddies", university_id=uni_a, interest_score=0, friend_count=0, recent_activity=20, relevant=True),
        MockCommunity(name="Off-Campus Club", university_id=uni_b, interest_score=0, friend_count=0, recent_activity=1, relevant=False),
    ]
    scenarios.append({"name": "New user (cold start)", "user": user, "communities": communities})

    # Scenario 3: User with friends but no interests
    user = MockUser(university_id=uni_a)
    communities = [
        MockCommunity(name="Startup Club", university_id=uni_a, interest_score=0, friend_count=8, recent_activity=10, relevant=True),
        MockCommunity(name="Game Dev", university_id=uni_a, interest_score=0, friend_count=6, recent_activity=8, relevant=True),
        MockCommunity(name="Debate Team", university_id=uni_a, interest_score=0, friend_count=0, recent_activity=12, relevant=False),
        MockCommunity(name="Running Club", university_id=uni_b, interest_score=0, friend_count=1, recent_activity=3, relevant=False),
        MockCommunity(name="Hack Club", university_id=uni_a, interest_score=0, friend_count=4, recent_activity=15, relevant=True),
    ]
    scenarios.append({"name": "User with friends, no interest history", "user": user, "communities": communities})

    # Scenario 4: Cross-university user
    user = MockUser(university_id=uni_b)
    communities = [
        MockCommunity(name="Biology Lab", university_id=uni_b, interest_score=7, friend_count=3, recent_activity=10, relevant=True),
        MockCommunity(name="CS Club", university_id=uni_a, interest_score=5, friend_count=2, recent_activity=20, relevant=True),
        MockCommunity(name="Pre-Med", university_id=uni_b, interest_score=6, friend_count=1, recent_activity=8, relevant=True),
        MockCommunity(name="Yoga Club", university_id=uni_a, interest_score=0, friend_count=0, recent_activity=2, relevant=False),
        MockCommunity(name="Dance Team", university_id=uni_b, interest_score=0, friend_count=0, recent_activity=4, relevant=False),
        MockCommunity(name="Film Club", university_id=uni_a, interest_score=1, friend_count=0, recent_activity=6, relevant=False),
    ]
    scenarios.append({"name": "Cross-university interest mix", "user": user, "communities": communities})

    # Scenario 5: Highly active communities with weak signals
    user = MockUser(university_id=uni_a)
    communities = [
        MockCommunity(name="Meme Page", university_id=uni_a, interest_score=1, friend_count=0, recent_activity=100, relevant=False),
        MockCommunity(name="ML Research", university_id=uni_a, interest_score=9, friend_count=3, recent_activity=5, relevant=True),
        MockCommunity(name="Sports Talk", university_id=uni_a, interest_score=0, friend_count=1, recent_activity=80, relevant=False),
        MockCommunity(name="NLP Group", university_id=uni_a, interest_score=7, friend_count=5, recent_activity=8, relevant=True),
        MockCommunity(name="Random Chat", university_id=uni_a, interest_score=0, friend_count=0, recent_activity=50, relevant=False),
    ]
    scenarios.append({"name": "High-activity noise vs relevant niche", "user": user, "communities": communities})

    # Scenario 6-10: More diversity
    for i, (scenario_name, relevant_mask, interests, friends, activities) in enumerate([
        ("Engineering student", [True, True, False, True, False, False],
         [6, 4, 0, 5, 1, 0], [3, 2, 0, 1, 0, 0], [15, 10, 20, 8, 5, 2]),
        ("Art/design student", [True, False, True, False, True, False],
         [7, 0, 5, 0, 4, 1], [2, 0, 3, 0, 1, 0], [12, 8, 10, 15, 6, 3]),
        ("Business major", [True, True, False, False, True, False],
         [8, 6, 0, 1, 5, 0], [4, 3, 1, 0, 2, 0], [20, 15, 10, 5, 12, 3]),
        ("Pre-med student", [True, False, True, True, False, False],
         [9, 1, 7, 5, 0, 0], [5, 0, 3, 2, 0, 0], [10, 5, 12, 8, 15, 2]),
        ("Music enthusiast", [True, True, False, False, False, True],
         [8, 6, 0, 1, 0, 4], [4, 3, 0, 0, 0, 2], [15, 12, 8, 5, 3, 10]),
    ], start=6):
        user = MockUser(university_id=uni_a)
        names = [f"Community_{i}_{j}" for j in range(len(relevant_mask))]
        communities = [
            MockCommunity(
                name=names[j], university_id=uni_a,
                interest_score=interests[j], friend_count=friends[j],
                recent_activity=activities[j], relevant=relevant_mask[j],
            )
            for j in range(len(relevant_mask))
        ]
        scenarios.append({"name": scenario_name, "user": user, "communities": communities})

    # Scenarios 11-20: Systematic edge cases
    edge_cases = [
        ("Single relevant community", [True, False, False, False],
         [10, 0, 0, 0], [5, 0, 0, 0], [20, 15, 10, 5]),
        ("All relevant communities", [True, True, True, True],
         [5, 6, 7, 8], [2, 3, 4, 5], [10, 12, 14, 16]),
        ("No relevant communities", [False, False, False, False],
         [0, 0, 0, 0], [0, 0, 0, 0], [5, 10, 15, 20]),
        ("Tie-breaking scenario", [True, False, True, False],
         [5, 5, 5, 5], [3, 3, 3, 3], [10, 10, 10, 10]),
        ("Interest-only signal", [True, True, False, False],
         [10, 8, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]),
        ("Friends-only signal", [True, True, False, False],
         [0, 0, 0, 0], [8, 6, 0, 0], [0, 0, 0, 0]),
        ("University-only signal", [True, False, True, False],
         [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]),
        ("Activity-only signal", [True, True, False, False],
         [0, 0, 0, 0], [0, 0, 0, 0], [30, 25, 5, 2]),
        ("Mixed strong signals", [True, True, False, True, False],
         [9, 7, 1, 6, 0], [6, 4, 0, 3, 0], [15, 12, 20, 10, 5]),
        ("Sparse data scenario", [True, False, False, False, False, False, False, True],
         [3, 0, 0, 0, 0, 0, 0, 2], [1, 0, 0, 0, 0, 0, 0, 1], [5, 1, 1, 1, 1, 1, 1, 4]),
    ]

    for scenario_name, relevant_mask, interests, friends, activities in edge_cases:
        user = MockUser(university_id=uni_a)
        communities = [
            MockCommunity(
                name=f"EC_{len(scenarios)}_{j}",
                university_id=uni_a if relevant_mask[j] else uni_b,
                interest_score=interests[j], friend_count=friends[j],
                recent_activity=activities[j], relevant=relevant_mask[j],
            )
            for j in range(len(relevant_mask))
        ]
        scenarios.append({"name": scenario_name, "user": user, "communities": communities})

    return scenarios


def evaluate_scenario(scenario: dict, k: int = 3) -> dict:
    """Score and rank communities, then compute metrics against ground truth."""
    user = scenario["user"]
    communities = scenario["communities"]

    max_interest = max((c.interest_score for c in communities), default=1) or 1
    max_friends = max((c.friend_count for c in communities), default=1) or 1
    max_activity = max((c.recent_activity for c in communities), default=1) or 1

    scored = []
    for c in communities:
        s = score_community(c, user, max_interest, max_friends, max_activity)
        scored.append((c, s))

    scored.sort(key=lambda x: -x[1])

    top_k = scored[:k]
    top_k_relevant = [c.relevant for c, _ in top_k]
    all_relevant_count = sum(1 for c in communities if c.relevant)

    # Precision@K
    precision = sum(top_k_relevant) / k if k > 0 else 0.0

    # Recall@K
    recall = sum(top_k_relevant) / all_relevant_count if all_relevant_count > 0 else 0.0

    # NDCG@K
    all_relevances = [c.relevant for c, _ in scored]
    ndcg = ndcg_at_k(all_relevances, k)

    # Mean Reciprocal Rank
    mrr = 0.0
    for i, (c, _) in enumerate(scored):
        if c.relevant:
            mrr = 1.0 / (i + 1)
            break

    return {
        "scenario": scenario["name"],
        "k": k,
        "precision_at_k": round(precision, 4),
        "recall_at_k": round(recall, 4),
        "ndcg_at_k": round(ndcg, 4),
        "mrr": round(mrr, 4),
        "total_communities": len(communities),
        "total_relevant": all_relevant_count,
        "ranking": [(c.name, round(s, 4), c.relevant) for c, s in scored],
    }


def run_evaluation() -> dict:
    """Run all scenarios and aggregate metrics."""
    scenarios = build_scenarios()
    k_values = [3, 5]

    results_by_k = {}
    all_scenario_results = []

    for k in k_values:
        scenario_results = []
        for scenario in scenarios:
            result = evaluate_scenario(scenario, k=min(k, len(scenario["communities"])))
            scenario_results.append(result)

        # Aggregate
        n = len(scenario_results)
        avg_precision = sum(r["precision_at_k"] for r in scenario_results) / n
        avg_recall = sum(r["recall_at_k"] for r in scenario_results) / n
        avg_ndcg = sum(r["ndcg_at_k"] for r in scenario_results) / n
        avg_mrr = sum(r["mrr"] for r in scenario_results) / n

        results_by_k[f"k={k}"] = {
            "avg_precision": round(avg_precision, 4),
            "avg_recall": round(avg_recall, 4),
            "avg_ndcg": round(avg_ndcg, 4),
            "avg_mrr": round(avg_mrr, 4),
            "num_scenarios": n,
        }

        if k == 3:
            all_scenario_results = scenario_results

    return {
        "dataset_size": len(scenarios),
        "metrics_by_k": results_by_k,
        "scenario_details": all_scenario_results,
    }


if __name__ == "__main__":
    results = run_evaluation()
    print("\nCommunity Recommendation Evaluation")
    print("=" * 55)
    for k_label, metrics in results["metrics_by_k"].items():
        print(f"\n{k_label}:")
        print(f"  Precision@K:  {metrics['avg_precision']:.4f}")
        print(f"  Recall@K:     {metrics['avg_recall']:.4f}")
        print(f"  NDCG@K:       {metrics['avg_ndcg']:.4f}")
        print(f"  MRR:          {metrics['avg_mrr']:.4f}")

    print(f"\nScenario details (K=3):")
    for r in results["scenario_details"]:
        status = "PASS" if r["precision_at_k"] >= 0.5 else "WARN"
        print(f"  [{status}] {r['scenario']:<40} P@3={r['precision_at_k']:.2f} R@3={r['recall_at_k']:.2f} NDCG={r['ndcg_at_k']:.2f}")
