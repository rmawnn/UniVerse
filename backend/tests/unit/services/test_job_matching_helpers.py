"""Unit tests for job_matching_service pure helpers."""

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
    def test_simple(self):
        assert _tokenize("Hello World") == ["hello", "world"]

    def test_preserves_special(self):
        tokens = _tokenize("C++ and C#")
        assert "c++" in tokens
        assert "c#" in tokens

    def test_empty(self):
        assert _tokenize("") == []

    def test_numbers(self):
        assert "42" in _tokenize("answer is 42")


class TestExtractKeywords:
    def test_removes_stopwords(self):
        kw = _extract_keywords("the quick brown fox")
        assert "the" not in kw
        assert "quick" in kw
        assert "brown" in kw
        assert "fox" in kw

    def test_removes_single_char(self):
        kw = _extract_keywords("a I b cd")
        assert "a" not in kw
        assert "cd" in kw

    def test_empty(self):
        assert _extract_keywords("") == set()


class TestExtractSkills:
    def test_finds_python(self):
        skills = _extract_skills("We need a Python developer")
        assert "python" in skills

    def test_finds_multiple(self):
        skills = _extract_skills("Looking for React and Node.js experience with Docker")
        assert "react" in skills
        assert "docker" in skills

    def test_no_skills(self):
        skills = _extract_skills("Looking for a friendly person")
        assert len(skills) == 0

    def test_case_insensitive(self):
        skills = _extract_skills("JAVA and PYTHON are required")
        assert "java" in skills
        assert "python" in skills

    def test_known_skills_not_empty(self):
        assert len(KNOWN_SKILLS) > 50


class TestWeights:
    def test_sum_to_one(self):
        total = WEIGHT_SKILL + WEIGHT_KEYWORD + WEIGHT_COMMUNITY + WEIGHT_UNIVERSITY
        assert abs(total - 1.0) < 1e-9
