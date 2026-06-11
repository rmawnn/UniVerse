"""
Post categorization service.

Classifies post content into one of eight categories using the configured
LLM provider, then persists the result on the Post row.
"""

import logging
from uuid import UUID

from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.post import Post
from app.services.llm import get_llm_provider

logger = logging.getLogger(__name__)

VALID_CATEGORIES = (
    "academic", "research", "internship", "job",
    "housing", "event", "marketplace", "general",
)


async def categorize_post(db: AsyncSession, post_id: UUID, content: str) -> str:
    """
    Classify *content* via the LLM provider and update the post's category.
    Returns the predicted category string.
    """
    provider = get_llm_provider()

    try:
        category = await provider.classify(content)
    except Exception:
        logger.exception("LLM categorization failed for post %s — defaulting to general", post_id)
        category = "general"

    if category not in VALID_CATEGORIES:
        category = "general"

    await db.execute(
        update(Post).where(Post.id == post_id).values(category=category)
    )
    await db.flush()

    return category
