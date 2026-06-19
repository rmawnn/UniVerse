"""Unit tests for app.core.config — Settings, environment helpers, CORS parsing."""

import pytest

from app.core.config import Environment, SECRET_KEY_PLACEHOLDERS, Settings


class TestEnvironmentEnum:
    def test_development(self):
        assert Environment.DEVELOPMENT.value == "development"

    def test_staging(self):
        assert Environment.STAGING.value == "staging"

    def test_production(self):
        assert Environment.PRODUCTION.value == "production"


class TestSecretKeyPlaceholders:
    def test_known_placeholders(self):
        assert "" in SECRET_KEY_PLACEHOLDERS
        assert "change-me" in SECRET_KEY_PLACEHOLDERS
        assert "secret" in SECRET_KEY_PLACEHOLDERS
        assert "supersecret" in SECRET_KEY_PLACEHOLDERS

    def test_real_key_not_placeholder(self):
        assert "a-real-secret-key-that-is-long-enough-1234567890abcdef" not in SECRET_KEY_PLACEHOLDERS


class TestSettingsHelpers:
    def _make_settings(self, **overrides):
        defaults = {
            "SECRET_KEY": "test-secret-key-not-for-production-use-1234567890",
            "DB_PASSWORD": "postgres",
            "DB_HOST": "localhost",
            "DB_PORT": "5432",
            "DB_NAME": "universe_test_db",
            "ENVIRONMENT": "development",
            "DEBUG": "True",
            "DATABASE_URL": "",
        }
        defaults.update(overrides)
        return Settings(**defaults)

    def test_is_development(self):
        s = self._make_settings(ENVIRONMENT="development")
        assert s.is_development is True
        assert s.is_production is False

    def test_is_production(self):
        s = self._make_settings(
            ENVIRONMENT="production",
            SECRET_KEY="a" * 64,
            SUPABASE_URL="https://supabase.co",
            SUPABASE_SERVICE_ROLE_KEY="key",
            DEBUG="False",
        )
        assert s.is_production is True
        assert s.is_development is False

    def test_allow_debug_codes_in_dev(self):
        s = self._make_settings(ENVIRONMENT="development", DEBUG="True")
        assert s.allow_debug_codes is True

    def test_no_debug_codes_when_debug_false(self):
        s = self._make_settings(ENVIRONMENT="development", DEBUG="False")
        assert s.allow_debug_codes is False

    def test_no_debug_codes_in_staging(self):
        s = self._make_settings(
            ENVIRONMENT="staging",
            SECRET_KEY="a" * 64,
            SUPABASE_URL="https://supabase.co",
            DEBUG="False",
        )
        assert s.allow_debug_codes is False

    def test_supabase_not_configured(self):
        s = self._make_settings(SUPABASE_URL="", SUPABASE_SERVICE_ROLE_KEY="")
        assert s.supabase_configured is False

    def test_supabase_configured(self):
        s = self._make_settings(
            SUPABASE_URL="https://x.supabase.co",
            SUPABASE_SERVICE_ROLE_KEY="key123",
        )
        assert s.supabase_configured is True

    def test_requires_ssl_localhost(self):
        s = self._make_settings(DB_HOST="localhost")
        assert s.requires_ssl is False

    def test_requires_ssl_remote(self):
        s = self._make_settings(
            DATABASE_URL="postgresql+asyncpg://user:pass@remote.db.com:5432/db"
        )
        assert s.requires_ssl is True

    def test_cors_origins_csv_parsing(self):
        s = self._make_settings(
            CORS_ORIGINS="http://localhost:3000,http://example.com"
        )
        assert len(s.CORS_ORIGINS) == 2
        assert "http://localhost:3000" in s.CORS_ORIGINS

    def test_cors_origins_json_parsing(self):
        s = self._make_settings(
            CORS_ORIGINS='["http://a.com","http://b.com"]'
        )
        assert len(s.CORS_ORIGINS) == 2

    def test_database_url_built_from_parts(self):
        s = self._make_settings(
            DATABASE_URL="",
            DB_USER="testuser",
            DB_PASSWORD="testpass",
            DB_HOST="localhost",
            DB_PORT="5432",
            DB_NAME="testdb",
        )
        assert "testuser" in s.DATABASE_URL
        assert "testdb" in s.DATABASE_URL
        assert s.DATABASE_URL.startswith("postgresql+asyncpg://")

    def test_database_url_normalizes_prefix(self):
        s = self._make_settings(
            DATABASE_URL="postgres://user:pass@host:5432/db"
        )
        assert s.DATABASE_URL.startswith("postgresql+asyncpg://")

    def test_production_rejects_placeholder_key(self):
        with pytest.raises(ValueError, match="FATAL"):
            self._make_settings(
                ENVIRONMENT="production",
                SECRET_KEY="change-me",
                SUPABASE_URL="https://x.co",
                DEBUG="False",
            )

    def test_production_rejects_short_key(self):
        with pytest.raises(ValueError, match="too short"):
            self._make_settings(
                ENVIRONMENT="production",
                SECRET_KEY="short",
                SUPABASE_URL="https://x.co",
                DEBUG="False",
            )

    def test_production_rejects_debug_true(self):
        with pytest.raises(ValueError, match="DEBUG=True"):
            self._make_settings(
                ENVIRONMENT="production",
                SECRET_KEY="a" * 64,
                SUPABASE_URL="https://x.co",
                DEBUG="True",
            )
