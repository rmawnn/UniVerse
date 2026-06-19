"""Unit tests for app.services.job_matching_service — pure helper functions."""

import pytest

from app.services.job_matching_service import (
    KNOWN_SKILLS,
    WEIGHT_COMMUNITY,
    WEIGHT_KEYWORD,
    WEIGHT_SKILL,
    WEIGHT_UNIVERSITY,
    _extract_keywords,
    _extract_skills,
    _tokenize,
)


class TestTokenize:
    def test_basic_sentence(self):
        tokens = _tokenize("Hello World")
        assert tokens == ["hello", "world"]

    def test_strips_punctuation(self):
        tokens = _tokenize("Python, Java, and C++!")
        assert "python" in tokens
        assert "java" in tokens
        assert "c++" in tokens

    def test_preserves_hash_and_dot(self):
        tokens = _tokenize("C# and Node.js")
        assert "c#" in tokens
        assert "node.js" in tokens

    def test_empty_string(self):
        assert _tokenize("") == []

    def test_numbers_preserved(self):
        tokens = _tokenize("Python 3.12")
        assert "python" in tokens
        assert "3.12" in tokens

    def test_case_insensitive(self):
        tokens = _tokenize("REACT Angular VUE")
        assert tokens == ["react", "angular", "vue"]


class TestExtractKeywords:
    def test_removes_stopwords(self):
        keywords = _extract_keywords("The quick brown fox is very fast")
        assert "the" not in keywords
        assert "is" not in keywords
        assert "very" not in keywords
        assert "quick" in keywords
        assert "brown" in keywords
        assert "fox" in keywords
        assert "fast" in keywords

    def test_removes_single_char(self):
        keywords = _extract_keywords("a b c python")
        assert "a" not in keywords
        assert "b" not in keywords
        assert "python" in keywords

    def test_empty_string(self):
        assert _extract_keywords("") == set()

    def test_all_stopwords(self):
        keywords = _extract_keywords("the is a an of to")
        assert len(keywords) == 0

    def test_real_job_description(self):
        text = "Looking for a Python developer with React experience"
        keywords = _extract_keywords(text)
        assert "python" in keywords
        assert "developer" in keywords
        assert "react" in keywords
        assert "for" not in keywords


class TestExtractSkills:
    def test_finds_python(self):
        skills = _extract_skills("We need a Python developer")
        assert "python" in skills

    def test_finds_multiple_skills(self):
        skills = _extract_skills("Requirements: Python, React, Docker, PostgreSQL")
        assert "python" in skills
        assert "react" in skills
        assert "docker" in skills
        assert "postgresql" in skills

    def test_case_insensitive(self):
        skills = _extract_skills("PYTHON and REACT")
        assert "python" in skills
        assert "react" in skills

    def test_no_skills_found(self):
        skills = _extract_skills("Looking for a great team player")
        assert len(skills) == 0

    def test_multi_word_skills(self):
        skills = _extract_skills("Experience with machine learning and data science")
        assert "machine learning" in skills
        assert "data science" in skills

    def test_framework_names(self):
        skills = _extract_skills("FastAPI backend with Next.js frontend")
        assert "fastapi" in skills
        assert "next.js" in skills

    def test_empty_string(self):
        assert _extract_skills("") == set()

    def test_known_skills_set_populated(self):
        assert len(KNOWN_SKILLS) > 50
        assert "python" in KNOWN_SKILLS
        assert "react" in KNOWN_SKILLS
        assert "docker" in KNOWN_SKILLS


class TestWeights:
    def test_weights_sum_to_one(self):
        total = WEIGHT_SKILL + WEIGHT_KEYWORD + WEIGHT_COMMUNITY + WEIGHT_UNIVERSITY
        assert abs(total - 1.0) < 1e-9
