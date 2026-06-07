from __future__ import annotations

from enum import Enum
from urllib.parse import quote_plus, urlparse, parse_qs, urlencode, urlunparse

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Environment(str, Enum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"


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

    # ── JWT / Auth ───────────────────────────────────────────────
    SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

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
        if v in ("", "change-me-in-production", "change-me-to-a-random-64-char-string"):
            import warnings
            warnings.warn(
                "SECRET_KEY is using a placeholder value. "
                "Set a strong random key before deploying.",
                stacklevel=2,
            )
        return v

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


settings = Settings()
