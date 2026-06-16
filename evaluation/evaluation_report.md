# AI Evaluation Report

**Generated:** 2026-06-11 23:43
**Project:** UniVerse V2 — AI Features Evaluation

## Executive Summary

| Feature | Primary Metric | Score |
|---------|---------------|-------|
| Post Categorization | Classification Accuracy | 76.2% |
| Community Recommendation | Precision@3 | 80.0% |
| Job Matching | Tier Accuracy (±1) | 100.0% |

---

## 1. LLM Post Categorization

### Algorithm
Rule-based keyword classifier with category-specific keyword dictionaries.
Falls back to LLM (Gemini/OpenAI/Claude) when an API key is configured.

### Dataset
- **Size:** 80 hand-labeled test posts
- **Categories:** 8 (academic, research, internship, job, housing, event, marketplace, general)
- **Distribution:** 10 posts per category (balanced)

### Metrics

**Overall Accuracy: 76.2%** (61/80)

| Category | Precision | Recall | F1 | Support |
|----------|-----------|--------|----|---------|
| academic | 0.615 | 0.800 | 0.696 | 10 |
| research | 0.900 | 0.900 | 0.900 | 10 |
| internship | 1.000 | 0.900 | 0.947 | 10 |
| job | 0.900 | 0.900 | 0.900 | 10 |
| housing | 0.700 | 0.700 | 0.700 | 10 |
| event | 0.857 | 0.600 | 0.706 | 10 |
| marketplace | 0.857 | 0.600 | 0.706 | 10 |
| general | 0.500 | 0.700 | 0.583 | 10 |
| **Macro avg** | **0.791** | **0.762** | **0.767** | **80** |

### Confusion Matrix

| Actual \ Predicted | academic | event | general | housing | internship | job | marketplace | research |
|---|---|---|---|---|---|---|---|---|
| **academic** | **8** | 0 | 2 | 0 | 0 | 0 | 0 | 0 |
| **event** | 0 | **6** | 3 | 1 | 0 | 0 | 0 | 0 |
| **general** | 2 | 0 | **7** | 1 | 0 | 0 | 0 | 0 |
| **housing** | 1 | 0 | 0 | **7** | 0 | 0 | 1 | 1 |
| **internship** | 0 | 0 | 0 | 0 | **9** | 1 | 0 | 0 |
| **job** | 1 | 0 | 0 | 0 | 0 | **9** | 0 | 0 |
| **marketplace** | 0 | 1 | 2 | 1 | 0 | 0 | **6** | 0 |
| **research** | 1 | 0 | 0 | 0 | 0 | 0 | 0 | **9** |

### Misclassified Examples

| Post (truncated) | Expected | Predicted |
|------------------|----------|-----------|
| Anyone else struggling with the stats problem set? Question 5 is brutal | academic | general |
| Looking for a tutor for organic chemistry. Will pay $30/hr | academic | general |
| We need participants for a psychology study. 30 min, $15 compensation | research | academic |
| Google is hiring summer interns for 2026! Apply before March 15 | internship | job |
| The CS department is hiring a teaching assistant for next semester | job | academic |
| Moving out! Furniture for sale: desk, chair, bookshelf. DM me | housing | marketplace |
| Looking for housing near campus for the fall semester | housing | academic |
| Two rooms available in a shared house. Walking distance to campus | housing | research |
| Club meeting tonight at 7pm in Room 301. Everyone welcome | event | housing |
| Game night this Saturday at the student lounge. Board games and snacks | event | general |

---

## 2. Community Recommendation

### Algorithm
Multi-signal weighted scoring with four factors:
- Interest Similarity (0.35) — overlap with user's interaction history
- University Match (0.25) — same university affiliation
- Friend Presence (0.25) — followed users in the community
- Activity Similarity (0.15) — recent community activity level

### Dataset
- **Size:** 20 synthetic scenarios
- **Scenarios:** Varying user profiles (new users, active users, cross-university, edge cases)
- **Communities per scenario:** 4–8 with ground-truth relevance labels

### Metrics

| Metric | K=3 | K=5 |
|--------|-----|-----|
| Precision@K | 0.8000 | 0.5375 |
| Recall@K | 0.9250 | 0.9500 |
| NDCG@K | 0.9500 | 0.9500 |
| MRR | 0.9500 | 0.9500 |

### Scenario Results (K=3)

| Scenario | P@3 | R@3 | NDCG@3 | MRR |
|----------|-----|-----|--------|-----|
| CS student, strong interest signals | 1.00 | 0.75 | 1.00 | 1.00 |
| New user (cold start) | 1.00 | 1.00 | 1.00 | 1.00 |
| User with friends, no interest history | 1.00 | 1.00 | 1.00 | 1.00 |
| Cross-university interest mix | 1.00 | 1.00 | 1.00 | 1.00 |
| High-activity noise vs relevant niche | 0.67 | 1.00 | 1.00 | 1.00 |
| Engineering student | 1.00 | 1.00 | 1.00 | 1.00 |
| Art/design student | 1.00 | 1.00 | 1.00 | 1.00 |
| Business major | 1.00 | 1.00 | 1.00 | 1.00 |
| Pre-med student | 1.00 | 1.00 | 1.00 | 1.00 |
| Music enthusiast | 1.00 | 1.00 | 1.00 | 1.00 |
| Single relevant community | 0.33 | 1.00 | 1.00 | 1.00 |
| All relevant communities | 1.00 | 0.75 | 1.00 | 1.00 |
| No relevant communities | 0.00 | 0.00 | 0.00 | 0.00 |
| Tie-breaking scenario | 0.67 | 1.00 | 1.00 | 1.00 |
| Interest-only signal | 0.67 | 1.00 | 1.00 | 1.00 |
| Friends-only signal | 0.67 | 1.00 | 1.00 | 1.00 |
| University-only signal | 0.67 | 1.00 | 1.00 | 1.00 |
| Activity-only signal | 0.67 | 1.00 | 1.00 | 1.00 |
| Mixed strong signals | 1.00 | 1.00 | 1.00 | 1.00 |
| Sparse data scenario | 0.67 | 1.00 | 1.00 | 1.00 |

---

## 3. Job Matching

### Algorithm
Multi-signal scoring (0–100) with four weighted factors:
- Skill Overlap (0.40) — recognized skills in user bio vs job description
- Keyword Overlap (0.25) — TF-IDF-like keyword intersection
- Community Relevance (0.20) — topical overlap with user's communities
- University Match (0.15) — same university as job poster

### Dataset
- **Size:** 15 student-job test pairs
- **Tiers:** 5 strong, 5 moderate, 5 weak matches
- **Skill extraction tests:** 10 test cases

### Skill Extraction Accuracy

**Accuracy: 80.0%** (8/10)

| Text (truncated) | Expected | Extracted | Correct |
|------------------|----------|-----------|---------|
| I know Python, Java, and React | java, python, react | java, python, react | Yes |
| Experience with machine learning and deep learning | deep learning, machine learning | deep learning, machine learning | Yes |
| Docker and Kubernetes for CI/CD pipelines | ci/cd, docker, kubernetes | ci/cd, docker, kubernetes | Yes |
| Built apps with React Native and Flutter | flutter, react native | flutter, react, react native | No |
| PostgreSQL database and Redis caching | postgresql, redis | postgresql, redis | Yes |
| AWS cloud infrastructure with Terraform | aws, terraform | aws, terraform | Yes |
| The developer used R for statistical analysis | r | r | Yes |
| FastAPI backend with SQLAlchemy ORM | fastapi | fastapi | Yes |
| Next.js frontend with Tailwind CSS | next.js, tailwind | css, next.js, tailwind | No |
| TensorFlow and PyTorch for neural networks | pytorch, tensorflow | pytorch, tensorflow | Yes |

### Match Quality Score

**Tier Classification Accuracy: 100.0%** (15/15)

Tolerance: actual tier within ±1 of expected (e.g., moderate classified as strong is acceptable).

| Tier | Count | Mean Score | Min | Max |
|------|-------|------------|-----|-----|
| strong | 5 | 63.4 | 57 | 65 |
| moderate | 5 | 20.6 | 0 | 38 |
| weak | 5 | 8.0 | 0 | 20 |

### Pair Results

| Pair | Score | Expected | Actual | Match |
|------|-------|----------|--------|-------|
| Python dev -> Python job | 57 | strong | moderate | Yes |
| React dev -> Frontend job | 65 | strong | strong | Yes |
| ML student -> ML research | 65 | strong | strong | Yes |
| DevOps student -> DevOps job | 65 | strong | strong | Yes |
| Mobile dev -> Mobile job | 65 | strong | strong | Yes |
| Python dev -> Java job | 33 | moderate | weak | Yes |
| Web dev -> Data analyst | 15 | moderate | weak | Yes |
| CS student -> UX designer | 38 | moderate | moderate | Yes |
| Data science -> Backend | 0 | moderate | weak | Yes |
| Game dev -> Web dev | 17 | moderate | weak | Yes |
| Art student -> ML engineer | 0 | weak | weak | Yes |
| Music student -> DevOps | 0 | weak | weak | Yes |
| Business -> Embedded systems | 20 | weak | weak | Yes |
| Psychology -> Cybersecurity | 20 | weak | weak | Yes |
| Literature -> Blockchain | 0 | weak | weak | Yes |

### Ranking Correlation

**Pairwise Ranking Accuracy: 92.0%** (69/75 pairs)

Measures whether strong-match pairs consistently score higher than weak-match pairs.

---

## Limitations

1. **Offline evaluation only** — Community recommendation and job matching are evaluated using synthetic scenarios, not real user behavior. Live A/B testing with real users would provide more meaningful metrics.

2. **Rule-based categorization** — The default classifier uses keyword matching, not an actual LLM. Accuracy will improve significantly with a real LLM provider (Gemini/OpenAI/Claude). The rule-based approach struggles with ambiguous or multi-topic posts.

3. **Cold start problem** — Community recommendation performance degrades for new users with no interaction history. The algorithm falls back to university match and activity signals, which may not reflect true interests.

4. **Skill dictionary coverage** — Job matching relies on a curated list of ~100 technical skills. Niche or emerging technologies may not be recognized, leading to underscored matches.

5. **No temporal evaluation** — Recommendations don't account for how user interests change over time. A user who liked ML posts 6 months ago may have shifted to web development.

6. **Balanced test sets** — Real-world category distribution is heavily skewed toward 'general'. The balanced test set may overestimate per-category performance for rare categories.

7. **Score calibration** — Job matching scores are relative, not absolute. A score of 60 doesn't mean 60% probability of being hired — it reflects overlap with the detected signals.
