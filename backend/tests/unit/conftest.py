"""
Shared fixtures for unit tests.

Unit tests do NOT require a running database. They mock all I/O.
"""

import os
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID, uuid4

import pytest

# Set environment BEFORE importing any app code
os.environ.update({
    "DATABASE_URL": "",
    "DB_USER": "postgres",
    "DB_PASSWORD": "postgres",
    "DB_HOST": "localhost",
    "DB_PORT": "5432",
    "DB_NAME": "universe_test_db",
    "DEBUG": "True",
    "ENVIRONMENT": "development",
    "SECRET_KEY": "test-secret-key-not-for-production-use-1234567890",
})


@pytest.fixture
def mock_db():
    """A mock AsyncSession for unit tests that don't touch the database."""
    session = AsyncMock()
    session.flush = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    session.execute = AsyncMock()
    session.add = MagicMock()
    return session


@pytest.fixture
def sample_user_id() -> UUID:
    return UUID("12345678-1234-1234-1234-123456789abc")


@pytest.fixture
def sample_user(sample_user_id):
    """A fake User object for service-level unit tests."""
    user = MagicMock()
    user.id = sample_user_id
    user.email = "student@testuni.edu"
    user.username = "testuser"
    user.full_name = "Test User"
    user.password_hash = "$2b$12$fakehash"
    user.university_id = UUID("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")
    user.department = "Computer Science"
    user.academic_year = "3"
    user.bio = "I love python and machine learning"
    user.profile_image_url = None
    user.cover_image_url = None
    user.is_active = True
    user.email_verified = True
    user.is_verified_student = True
    user.role = "student"
    user.notify_job_applications = True
    user.notify_new_jobs = True
    user.created_at = datetime(2024, 1, 1, tzinfo=timezone.utc)
    user.updated_at = datetime(2024, 6, 1, tzinfo=timezone.utc)
    return user
