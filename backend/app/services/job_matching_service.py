"""
AI Job Matching Service.

Computes a 0–100 match score between a student and a job posting using
four weighted signals extracted from real user and job data:

  Skill Overlap       (0.40) — keywords in the user's bio/department that
      appear in the job title + description.
  Keyword Overlap     (0.25) — intersection of extracted keywords from the
      user's interaction history (liked/saved/commented post text) and the
      job description.
  Community Relevance (0.20) — whether any of the user's communities share
      topical keywords with the job.
  University Match    (0.15) — whether the job poster is at the same
      university as the student.

Each signal produces a 0.0–1.0 sub-score.  The final score is
round(weighted_sum * 100) clamped to [0, 100].

Additionally, the service extracts *strengths* (matching skills) and
*missing_skills* (job-mentioned skills not found in the user's profile).
"""

import logging
import re
from collections import Counter
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.comment import Comment
from app.models.community import Community, CommunityMember
from app.models.job_post import JobPost
from app.models.post import Post
from app.models.post_like import PostLike
from app.models.saved_post import SavedPost
from app.models.user import User

logger = logging.getLogger(__name__)

WEIGHT_SKILL = 0.40
WEIGHT_KEYWORD = 0.25
WEIGHT_COMMUNITY = 0.20
WEIGHT_UNIVERSITY = 0.15

# Common technical skills / keywords to detect (lowercase).
# Kept intentionally broad — the algorithm works even without a perfect list
# because it also does raw keyword overlap.
KNOWN_SKILLS: set[str] = {
    # Programming languages
    "python", "java", "javascript", "typescript", "c++", "c#", "go", "rust",
    "swift", "kotlin", "ruby", "php", "scala", "r", "matlab", "dart", "lua",
    # Web / frontend
    "react", "angular", "vue", "nextjs", "next.js", "svelte", "html", "css",
    "tailwind", "bootstrap", "sass", "webpack", "vite",
    # Backend / frameworks
    "node", "nodejs", "node.js", "express", "fastapi", "django", "flask",
    "spring", "rails", "laravel", "asp.net", ".net",
    # Data / ML
    "sql", "nosql", "postgresql", "postgres", "mysql", "mongodb", "redis",
    "elasticsearch", "pandas", "numpy", "tensorflow", "pytorch", "keras",
    "scikit-learn", "spark", "hadoop", "tableau", "power bi",
    # DevOps / Cloud
    "docker", "kubernetes", "aws", "azure", "gcp", "terraform", "ansible",
    "jenkins", "github actions", "ci/cd", "linux", "nginx",
    # Mobile
    "react native", "flutter", "ios", "android", "swiftui", "jetpack compose",
    # Tools / concepts
    "git", "graphql", "rest", "api", "microservices", "agile", "scrum",
    "figma", "photoshop", "illustrator", "ux", "ui",
    # Data science
    "machine learning", "deep learning", "nlp", "computer vision", "ai",
    "data science", "data analysis", "data engineering", "statistics",
}

# Stopwords to exclude from keyword extraction
_STOPWORDS: set[str] = {
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "shall",
    "should", "may", "might", "must", "can", "could", "about", "above",
    "after", "again", "all", "also", "and", "any", "at", "but", "by",
    "for", "from", "how", "if", "in", "into", "it", "its", "just", "more",
    "most", "new", "no", "nor", "not", "now", "of", "on", "or", "other",
    "our", "out", "over", "own", "per", "so", "some", "such", "than",
    "that", "then", "their", "them", "there", "these", "they", "this",
    "through", "to", "too", "under", "up", "very", "what", "when", "where",
    "which", "while", "who", "whom", "why", "with", "you", "your",
    "we", "us", "he", "she", "his", "her", "my", "me", "i",
}


def _tokenize(text: str) -> list[str]:
    """Split text into lowercase tokens, stripping punctuation."""
    return re.findall(r"[a-z0-9#+.]+", text.lower())


def _extract_keywords(text: str) -> set[str]:
    """Extract meaningful keywords from text, removing stopwords."""
    tokens = _tokenize(text)
    return {t for t in tokens if t not in _STOPWORDS and len(t) > 1}


def _extract_skills(text: str) -> set[str]:
    """Extract recognized skill names from text using word-boundary matching."""
    text_lower = text.lower()
    found: set[str] = set()
    for skill in KNOWN_SKILLS:
        pattern = r"\b" + re.escape(skill) + r"\b"
        if re.search(pattern, text_lower):
            found.add(skill)
    return found


async def compute_job_match(
    db: AsyncSession,
    user: User,
    job_id: UUID,
) -> dict:
    """
    Compute a match score between *user* and the job with *job_id*.

    Returns:
        {
            "score": int (0–100),
            "strengths": list[str],
            "missing_skills": list[str],
            "factors": {signal: float, ...},
        }
    """
    user_id = user.id

    # ── 1. Fetch the job ────────────────────────────────────────

    job_q = select(JobPost).where(JobPost.id == job_id)
    result = await db.execute(job_q)
    job = result.scalar_one_or_none()

    if job is None:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    # ── 2. Build job profile ────────────────────────────────────

    job_text = f"{job.title} {job.description}"
    job_keywords = _extract_keywords(job_text)
    job_skills = _extract_skills(job_text)

    # ── 3. Build user profile ───────────────────────────────────

    # User's own text: bio + department
    user_text_parts: list[str] = []
    if user.bio:
        user_text_parts.append(user.bio)
    if user.department:
        user_text_parts.append(user.department)
    if user.full_name:
        user_text_parts.append(user.full_name)

    user_bio_text = " ".join(user_text_parts)
    user_skills = _extract_skills(user_bio_text)
    user_bio_keywords = _extract_keywords(user_bio_text)

    # ── 4. Gather user interaction keywords ─────────────────────

    # Posts the user has liked
    liked_content_q = (
        select(Post.content)
        .join(PostLike, PostLike.post_id == Post.id)
        .where(PostLike.user_id == user_id, Post.is_deleted.is_(False))
    )
    liked_rows = (await db.execute(liked_content_q)).scalars().all()

    # Posts the user has saved
    saved_content_q = (
        select(Post.content)
        .join(SavedPost, SavedPost.post_id == Post.id)
        .where(SavedPost.user_id == user_id, Post.is_deleted.is_(False))
    )
    saved_rows = (await db.execute(saved_content_q)).scalars().all()

    # Posts the user has commented on
    commented_content_q = (
        select(Post.content)
        .join(Comment, Comment.post_id == Post.id)
        .where(Comment.author_id == user_id, Comment.is_deleted.is_(False), Post.is_deleted.is_(False))
    )
    commented_rows = (await db.execute(commented_content_q)).scalars().all()

    # Combine interaction text
    interaction_text = " ".join(liked_rows + saved_rows + commented_rows)
    interaction_keywords = _extract_keywords(interaction_text)
    interaction_skills = _extract_skills(interaction_text)

    # Merge all user skills
    all_user_skills = user_skills | interaction_skills
    all_user_keywords = user_bio_keywords | interaction_keywords

    # ── 5. Skill overlap score ──────────────────────────────────

    if job_skills:
        matching_skills = all_user_skills & job_skills
        skill_score = len(matching_skills) / len(job_skills)
    else:
        matching_skills = set()
        skill_score = 0.5  # neutral when job lists no specific skills

    # ── 6. Keyword overlap score ────────────────────────────────

    if job_keywords:
        keyword_overlap = all_user_keywords & job_keywords
        keyword_score = min(1.0, len(keyword_overlap) / max(len(job_keywords) * 0.15, 1))
    else:
        keyword_overlap = set()
        keyword_score = 0.0

    # ── 7. Community relevance ──────────────────────────────────

    # Get names and descriptions of user's communities
    community_q = (
        select(Community.name, Community.description)
        .join(CommunityMember, CommunityMember.community_id == Community.id)
        .where(
            CommunityMember.user_id == user_id,
            Community.is_deleted.is_(False),
        )
    )
    community_rows = (await db.execute(community_q)).all()

    community_text = " ".join(
        f"{row.name} {row.description or ''}" for row in community_rows
    )
    community_keywords = _extract_keywords(community_text)

    if job_keywords and community_keywords:
        community_overlap = community_keywords & job_keywords
        community_score = min(1.0, len(community_overlap) / max(len(job_keywords) * 0.1, 1))
    else:
        community_score = 0.0

    # ── 8. University match ─────────────────────────────────────

    if user.university_id:
        # Check if the job author is from the same university
        job_author_q = select(User.university_id).where(User.id == job.author_id)
        author_uni = (await db.execute(job_author_q)).scalar_one_or_none()
        uni_score = 1.0 if (author_uni and author_uni == user.university_id) else 0.0
    else:
        uni_score = 0.0

    # ── 9. Compute final score ──────────────────────────────────

    raw_score = (
        WEIGHT_SKILL * skill_score
        + WEIGHT_KEYWORD * keyword_score
        + WEIGHT_COMMUNITY * community_score
        + WEIGHT_UNIVERSITY * uni_score
    )

    final_score = max(0, min(100, round(raw_score * 100)))

    # ── 10. Build strengths and missing skills ──────────────────

    strengths = sorted(matching_skills)
    missing_skills = sorted(job_skills - all_user_skills)

    return {
        "score": final_score,
        "strengths": strengths,
        "missing_skills": missing_skills,
        "factors": {
            "skill_overlap": round(skill_score, 3),
            "keyword_overlap": round(keyword_score, 3),
            "community_relevance": round(community_score, 3),
            "university_match": round(uni_score, 3),
        },
    }
