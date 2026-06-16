"""
AI Evaluation Pipeline — Unified Runner.

Runs all three evaluations and generates evaluation_report.md.

Usage:
    python run_all.py
"""

import json
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from eval_categorization import run_evaluation as eval_cat
from eval_community_rec import run_evaluation as eval_rec
from eval_job_matching import run_evaluation as eval_job


def generate_report(cat_results: dict, rec_results: dict, job_results: dict) -> str:
    """Generate a Markdown evaluation report."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")

    lines = []
    lines.append("# AI Evaluation Report")
    lines.append("")
    lines.append(f"**Generated:** {timestamp}")
    lines.append(f"**Project:** UniVerse V2 — AI Features Evaluation")
    lines.append("")

    # ── Executive Summary ──────────────────────────────────────
    lines.append("## Executive Summary")
    lines.append("")
    lines.append("| Feature | Primary Metric | Score |")
    lines.append("|---------|---------------|-------|")
    lines.append(f"| Post Categorization | Classification Accuracy | {cat_results['accuracy']:.1%} |")

    rec_p3 = rec_results["metrics_by_k"]["k=3"]["avg_precision"]
    lines.append(f"| Community Recommendation | Precision@3 | {rec_p3:.1%} |")

    job_tier = job_results["match_quality"]["tier_accuracy"]
    lines.append(f"| Job Matching | Tier Accuracy (±1) | {job_tier:.1%} |")
    lines.append("")

    # ── 1. Post Categorization ─────────────────────────────────
    lines.append("---")
    lines.append("")
    lines.append("## 1. LLM Post Categorization")
    lines.append("")
    lines.append("### Algorithm")
    lines.append("Rule-based keyword classifier with category-specific keyword dictionaries.")
    lines.append("Falls back to LLM (Gemini/OpenAI/Claude) when an API key is configured.")
    lines.append("")
    lines.append("### Dataset")
    lines.append(f"- **Size:** {cat_results['dataset_size']} hand-labeled test posts")
    lines.append("- **Categories:** 8 (academic, research, internship, job, housing, event, marketplace, general)")
    lines.append("- **Distribution:** 10 posts per category (balanced)")
    lines.append("")
    lines.append("### Metrics")
    lines.append("")
    lines.append(f"**Overall Accuracy: {cat_results['accuracy']:.1%}** ({cat_results['correct']}/{cat_results['total']})")
    lines.append("")
    lines.append("| Category | Precision | Recall | F1 | Support |")
    lines.append("|----------|-----------|--------|----|---------|")

    macro_p, macro_r, macro_f1 = 0, 0, 0
    n_cats = 0
    for cat, m in cat_results["per_category"].items():
        lines.append(f"| {cat} | {m['precision']:.3f} | {m['recall']:.3f} | {m['f1']:.3f} | {m['support']} |")
        if m["support"] > 0:
            macro_p += m["precision"]
            macro_r += m["recall"]
            macro_f1 += m["f1"]
            n_cats += 1

    if n_cats:
        macro_p /= n_cats
        macro_r /= n_cats
        macro_f1 /= n_cats
    lines.append(f"| **Macro avg** | **{macro_p:.3f}** | **{macro_r:.3f}** | **{macro_f1:.3f}** | **{cat_results['total']}** |")
    lines.append("")

    # Confusion matrix
    lines.append("### Confusion Matrix")
    lines.append("")
    cats = sorted(cat_results["confusion_matrix"].keys())
    header = "| Actual \\ Predicted | " + " | ".join(cats) + " |"
    lines.append(header)
    lines.append("|" + "|".join(["---"] * (len(cats) + 1)) + "|")
    for actual in cats:
        row = f"| **{actual}** |"
        for pred in cats:
            count = cat_results["confusion_matrix"].get(actual, {}).get(pred, 0)
            cell = f" **{count}** " if actual == pred else f" {count} "
            row += cell + "|"
        lines.append(row)
    lines.append("")

    # Misclassified examples
    errors = cat_results["errors"]
    if errors:
        lines.append("### Misclassified Examples")
        lines.append("")
        lines.append("| Post (truncated) | Expected | Predicted |")
        lines.append("|------------------|----------|-----------|")
        for ex in errors[:10]:
            content = ex["content"].replace("|", "\\|")
            lines.append(f"| {content} | {ex['expected']} | {ex['predicted']} |")
        lines.append("")

    # ── 2. Community Recommendation ────────────────────────────
    lines.append("---")
    lines.append("")
    lines.append("## 2. Community Recommendation")
    lines.append("")
    lines.append("### Algorithm")
    lines.append("Multi-signal weighted scoring with four factors:")
    lines.append("- Interest Similarity (0.35) — overlap with user's interaction history")
    lines.append("- University Match (0.25) — same university affiliation")
    lines.append("- Friend Presence (0.25) — followed users in the community")
    lines.append("- Activity Similarity (0.15) — recent community activity level")
    lines.append("")
    lines.append("### Dataset")
    lines.append(f"- **Size:** {rec_results['dataset_size']} synthetic scenarios")
    lines.append("- **Scenarios:** Varying user profiles (new users, active users, cross-university, edge cases)")
    lines.append("- **Communities per scenario:** 4–8 with ground-truth relevance labels")
    lines.append("")
    lines.append("### Metrics")
    lines.append("")
    lines.append("| Metric | K=3 | K=5 |")
    lines.append("|--------|-----|-----|")
    for metric_name, key in [("Precision@K", "avg_precision"), ("Recall@K", "avg_recall"),
                             ("NDCG@K", "avg_ndcg"), ("MRR", "avg_mrr")]:
        k3 = rec_results["metrics_by_k"]["k=3"][key]
        k5 = rec_results["metrics_by_k"]["k=5"][key]
        lines.append(f"| {metric_name} | {k3:.4f} | {k5:.4f} |")
    lines.append("")

    # Scenario details
    lines.append("### Scenario Results (K=3)")
    lines.append("")
    lines.append("| Scenario | P@3 | R@3 | NDCG@3 | MRR |")
    lines.append("|----------|-----|-----|--------|-----|")
    for r in rec_results["scenario_details"]:
        lines.append(
            f"| {r['scenario']} | {r['precision_at_k']:.2f} | "
            f"{r['recall_at_k']:.2f} | {r['ndcg_at_k']:.2f} | {r['mrr']:.2f} |"
        )
    lines.append("")

    # ── 3. Job Matching ────────────────────────────────────────
    lines.append("---")
    lines.append("")
    lines.append("## 3. Job Matching")
    lines.append("")
    lines.append("### Algorithm")
    lines.append("Multi-signal scoring (0–100) with four weighted factors:")
    lines.append("- Skill Overlap (0.40) — recognized skills in user bio vs job description")
    lines.append("- Keyword Overlap (0.25) — TF-IDF-like keyword intersection")
    lines.append("- Community Relevance (0.20) — topical overlap with user's communities")
    lines.append("- University Match (0.15) — same university as job poster")
    lines.append("")

    lines.append("### Dataset")
    lines.append(f"- **Size:** {job_results['dataset_size']} student-job test pairs")
    lines.append("- **Tiers:** 5 strong, 5 moderate, 5 weak matches")
    lines.append(f"- **Skill extraction tests:** {job_results['skill_extraction']['total']} test cases")
    lines.append("")

    lines.append("### Skill Extraction Accuracy")
    lines.append("")
    se = job_results["skill_extraction"]
    lines.append(f"**Accuracy: {se['accuracy']:.1%}** ({se['correct']}/{se['total']})")
    lines.append("")
    lines.append("| Text (truncated) | Expected | Extracted | Correct |")
    lines.append("|------------------|----------|-----------|---------|")
    for d in se["details"]:
        text = d["text"].replace("|", "\\|")
        exp = ", ".join(d["expected"][:3])
        ext = ", ".join(d["extracted"][:3])
        chk = "Yes" if d["correct"] else "No"
        lines.append(f"| {text} | {exp} | {ext} | {chk} |")
    lines.append("")

    lines.append("### Match Quality Score")
    lines.append("")
    mq = job_results["match_quality"]
    lines.append(f"**Tier Classification Accuracy: {mq['tier_accuracy']:.1%}** ({mq['correct']}/{mq['total']})")
    lines.append("")
    lines.append("Tolerance: actual tier within ±1 of expected (e.g., moderate classified as strong is acceptable).")
    lines.append("")

    lines.append("| Tier | Count | Mean Score | Min | Max |")
    lines.append("|------|-------|------------|-----|-----|")
    for tier in ["strong", "moderate", "weak"]:
        stats = mq["tier_stats"][tier]
        lines.append(f"| {tier} | {stats['count']} | {stats['mean']} | {stats['min']} | {stats['max']} |")
    lines.append("")

    lines.append("### Pair Results")
    lines.append("")
    lines.append("| Pair | Score | Expected | Actual | Match |")
    lines.append("|------|-------|----------|--------|-------|")
    for p in mq["pairs"]:
        chk = "Yes" if p["correct"] else "No"
        lines.append(f"| {p['name']} | {p['score']} | {p['expected_tier']} | {p['actual_tier']} | {chk} |")
    lines.append("")

    lines.append("### Ranking Correlation")
    lines.append("")
    rc = job_results["ranking_correlation"]
    lines.append(f"**Pairwise Ranking Accuracy: {rc['pairwise_accuracy']:.1%}** ({rc['correct_pairs']}/{rc['total_pairs']} pairs)")
    lines.append("")
    lines.append("Measures whether strong-match pairs consistently score higher than weak-match pairs.")
    lines.append("")

    # ── Limitations ────────────────────────────────────────────
    lines.append("---")
    lines.append("")
    lines.append("## Limitations")
    lines.append("")
    lines.append("1. **Offline evaluation only** — Community recommendation and job matching are evaluated using synthetic scenarios, not real user behavior. Live A/B testing with real users would provide more meaningful metrics.")
    lines.append("")
    lines.append("2. **Rule-based categorization** — The default classifier uses keyword matching, not an actual LLM. Accuracy will improve significantly with a real LLM provider (Gemini/OpenAI/Claude). The rule-based approach struggles with ambiguous or multi-topic posts.")
    lines.append("")
    lines.append("3. **Cold start problem** — Community recommendation performance degrades for new users with no interaction history. The algorithm falls back to university match and activity signals, which may not reflect true interests.")
    lines.append("")
    lines.append("4. **Skill dictionary coverage** — Job matching relies on a curated list of ~100 technical skills. Niche or emerging technologies may not be recognized, leading to underscored matches.")
    lines.append("")
    lines.append("5. **No temporal evaluation** — Recommendations don't account for how user interests change over time. A user who liked ML posts 6 months ago may have shifted to web development.")
    lines.append("")
    lines.append("6. **Balanced test sets** — Real-world category distribution is heavily skewed toward 'general'. The balanced test set may overestimate per-category performance for rare categories.")
    lines.append("")
    lines.append("7. **Score calibration** — Job matching scores are relative, not absolute. A score of 60 doesn't mean 60% probability of being hired — it reflects overlap with the detected signals.")
    lines.append("")

    return "\n".join(lines)


def main():
    print("=" * 60)
    print("  UniVerse AI Evaluation Pipeline")
    print("=" * 60)

    print("\n[1/3] Running Post Categorization evaluation...")
    cat_results = eval_cat()
    print(f"       Accuracy: {cat_results['accuracy']:.1%}")

    print("\n[2/3] Running Community Recommendation evaluation...")
    rec_results = eval_rec()
    p3 = rec_results["metrics_by_k"]["k=3"]["avg_precision"]
    print(f"       Precision@3: {p3:.4f}")

    print("\n[3/3] Running Job Matching evaluation...")
    job_results = eval_job()
    print(f"       Tier accuracy: {job_results['match_quality']['tier_accuracy']:.1%}")

    # Generate report
    report = generate_report(cat_results, rec_results, job_results)
    report_path = Path(__file__).parent / "evaluation_report.md"
    report_path.write_text(report, encoding="utf-8")
    print(f"\nReport saved to: {report_path}")

    # Save raw metrics as JSON
    metrics = {
        "categorization": cat_results,
        "community_recommendation": rec_results,
        "job_matching": job_results,
    }
    metrics_path = Path(__file__).parent / "metrics.json"
    metrics_path.write_text(json.dumps(metrics, indent=2, default=str), encoding="utf-8")
    print(f"Metrics saved to: {metrics_path}")

    print("\n" + "=" * 60)
    print("  EVALUATION COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    main()
