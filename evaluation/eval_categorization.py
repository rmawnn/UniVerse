"""
Evaluation: LLM Post Categorization (Rule-Based Provider).

Measures classification accuracy, per-category precision/recall/F1,
and confusion matrix across a hand-labeled test set of 80 posts.
"""

import asyncio
import json
import sys
from pathlib import Path
from collections import defaultdict

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.services.llm.provider import RuleBasedProvider

VALID_CATEGORIES = [
    "academic", "research", "internship", "job",
    "housing", "event", "marketplace", "general",
]

TEST_POSTS = [
    # ── Academic (10) ──────────────────────────────────────────
    ("Can anyone share notes from today's CS 301 lecture?", "academic"),
    ("Study group for the calculus final — meet at library Tuesday at 3pm", "academic"),
    ("The homework deadline for PHYS 101 was extended to Friday!", "academic"),
    ("Need help understanding recursion in my algorithms class", "academic"),
    ("Professor just posted the midterm grades on Blackboard", "academic"),
    ("Anyone else struggling with the stats problem set? Question 5 is brutal", "academic"),
    ("Great lecture today on graph theory. Really clicked for me", "academic"),
    ("Looking for a tutor for organic chemistry. Will pay $30/hr", "academic"),
    ("The final exam schedule just got released. Check your portal", "academic"),
    ("Does anyone have the syllabus for ECON 101 this semester?", "academic"),

    # ── Research (10) ──────────────────────────────────────────
    ("Our lab published a new paper on transformer architectures in NeurIPS", "research"),
    ("Looking for undergrads to join our NLP research project this summer", "research"),
    ("PhD applications due next month — anyone want to review my statement?", "research"),
    ("We need participants for a psychology study. 30 min, $15 compensation", "research"),
    ("Just defended my thesis on reinforcement learning! What a journey", "research"),
    ("Presenting our findings at the IEEE conference next week", "research"),
    ("Need a literature review partner for my machine learning paper", "research"),
    ("The research lab is hiring student assistants for the biology experiment", "research"),
    ("Our lab's publication on quantum computing got accepted at AAAI", "research"),
    ("Seeking collaborators for a cross-disciplinary research project on climate modeling", "research"),

    # ── Internship (10) ────────────────────────────────────────
    ("Google is hiring summer interns for 2026! Apply before March 15", "internship"),
    ("Just got my internship offer from Microsoft! Happy to share tips", "internship"),
    ("Internship fair this Thursday in the student center. Big companies coming", "internship"),
    ("Any advice for the Amazon internship interview? What coding questions?", "internship"),
    ("Summer internship opportunities for CS students — compiled list inside", "internship"),
    ("Completed my internship at Meta. AMA about the experience", "internship"),
    ("Deloitte summer intern program applications are now open", "internship"),
    ("Looking for a spring internship in data science. Any leads?", "internship"),
    ("The career center is hosting an internship prep workshop tomorrow", "internship"),
    ("Apple's internship deadline is next week. Don't miss it!", "internship"),

    # ── Job (10) ───────────────────────────────────────────────
    ("We're hiring a full-time software engineer. Remote, $95k. DM for details", "job"),
    ("Just accepted a job offer at Stripe! So grateful for this community", "job"),
    ("Freelance web developer needed for a 3-month project. React + Node", "job"),
    ("Career fair next Wednesday. Google, Amazon, and Netflix will be there", "job"),
    ("Looking for full-time positions in data engineering. Any recommendations?", "job"),
    ("Our startup is hiring a backend developer. Competitive salary, equity", "job"),
    ("Part-time tutoring position available at the learning center. $20/hr", "job"),
    ("Graduated and job hunting. Anyone have leads for product manager roles?", "job"),
    ("Remote software engineer position at a fintech company. Apply now", "job"),
    ("The CS department is hiring a teaching assistant for next semester", "job"),

    # ── Housing (10) ───────────────────────────────────────────
    ("Room available in 3BR apartment near campus. $550/month, utilities included", "housing"),
    ("Looking for a roommate for next semester. Quiet, non-smoking preferred", "housing"),
    ("Subletting my studio apartment for the summer. Great location", "housing"),
    ("Anyone know good apartments near the engineering building? Budget $700", "housing"),
    ("Warning: avoid Oak Street apartments. Terrible landlord", "housing"),
    ("Moving out! Furniture for sale: desk, chair, bookshelf. DM me", "housing"),
    ("Looking for housing near campus for the fall semester", "housing"),
    ("Two rooms available in a shared house. Walking distance to campus", "housing"),
    ("Need someone to take over my lease starting January. $600/month", "housing"),
    ("Off-campus housing guide for incoming freshmen — check the linked doc", "housing"),

    # ── Event (10) ─────────────────────────────────────────────
    ("Hackathon this weekend! Free food, prizes, and swag. Register now", "event"),
    ("Guest speaker from Tesla talking about autonomous driving on Thursday", "event"),
    ("Annual campus festival is Saturday! Live music, food trucks, and games", "event"),
    ("Workshop: Introduction to Machine Learning. Free, all levels welcome", "event"),
    ("Networking mixer with alumni this Friday evening. Free pizza!", "event"),
    ("Club meeting tonight at 7pm in Room 301. Everyone welcome", "event"),
    ("TEDx event on campus next month. Call for speakers is open", "event"),
    ("Game night this Saturday at the student lounge. Board games and snacks", "event"),
    ("The debate club is hosting a public forum on AI ethics tomorrow", "event"),
    ("Charity run this Sunday morning. Sign up at the gym front desk", "event"),

    # ── Marketplace (10) ───────────────────────────────────────
    ("Selling my MacBook Pro 2024 — barely used, $1200. Pick up on campus", "marketplace"),
    ("Free textbooks to whoever picks them up first. DM me", "marketplace"),
    ("Looking to buy a used monitor. Budget: $150. Anyone selling?", "marketplace"),
    ("Calculus textbook for sale, 4th edition, $25. Great condition", "marketplace"),
    ("Trading my mechanical keyboard for a wireless one. Any takers?", "marketplace"),
    ("Garage sale this Saturday! Dorm furniture, electronics, clothes", "marketplace"),
    ("Selling concert tickets for next Friday. Face value, $80 each", "marketplace"),
    ("Used bicycle for sale. Good condition, $100 negotiable", "marketplace"),
    ("Looking for a cheap desk lamp. Anyone upgrading theirs?", "marketplace"),
    ("Selling my old gaming chair. Still comfortable, $75", "marketplace"),

    # ── General (10) ───────────────────────────────────────────
    ("Beautiful sunset from the library rooftop today!", "general"),
    ("The dining hall food has gotten so much worse this semester", "general"),
    ("Lost my AirPods somewhere near the gym. Please DM if found!", "general"),
    ("Happy Thanksgiving everyone! Enjoy the break", "general"),
    ("Campus WiFi is down again. Is it just me?", "general"),
    ("Shoutout to Professor Kim for being the best instructor ever", "general"),
    ("Just finished my first year of college. Any advice for sophomores?", "general"),
    ("The campus bookstore needs better hours. Closes way too early", "general"),
    ("Found a cat near the science building. Anyone missing one?", "general"),
    ("The new coffee shop on campus is actually really good", "general"),
]


def run_evaluation() -> dict:
    """Run categorization evaluation and return metrics."""
    provider = RuleBasedProvider()

    y_true = []
    y_pred = []
    examples = []

    for content, expected in TEST_POSTS:
        predicted = asyncio.run(provider.classify(content))
        y_true.append(expected)
        y_pred.append(predicted)
        examples.append({
            "content": content[:80],
            "expected": expected,
            "predicted": predicted,
            "correct": expected == predicted,
        })

    # Overall accuracy
    correct = sum(1 for t, p in zip(y_true, y_pred) if t == p)
    total = len(y_true)
    accuracy = correct / total

    # Per-category metrics
    per_category = {}
    for cat in VALID_CATEGORIES:
        tp = sum(1 for t, p in zip(y_true, y_pred) if t == cat and p == cat)
        fp = sum(1 for t, p in zip(y_true, y_pred) if t != cat and p == cat)
        fn = sum(1 for t, p in zip(y_true, y_pred) if t == cat and p != cat)

        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0

        per_category[cat] = {
            "precision": round(precision, 3),
            "recall": round(recall, 3),
            "f1": round(f1, 3),
            "support": sum(1 for t in y_true if t == cat),
        }

    # Confusion matrix
    confusion = defaultdict(lambda: defaultdict(int))
    for t, p in zip(y_true, y_pred):
        confusion[t][p] += 1

    # Misclassified examples
    errors = [ex for ex in examples if not ex["correct"]]

    return {
        "dataset_size": total,
        "accuracy": round(accuracy, 4),
        "correct": correct,
        "total": total,
        "per_category": per_category,
        "confusion_matrix": {k: dict(v) for k, v in confusion.items()},
        "errors": errors,
        "examples": examples[:5] + [ex for ex in examples if not ex["correct"]][:5],
    }


if __name__ == "__main__":
    results = run_evaluation()
    print(f"\nCategorization Accuracy: {results['accuracy']:.1%} ({results['correct']}/{results['total']})")
    print(f"\nPer-category metrics:")
    print(f"{'Category':<14} {'Precision':>9} {'Recall':>8} {'F1':>8} {'Support':>8}")
    print("-" * 50)
    for cat, m in results["per_category"].items():
        print(f"{cat:<14} {m['precision']:>9.3f} {m['recall']:>8.3f} {m['f1']:>8.3f} {m['support']:>8}")
    print(f"\nMisclassified ({len(results['errors'])}):")
    for ex in results["errors"]:
        print(f"  [{ex['expected']} -> {ex['predicted']}] {ex['content']}")
