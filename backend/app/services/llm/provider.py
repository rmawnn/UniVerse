"""
LLM provider abstraction for post categorization.

Supports Gemini, OpenAI, and Claude via direct HTTP calls (httpx).
Falls back to a rule-based classifier when no API key is configured.

All providers include:
  - Retry with exponential backoff (up to 3 attempts)
  - Structured logging for every call
  - Timeout handling (10s per request)
"""

from __future__ import annotations

import asyncio
import logging
import time
from abc import ABC, abstractmethod

import httpx

logger = logging.getLogger(__name__)

MAX_RETRIES = 3
RETRY_BASE_DELAY = 1

VALID_CATEGORIES = {
    "academic", "research", "internship", "job",
    "housing", "event", "marketplace", "general",
}

SYSTEM_PROMPT = (
    "You are a post categorizer for a university social network. "
    "Classify the following post into exactly ONE category. "
    "Reply with ONLY the category name in lowercase, nothing else.\n\n"
    "Categories:\n"
    "- academic (coursework, study groups, grades, exams, lectures)\n"
    "- research (papers, lab work, thesis, research opportunities)\n"
    "- internship (internship openings, internship experiences)\n"
    "- job (full-time/part-time job offers, career opportunities)\n"
    "- housing (roommates, apartments, dorms, subletting)\n"
    "- event (meetups, workshops, parties, campus events, hackathons)\n"
    "- marketplace (buying, selling, trading items)\n"
    "- general (anything that doesn't fit the above)\n"
)


class LLMProvider(ABC):
    """Base class for LLM providers."""

    @abstractmethod
    async def classify(self, content: str) -> str:
        """Classify post content. Returns a category string."""

    def _validate_category(self, raw: str) -> str:
        cleaned = raw.strip().lower().split("\n")[0].strip(".- \"'`")
        if cleaned in VALID_CATEGORIES:
            return cleaned
        for cat in VALID_CATEGORIES:
            if cat in cleaned:
                return cat
        return "general"

    async def _retry_request(self, provider_name: str, request_fn) -> str:
        """Execute request_fn with retry and structured logging."""
        last_error: Exception | None = None
        for attempt in range(1, MAX_RETRIES + 1):
            start = time.monotonic()
            try:
                raw_text = await request_fn()
                elapsed = (time.monotonic() - start) * 1000
                category = self._validate_category(raw_text)
                logger.info(
                    "llm.classify provider=%s category=%s latency_ms=%.0f raw=%r",
                    provider_name, category, elapsed, raw_text.strip()[:30],
                )
                return category
            except (httpx.TimeoutException, httpx.ConnectError, httpx.HTTPStatusError) as exc:
                elapsed = (time.monotonic() - start) * 1000
                last_error = exc
                if attempt < MAX_RETRIES:
                    delay = RETRY_BASE_DELAY * (2 ** (attempt - 1))
                    logger.warning(
                        "llm.classify provider=%s attempt=%d/%d error=%s latency_ms=%.0f retrying_in=%ds",
                        provider_name, attempt, MAX_RETRIES, exc, elapsed, delay,
                    )
                    await asyncio.sleep(delay)
                else:
                    logger.error(
                        "llm.classify provider=%s failed after %d attempts error=%s latency_ms=%.0f",
                        provider_name, MAX_RETRIES, exc, elapsed,
                    )
        raise last_error  # type: ignore[misc]


class GeminiProvider(LLMProvider):
    def __init__(self, api_key: str):
        self._api_key = api_key

    async def classify(self, content: str) -> str:
        async def _request() -> str:
            url = (
                "https://generativelanguage.googleapis.com/v1beta/models/"
                "gemini-2.0-flash:generateContent"
            )
            payload = {
                "contents": [{"parts": [{"text": f"{SYSTEM_PROMPT}\nPost: {content}"}]}],
                "generationConfig": {"maxOutputTokens": 10, "temperature": 0.0},
            }
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    url, json=payload, params={"key": self._api_key},
                )
                resp.raise_for_status()
                data = resp.json()
                return data["candidates"][0]["content"]["parts"][0]["text"]

        return await self._retry_request("gemini", _request)


class OpenAIProvider(LLMProvider):
    def __init__(self, api_key: str):
        self._api_key = api_key

    async def classify(self, content: str) -> str:
        async def _request() -> str:
            url = "https://api.openai.com/v1/chat/completions"
            payload = {
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": content},
                ],
                "max_tokens": 10,
                "temperature": 0.0,
            }
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    url, json=payload,
                    headers={"Authorization": f"Bearer {self._api_key}"},
                )
                resp.raise_for_status()
                data = resp.json()
                return data["choices"][0]["message"]["content"]

        return await self._retry_request("openai", _request)


class ClaudeProvider(LLMProvider):
    def __init__(self, api_key: str):
        self._api_key = api_key

    async def classify(self, content: str) -> str:
        async def _request() -> str:
            url = "https://api.anthropic.com/v1/messages"
            payload = {
                "model": "claude-haiku-4-5-20251001",
                "max_tokens": 10,
                "system": SYSTEM_PROMPT,
                "messages": [{"role": "user", "content": content}],
            }
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    url, json=payload,
                    headers={
                        "x-api-key": self._api_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                )
                resp.raise_for_status()
                data = resp.json()
                return data["content"][0]["text"]

        return await self._retry_request("claude", _request)


class RuleBasedProvider(LLMProvider):
    """Keyword-based fallback when no LLM API key is configured."""

    _RULES: list[tuple[str, list[str]]] = [
        ("academic", [
            "exam", "homework", "lecture", "course", "class", "grade",
            "study", "midterm", "final", "professor", "syllabus", "gpa",
            "assignment", "tutorial", "quiz", "semester", "credit",
        ]),
        ("research", [
            "research", "paper", "thesis", "lab", "publication", "journal",
            "conference", "phd", "dissertation", "experiment", "citation",
        ]),
        ("internship", [
            "internship", "intern", "summer program", "co-op", "trainee",
        ]),
        ("job", [
            "hiring", "job", "career", "full-time", "part-time", "salary",
            "resume", "cv", "apply", "position", "opening", "vacancy",
            "freelance", "remote work", "work from home",
        ]),
        ("housing", [
            "apartment", "room", "roommate", "rent", "lease", "sublet",
            "dorm", "housing", "move in", "move out", "landlord", "tenant",
        ]),
        ("event", [
            "event", "meetup", "workshop", "hackathon", "party", "concert",
            "seminar", "webinar", "social", "festival", "club meeting",
            "networking", "talk", "guest speaker",
        ]),
        ("marketplace", [
            "selling", "buying", "for sale", "trade", "price", "discount",
            "textbook", "laptop", "furniture", "free stuff", "giveaway",
        ]),
    ]

    async def classify(self, content: str) -> str:
        text_lower = content.lower()
        scores: dict[str, int] = {}
        for category, keywords in self._RULES:
            score = sum(1 for kw in keywords if kw in text_lower)
            if score > 0:
                scores[category] = score
        if not scores:
            return "general"
        return max(scores, key=scores.get)  # type: ignore[arg-type]


_cached_provider: LLMProvider | None = None


def get_llm_provider() -> LLMProvider:
    """Return the configured LLM provider (cached singleton)."""
    global _cached_provider
    if _cached_provider is not None:
        return _cached_provider

    from app.core.config import settings

    provider_name = getattr(settings, "LLM_PROVIDER", "").lower()

    if provider_name == "gemini" and getattr(settings, "GOOGLE_AI_API_KEY", ""):
        _cached_provider = GeminiProvider(settings.GOOGLE_AI_API_KEY)
        logger.info("LLM provider: Gemini")
    elif provider_name == "openai" and getattr(settings, "OPENAI_API_KEY", ""):
        _cached_provider = OpenAIProvider(settings.OPENAI_API_KEY)
        logger.info("LLM provider: OpenAI")
    elif provider_name == "claude" and getattr(settings, "ANTHROPIC_API_KEY", ""):
        _cached_provider = ClaudeProvider(settings.ANTHROPIC_API_KEY)
        logger.info("LLM provider: Claude")
    else:
        _cached_provider = RuleBasedProvider()
        logger.info("LLM provider: Rule-based (no API key configured)")

    return _cached_provider
