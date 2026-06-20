from __future__ import annotations

from enum import Enum
from urllib.parse import quote_plus, urlparse, parse_qs, urlencode, urlunparse

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Environment(str, Enum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"


# Values that indicate SECRET_KEY hasn't been changed from the default.
# Compared case-insensitively and with whitespace stripped.
SECRET_KEY_PLACEHOLDERS: frozenset[str] = frozenset({
    "",
    "change-me",
    "change-me-in-production",
    "change-me-to-a-random-64-char-string",
    "dev-only-secret-key-change-in-production-abc123xyz",
    "secret",
    "supersecret",
})


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ── Application ──────────────────────────────────────────────
    APP_NAME: str = "UniVerse"
    APP_VERSION: str = "0.1.0"
    ENVIRONMENT: Environment = Environment.DEVELOPMENT
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"

    # ── Database ─────────────────────────────────────────────────
    # Option A — Set DATABASE_URL directly (e.g. from Supabase dashboard).
    #   Any standard prefix (postgres://, postgresql://, postgresql+psycopg://)
    #   is automatically normalised to postgresql+asyncpg://.
    #
    # Option B — Set individual DB_* fields (the URL is built for you).
    #   The password is auto-percent-encoded so special characters just work.
    #
    # When both are set, DATABASE_URL takes precedence.
    DATABASE_URL: str = ""
    DB_USER: str = "postgres"
    DB_PASSWORD: str = ""
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "universe_db"
    DB_SSLMODE: str = ""  # "require" for Supabase; auto-detected when empty
    DATABASE_POOL_SIZE: int = 5
    DATABASE_MAX_OVERFLOW: int = 10

    # ── Supabase ─────────────────────────────────────────────────
    # Required for Storage and Realtime features.
    # Get these from your Supabase project → Settings → API.
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""

    # Storage bucket names
    SUPABASE_BUCKET_AVATARS: str = "avatars"
    SUPABASE_BUCKET_POSTS: str = "posts"
    SUPABASE_BUCKET_VERIFICATION: str = "verification-docs"
    SUPABASE_BUCKET_ATTACHMENTS: str = "attachments"
    SUPABASE_BUCKET_RESUMES: str = "resumes"

    # ── Email ────────────────────────────────────────────────────
    # Provider: "resend", "sendgrid", or "smtp". Leave empty to disable
    # email sending (verification codes returned in API response for dev).
    EMAIL_PROVIDER: str = ""
    EMAIL_FROM: str = "UniVerse <noreply@universe.app>"
    RESEND_API_KEY: str = ""
    SENDGRID_API_KEY: str = ""
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""

    # ── JWT / Auth ───────────────────────────────────────────────
    SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── LLM (Post Categorization) ──────────────────────────────────
    # Provider: "gemini", "openai", "claude", or "" (rule-based fallback).
    LLM_PROVIDER: str = ""
    GOOGLE_AI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""

    # ── Frontend ─────────────────────────────────────────────────
    FRONTEND_URL: str = "http://localhost:3000"

    # ── CORS ─────────────────────────────────────────────────────
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    # ── Resolve DATABASE_URL ────────────────────────────────────

    @model_validator(mode="after")
    def _resolve_database_url(self) -> Settings:
        """
        Build or normalise DATABASE_URL.

        * If DATABASE_URL is set (env or .env), normalise the driver
          prefix to ``postgresql+asyncpg://`` and extract sslmode if
          present in the query string.
        * Otherwise, build the URL from the individual DB_* fields
          (DB_PASSWORD is required in this case).
        """
        if self.DATABASE_URL:
            url = self.DATABASE_URL

            # Normalise driver prefix → asyncpg
            for old_prefix in (
                "postgres://",
                "postgresql://",
                "postgresql+psycopg2://",
                "postgresql+psycopg://",
            ):
                if url.startswith(old_prefix):
                    url = "postgresql+asyncpg://" + url[len(old_prefix):]
                    break

            # Extract sslmode from query string (asyncpg uses connect_args)
            parsed = urlparse(url)
            params = parse_qs(parsed.query)
            if "sslmode" in params:
                if not self.DB_SSLMODE:
                    self.DB_SSLMODE = params["sslmode"][0]
                del params["sslmode"]
                url = urlunparse(parsed._replace(query=urlencode(params, doseq=True)))

            # Sync DB_HOST from the URL so SSL auto-detection still works
            if parsed.hostname:
                self.DB_HOST = parsed.hostname
            if parsed.port:
                self.DB_PORT = parsed.port

            self.DATABASE_URL = url
        else:
            # Build from individual fields
            if not self.DB_PASSWORD:
                raise ValueError(
                    "Either DATABASE_URL or DB_PASSWORD must be set. "
                    "Copy .env.example to .env and fill in the values."
                )
            encoded_password = quote_plus(self.DB_PASSWORD)
            self.DATABASE_URL = (
                f"postgresql+asyncpg://{self.DB_USER}:{encoded_password}"
                f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
            )
        return self

    # ── Derived helpers ──────────────────────────────────────────

    @property
    def requires_ssl(self) -> bool:
        """Whether the DB connection needs SSL (True for Supabase)."""
        if self.DB_SSLMODE == "require":
            return True
        if self.DB_SSLMODE == "disable":
            return False
        # Auto-detect: any non-localhost host → SSL
        return self.DB_HOST != "localhost" and not self.DB_HOST.startswith("127.")

    @property
    def supabase_configured(self) -> bool:
        """True when Supabase credentials are set (non-empty)."""
        return bool(self.SUPABASE_URL and self.SUPABASE_SERVICE_ROLE_KEY)

    # ── Validators ───────────────────────────────────────────────

    @field_validator("SECRET_KEY")
    @classmethod
    def secret_key_must_be_set(cls, v: str) -> str:
        if v.lower().strip() in SECRET_KEY_PLACEHOLDERS:
            import warnings
            warnings.warn(
                "SECRET_KEY is using a placeholder value. "
                "Set a strong random key before deploying.",
                stacklevel=2,
            )
        return v

    @model_validator(mode="after")
    def _validate_production_security(self) -> Settings:
        """
        Block startup with clear errors when critical config is missing
        in production or staging environments.

        In development, only emit warnings so local dev isn't blocked.
        """
        is_prod_like = self.ENVIRONMENT in (
            Environment.PRODUCTION,
            Environment.STAGING,
        )

        # ── SECRET_KEY must not be a placeholder ────────────────
        if self.SECRET_KEY.lower().strip() in SECRET_KEY_PLACEHOLDERS:
            if is_prod_like:
                raise ValueError(
                    f"FATAL: SECRET_KEY is a placeholder value "
                    f"(ENVIRONMENT={self.ENVIRONMENT.value}). "
                    f"Set a strong random key (64+ chars) before deploying. "
                    f"Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(64))\""
                )

        # ── SECRET_KEY minimum length in production ─────────────
        if is_prod_like and len(self.SECRET_KEY) < 32:
            raise ValueError(
                f"FATAL: SECRET_KEY is too short ({len(self.SECRET_KEY)} chars, "
                f"minimum 32 required in {self.ENVIRONMENT.value}). "
                f"Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(64))\""
            )

        # ── DATABASE_URL must be resolvable ─────────────────────
        if is_prod_like and not self.DATABASE_URL:
            raise ValueError(
                f"FATAL: DATABASE_URL is not set "
                f"(ENVIRONMENT={self.ENVIRONMENT.value}). "
                f"Set DATABASE_URL or DB_PASSWORD in your environment."
            )

        # ── SUPABASE_URL required in production ─────────────────
        if is_prod_like and not self.SUPABASE_URL:
            raise ValueError(
                f"FATAL: SUPABASE_URL is not set "
                f"(ENVIRONMENT={self.ENVIRONMENT.value}). "
                f"Supabase is required for file storage in production. "
                f"Get it from your Supabase project → Settings → API."
            )

        # ── DEBUG must be off in production ─────────────────────
        if self.ENVIRONMENT == Environment.PRODUCTION and self.DEBUG:
            raise ValueError(
                "FATAL: DEBUG=True is not allowed in production. "
                "Set DEBUG=False before deploying."
            )

        return self

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        """Accept both a JSON list and a comma-separated string from env."""
        if isinstance(v, str):
            if v.startswith("["):
                import json
                return json.loads(v)
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    # ── Derived helpers ──────────────────────────────────────────

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == Environment.PRODUCTION

    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == Environment.DEVELOPMENT

    @property
    def allow_debug_codes(self) -> bool:
        """Whether debug verification codes may be returned in API responses.

        Only True when BOTH conditions are met:
        - ENVIRONMENT is development (not staging, not production)
        - DEBUG is True

        This prevents accidental code leaks when running with
        ENVIRONMENT=development but DEBUG=False (e.g. local QA).
        """
        return self.is_development and self.DEBUG


settings = Settings()
