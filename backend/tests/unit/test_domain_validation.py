"""Unit tests for app.services.domain_validation_service — pure functions."""

import pytest

from app.services.domain_validation_service import (
    extract_base_domain,
    is_student_subdomain,
    validate_university_email,
)


class TestValidateUniversityEmail:
    def test_valid_edu_domain(self):
        result = validate_university_email("student@stanford.edu")
        assert result.valid is True
        assert result.domain == "stanford.edu"

    def test_valid_edu_subdomain(self):
        result = validate_university_email("student@cs.stanford.edu")
        assert result.valid is True

    def test_valid_edu_tr(self):
        result = validate_university_email("student@metu.edu.tr")
        assert result.valid is True

    def test_valid_ac_uk(self):
        result = validate_university_email("student@oxford.ac.uk")
        assert result.valid is True

    def test_valid_stu_subdomain(self):
        result = validate_university_email("221201931@stu.rumeli.com.tr")
        assert result.valid is True

    def test_valid_ogr_subdomain(self):
        result = validate_university_email("student@ogr.itu.edu.tr")
        assert result.valid is True

    def test_valid_known_subdomain(self):
        result = validate_university_email("x@stu.rumeli.edu.tr")
        assert result.valid is True
        assert "known:" in (result.matched_pattern or "")

    def test_reject_gmail(self):
        result = validate_university_email("user@gmail.com")
        assert result.valid is False
        assert "generic" in result.reason.lower()

    def test_reject_hotmail(self):
        result = validate_university_email("user@hotmail.com")
        assert result.valid is False

    def test_reject_outlook(self):
        result = validate_university_email("user@outlook.com")
        assert result.valid is False

    def test_reject_yahoo(self):
        result = validate_university_email("user@yahoo.com")
        assert result.valid is False

    def test_reject_protonmail(self):
        result = validate_university_email("user@protonmail.com")
        assert result.valid is False

    def test_invalid_no_at(self):
        result = validate_university_email("noemail")
        assert result.valid is False
        assert result.reason == "Invalid email format"

    def test_invalid_empty_local(self):
        result = validate_university_email("@domain.edu")
        assert result.valid is False

    def test_invalid_empty_domain(self):
        result = validate_university_email("user@")
        assert result.valid is False

    def test_unknown_domain_rejected(self):
        result = validate_university_email("user@randomsite.com")
        assert result.valid is False
        assert "does not match" in result.reason

    def test_case_insensitive(self):
        result = validate_university_email("USER@MIT.EDU")
        assert result.valid is True
        assert result.domain == "mit.edu"

    def test_whitespace_stripped(self):
        result = validate_university_email("  user@mit.edu  ")
        assert result.valid is True

    def test_student_prefix_pattern(self):
        result = validate_university_email("s@student.uni.edu.tr")
        assert result.valid is True

    def test_ogrenci_prefix_pattern(self):
        result = validate_university_email("s@ogrenci.gazi.edu.tr")
        assert result.valid is True


class TestExtractBaseDomain:
    def test_stu_prefix_removed(self):
        assert extract_base_domain("x@stu.rumeli.com.tr") == "rumeli.com.tr"

    def test_student_prefix_removed(self):
        assert extract_base_domain("x@student.oxford.ac.uk") == "oxford.ac.uk"

    def test_ogr_prefix_removed(self):
        assert extract_base_domain("x@ogr.itu.edu.tr") == "itu.edu.tr"

    def test_mail_prefix_removed(self):
        assert extract_base_domain("x@mail.stanford.edu") == "stanford.edu"

    def test_no_prefix_unchanged(self):
        assert extract_base_domain("x@mit.edu") == "mit.edu"

    def test_long_domain_trimmed(self):
        assert extract_base_domain("x@a.b.c.stanford.edu") == "c.stanford.edu"

    def test_ogrenci_prefix(self):
        assert extract_base_domain("x@ogrenci.gazi.edu.tr") == "gazi.edu.tr"


class TestIsStudentSubdomain:
    def test_stu_prefix(self):
        assert is_student_subdomain("x@stu.rumeli.com.tr") is True

    def test_student_prefix(self):
        assert is_student_subdomain("x@student.mit.edu") is True

    def test_ogr_prefix(self):
        assert is_student_subdomain("x@ogr.itu.edu.tr") is True

    def test_ogrenci_prefix(self):
        assert is_student_subdomain("x@ogrenci.gazi.edu.tr") is True

    def test_no_student_prefix(self):
        assert is_student_subdomain("x@stanford.edu") is False

    def test_mail_prefix_not_student(self):
        assert is_student_subdomain("x@mail.stanford.edu") is False
