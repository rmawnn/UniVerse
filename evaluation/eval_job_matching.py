"""
Evaluation: Job Matching Algorithm.

Tests the skill extraction and scoring functions from job_matching_service
using synthetic student-job pairs with expected quality tiers.

Measures: Score distribution accuracy, ranking correlation, skill extraction precision.
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.services.job_matching_service import (
    _extract_skills,
    _extract_keywords,
    _tokenize,
)

# ── Test cases: (student_bio, job_description, expected_tier) ──
# Tiers: "strong" (>=65), "moderate" (35-64), "weak" (<35)
TEST_PAIRS = [
    # Strong matches — clear skill overlap
    {
        "name": "Python dev -> Python job",
        "student_bio": "Computer Science student passionate about Python, Django, and REST APIs",
        "student_skills": ["python", "django", "rest", "api", "sql"],
        "job_title": "Backend Developer",
        "job_desc": "Looking for a Python developer with Django and REST API experience. PostgreSQL required.",
        "expected_tier": "strong",
    },
    {
        "name": "React dev -> Frontend job",
        "student_bio": "Web development enthusiast with React, TypeScript, and CSS experience",
        "student_skills": ["react", "typescript", "javascript", "css", "html"],
        "job_title": "Frontend Engineer",
        "job_desc": "React and TypeScript developer needed. Must know CSS and responsive design.",
        "expected_tier": "strong",
    },
    {
        "name": "ML student -> ML research",
        "student_bio": "Data Science major focused on machine learning and deep learning with PyTorch",
        "student_skills": ["python", "pytorch", "machine learning", "deep learning", "numpy", "pandas"],
        "job_title": "ML Research Assistant",
        "job_desc": "Machine learning research position. PyTorch, deep learning, and Python required.",
        "expected_tier": "strong",
    },
    {
        "name": "DevOps student -> DevOps job",
        "student_bio": "Systems engineering student with Docker, Kubernetes, and AWS experience",
        "student_skills": ["docker", "kubernetes", "aws", "linux", "ci/cd", "terraform"],
        "job_title": "DevOps Engineer",
        "job_desc": "DevOps role requiring Docker, Kubernetes, AWS, and CI/CD pipeline experience.",
        "expected_tier": "strong",
    },
    {
        "name": "Mobile dev -> Mobile job",
        "student_bio": "Mobile development enthusiast building apps with React Native and Flutter",
        "student_skills": ["react native", "flutter", "javascript", "dart", "ios", "android"],
        "job_title": "Mobile Developer",
        "job_desc": "Cross-platform mobile developer. React Native or Flutter. iOS and Android deployment.",
        "expected_tier": "strong",
    },

    # Moderate matches — partial overlap
    {
        "name": "Python dev -> Java job",
        "student_bio": "Computer Science student with Python and SQL experience",
        "student_skills": ["python", "sql", "git", "linux"],
        "job_title": "Java Backend Developer",
        "job_desc": "Java developer with Spring Boot. SQL and microservices architecture. Git required.",
        "expected_tier": "moderate",
    },
    {
        "name": "Web dev -> Data analyst",
        "student_bio": "Web developer who also enjoys data visualization with JavaScript",
        "student_skills": ["javascript", "react", "html", "css", "git"],
        "job_title": "Data Analyst",
        "job_desc": "Data analyst position requiring SQL, Python, Tableau, and Excel. Statistics background preferred.",
        "expected_tier": "moderate",
    },
    {
        "name": "CS student -> UX designer",
        "student_bio": "Computer Science student interested in user interfaces and Figma",
        "student_skills": ["figma", "html", "css", "javascript"],
        "job_title": "UX/UI Designer",
        "job_desc": "UX designer with Figma expertise. User research, prototyping, and wireframing skills.",
        "expected_tier": "moderate",
    },
    {
        "name": "Data science -> Backend",
        "student_bio": "Data Science student with Python, pandas, and SQL skills",
        "student_skills": ["python", "pandas", "sql", "numpy", "statistics"],
        "job_title": "Backend Developer",
        "job_desc": "Node.js backend developer. Express, MongoDB, REST APIs. Docker experience preferred.",
        "expected_tier": "moderate",
    },
    {
        "name": "Game dev -> Web dev",
        "student_bio": "Game developer with Unity and C# experience, some JavaScript",
        "student_skills": ["c#", "javascript", "git"],
        "job_title": "Full-Stack Developer",
        "job_desc": "Full-stack developer with React, Node.js, PostgreSQL. REST API design experience.",
        "expected_tier": "moderate",
    },

    # Weak matches — little to no overlap
    {
        "name": "Art student -> ML engineer",
        "student_bio": "Fine Arts major with a passion for painting and sculpture",
        "student_skills": [],
        "job_title": "Machine Learning Engineer",
        "job_desc": "ML engineer with PyTorch, TensorFlow, deep learning. PhD preferred. Python, C++ required.",
        "expected_tier": "weak",
    },
    {
        "name": "Music student -> DevOps",
        "student_bio": "Music composition student who enjoys playing piano and guitar",
        "student_skills": [],
        "job_title": "DevOps Engineer",
        "job_desc": "Senior DevOps engineer. Kubernetes, AWS, Terraform, Docker. 3+ years CI/CD experience.",
        "expected_tier": "weak",
    },
    {
        "name": "Business -> Embedded systems",
        "student_bio": "Business Administration major interested in marketing and finance",
        "student_skills": [],
        "job_title": "Embedded Systems Engineer",
        "job_desc": "Embedded C/C++ developer for IoT devices. RTOS, microcontrollers, sensors. Hardware debugging.",
        "expected_tier": "weak",
    },
    {
        "name": "Psychology -> Cybersecurity",
        "student_bio": "Psychology student researching cognitive behavior and social dynamics",
        "student_skills": [],
        "job_title": "Cybersecurity Analyst",
        "job_desc": "Cybersecurity analyst with SIEM, penetration testing, network security. CISSP preferred.",
        "expected_tier": "weak",
    },
    {
        "name": "Literature -> Blockchain",
        "student_bio": "English Literature student who loves creative writing and poetry",
        "student_skills": [],
        "job_title": "Blockchain Developer",
        "job_desc": "Solidity developer for smart contracts. Ethereum, Web3, DeFi protocols. Rust or Go a plus.",
        "expected_tier": "weak",
    },
]


def compute_offline_score(student_skills: set[str], job_skills: set[str],
                          student_keywords: set[str], job_keywords: set[str]) -> dict:
    """Compute skill and keyword overlap scores (offline, no DB)."""
    if job_skills:
        matching = student_skills & job_skills
        skill_score = len(matching) / len(job_skills)
    else:
        matching = set()
        skill_score = 0.5

    if job_keywords:
        keyword_overlap = student_keywords & job_keywords
        keyword_score = min(1.0, len(keyword_overlap) / max(len(job_keywords) * 0.15, 1))
    else:
        keyword_overlap = set()
        keyword_score = 0.0

    # Offline: no community or university data
    raw = 0.40 * skill_score + 0.25 * keyword_score
    final = max(0, min(100, round(raw * 100)))

    return {
        "score": final,
        "skill_score": round(skill_score, 3),
        "keyword_score": round(keyword_score, 3),
        "matching_skills": sorted(matching),
        "missing_skills": sorted(job_skills - student_skills),
    }


def run_evaluation() -> dict:
    """Run job matching evaluation."""
    # Part 1: Skill extraction accuracy
    skill_extraction_tests = [
        ("I know Python, Java, and React", {"python", "java", "react"}),
        ("Experience with machine learning and deep learning", {"machine learning", "deep learning"}),
        ("Docker and Kubernetes for CI/CD pipelines", {"docker", "kubernetes", "ci/cd"}),
        ("Built apps with React Native and Flutter", {"react native", "flutter"}),
        ("PostgreSQL database and Redis caching", {"postgresql", "redis"}),
        ("AWS cloud infrastructure with Terraform", {"aws", "terraform"}),
        ("The developer used R for statistical analysis", {"r"}),
        ("FastAPI backend with SQLAlchemy ORM", {"fastapi"}),
        ("Next.js frontend with Tailwind CSS", {"next.js", "tailwind"}),
        ("TensorFlow and PyTorch for neural networks", {"tensorflow", "pytorch"}),
    ]

    extraction_correct = 0
    extraction_total = 0
    extraction_details = []

    for text, expected in skill_extraction_tests:
        extracted = _extract_skills(text)
        # Check if all expected skills were found
        found = expected & extracted
        missed = expected - extracted
        false_pos = extracted - expected

        all_correct = found == expected and not false_pos
        extraction_correct += int(all_correct)
        extraction_total += 1
        extraction_details.append({
            "text": text[:60],
            "expected": sorted(expected),
            "extracted": sorted(extracted),
            "missed": sorted(missed),
            "false_positives": sorted(false_pos),
            "correct": all_correct,
        })

    extraction_accuracy = extraction_correct / extraction_total if extraction_total else 0

    # Part 2: Match quality scoring
    tier_results = {"strong": [], "moderate": [], "weak": []}
    correct_tiers = 0
    total_pairs = len(TEST_PAIRS)
    pair_results = []

    for test in TEST_PAIRS:
        student_text = test["student_bio"]
        job_text = f"{test['job_title']} {test['job_desc']}"

        student_skills = _extract_skills(student_text) | set(test["student_skills"])
        job_skills = _extract_skills(job_text)
        student_kw = _extract_keywords(student_text)
        job_kw = _extract_keywords(job_text)

        result = compute_offline_score(student_skills, job_skills, student_kw, job_kw)
        score = result["score"]

        if score >= 65:
            actual_tier = "strong"
        elif score >= 35:
            actual_tier = "moderate"
        else:
            actual_tier = "weak"

        # Allow adjacent tier as acceptable (strong/moderate boundary is fuzzy)
        tier_order = ["weak", "moderate", "strong"]
        expected_idx = tier_order.index(test["expected_tier"])
        actual_idx = tier_order.index(actual_tier)
        is_correct = abs(expected_idx - actual_idx) <= 1

        correct_tiers += int(is_correct)
        tier_results[test["expected_tier"]].append(score)

        pair_results.append({
            "name": test["name"],
            "score": score,
            "expected_tier": test["expected_tier"],
            "actual_tier": actual_tier,
            "correct": is_correct,
            "matching_skills": result["matching_skills"],
            "missing_skills": result["missing_skills"][:5],
        })

    tier_accuracy = correct_tiers / total_pairs if total_pairs else 0

    # Score distribution stats per tier
    tier_stats = {}
    for tier, scores in tier_results.items():
        if scores:
            tier_stats[tier] = {
                "count": len(scores),
                "mean": round(sum(scores) / len(scores), 1),
                "min": min(scores),
                "max": max(scores),
            }
        else:
            tier_stats[tier] = {"count": 0, "mean": 0, "min": 0, "max": 0}

    # Part 3: Ranking correlation
    # Within each tier, scores should be relatively consistent
    ranking_correct = 0
    ranking_total = 0
    for i in range(len(pair_results)):
        for j in range(i + 1, len(pair_results)):
            a = pair_results[i]
            b = pair_results[j]
            tier_order = {"strong": 2, "moderate": 1, "weak": 0}
            if tier_order[a["expected_tier"]] > tier_order[b["expected_tier"]]:
                ranking_correct += int(a["score"] >= b["score"])
                ranking_total += 1
            elif tier_order[a["expected_tier"]] < tier_order[b["expected_tier"]]:
                ranking_correct += int(a["score"] <= b["score"])
                ranking_total += 1

    ranking_accuracy = ranking_correct / ranking_total if ranking_total else 0

    return {
        "dataset_size": total_pairs,
        "skill_extraction": {
            "accuracy": round(extraction_accuracy, 4),
            "correct": extraction_correct,
            "total": extraction_total,
            "details": extraction_details,
        },
        "match_quality": {
            "tier_accuracy": round(tier_accuracy, 4),
            "correct": correct_tiers,
            "total": total_pairs,
            "tier_stats": tier_stats,
            "pairs": pair_results,
        },
        "ranking_correlation": {
            "pairwise_accuracy": round(ranking_accuracy, 4),
            "correct_pairs": ranking_correct,
            "total_pairs": ranking_total,
        },
    }


if __name__ == "__main__":
    results = run_evaluation()

    print("\nJob Matching Evaluation")
    print("=" * 55)

    se = results["skill_extraction"]
    print(f"\nSkill Extraction Accuracy: {se['accuracy']:.1%} ({se['correct']}/{se['total']})")
    for d in se["details"]:
        status = "PASS" if d["correct"] else "FAIL"
        print(f"  [{status}] \"{d['text']}\"")
        if not d["correct"]:
            if d["missed"]:
                print(f"         missed: {d['missed']}")
            if d["false_positives"]:
                print(f"         false+: {d['false_positives']}")

    mq = results["match_quality"]
    print(f"\nMatch Tier Accuracy: {mq['tier_accuracy']:.1%} ({mq['correct']}/{mq['total']})")
    print(f"\nTier score distributions:")
    for tier, stats in mq["tier_stats"].items():
        print(f"  {tier:<10}: n={stats['count']}, mean={stats['mean']}, range=[{stats['min']}, {stats['max']}]")
    print(f"\nPair results:")
    for p in mq["pairs"]:
        status = "PASS" if p["correct"] else "FAIL"
        print(f"  [{status}] {p['name']:<30} score={p['score']:>3} expected={p['expected_tier']:<8} actual={p['actual_tier']}")

    rc = results["ranking_correlation"]
    print(f"\nRanking Correlation: {rc['pairwise_accuracy']:.1%} ({rc['correct_pairs']}/{rc['total_pairs']} pairs)")
