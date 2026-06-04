"""
Supabase Storage service with local-filesystem fallback.

When SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set the service uses
Supabase Storage (signed upload URLs, private buckets, public reads).

When they are NOT set (local dev without Supabase) it falls back to
writing files to the local ``uploads/`` directory and returning
server-relative URLs — exactly how the app worked before the migration.
"""

import hashlib
import logging
import secrets
import uuid
from pathlib import Path

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

# Local fallback directory (same location the old upload route used)
LOCAL_UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads"
LOCAL_VERIFICATION_DIR = Path(__file__).resolve().parents[2] / "verification_docs"


# ── Helper: content-type detection ─────────────────────────────

_EXT_MIME = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
}


def _guess_content_type(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    return _EXT_MIME.get(ext, "application/octet-stream")


def _safe_filename(original: str) -> str:
    """Generate a unique, safe filename preserving the original extension."""
    ext = Path(original).suffix.lower()
    return f"{uuid.uuid4().hex}{ext}"


# ── Supabase Storage client ────────────────────────────────────


class SupabaseStorageClient:
    """Thin async wrapper around the Supabase Storage REST API."""

    def __init__(self) -> None:
        self.base_url = settings.SUPABASE_URL.rstrip("/")
        self.storage_url = f"{self.base_url}/storage/v1"
        self.headers = {
            "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
        }

    # ── Bucket management ──────────────────────────────────

    async def ensure_bucket(self, bucket_id: str, *, public: bool = False) -> None:
        """Create a bucket if it doesn't exist."""
        async with httpx.AsyncClient() as client:
            # Check if bucket exists
            resp = await client.get(
                f"{self.storage_url}/bucket/{bucket_id}",
                headers=self.headers,
            )
            if resp.status_code == 200:
                return  # Already exists

            # Create it
            resp = await client.post(
                f"{self.storage_url}/bucket",
                headers=self.headers,
                json={
                    "id": bucket_id,
                    "name": bucket_id,
                    "public": public,
                    "file_size_limit": 10 * 1024 * 1024,  # 10 MB default
                },
            )
            if resp.status_code in (200, 201):
                logger.info("Created Supabase bucket: %s (public=%s)", bucket_id, public)
            else:
                logger.warning(
                    "Could not create bucket '%s': %s %s",
                    bucket_id, resp.status_code, resp.text,
                )

    # ── Upload ─────────────────────────────────────────────

    async def upload(
        self,
        bucket: str,
        path: str,
        data: bytes,
        content_type: str = "application/octet-stream",
        *,
        upsert: bool = False,
    ) -> str:
        """
        Upload a file and return its storage path (bucket/path).

        ``path`` is the object key inside the bucket, e.g.
        ``"user_abc123/avatar.jpg"``.
        """
        headers = {
            **self.headers,
            "Content-Type": content_type,
            "x-upsert": str(upsert).lower(),
        }
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.storage_url}/object/{bucket}/{path}",
                headers=headers,
                content=data,
            )
            resp.raise_for_status()
        return f"{bucket}/{path}"

    # ── Signed URL (private access) ────────────────────────

    async def create_signed_url(
        self, bucket: str, path: str, expires_in: int = 3600,
    ) -> str:
        """
        Generate a time-limited signed URL for private file access.
        ``expires_in`` is in seconds (default 1 hour).
        """
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.storage_url}/object/sign/{bucket}/{path}",
                headers=self.headers,
                json={"expiresIn": expires_in},
            )
            resp.raise_for_status()
            data = resp.json()
        signed_path = data.get("signedURL", "")
        return f"{self.base_url}/storage/v1{signed_path}"

    # ── Signed upload URL (client-side upload) ─────────────

    async def create_signed_upload_url(
        self, bucket: str, path: str,
    ) -> dict:
        """
        Generate a signed URL that allows a client to upload directly
        to Supabase Storage without the file going through FastAPI.

        Returns ``{"signed_url": ..., "path": ..., "token": ...}``.
        """
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.storage_url}/object/upload/sign/{bucket}/{path}",
                headers=self.headers,
            )
            resp.raise_for_status()
            data = resp.json()
        upload_url = f"{self.base_url}/storage/v1{data.get('url', '')}"
        return {
            "signed_url": upload_url,
            "path": path,
            "token": data.get("token", ""),
        }

    # ── Public URL (for public buckets) ────────────────────

    def public_url(self, bucket: str, path: str) -> str:
        """Return the public URL for a file in a public bucket."""
        return f"{self.base_url}/storage/v1/object/public/{bucket}/{path}"

    # ── Delete ─────────────────────────────────────────────

    async def delete(self, bucket: str, paths: list[str]) -> None:
        """Delete one or more objects from a bucket."""
        async with httpx.AsyncClient() as client:
            resp = await client.delete(
                f"{self.storage_url}/object/{bucket}",
                headers=self.headers,
                json={"prefixes": paths},
            )
            if resp.status_code not in (200, 204):
                logger.warning("Supabase delete failed: %s", resp.text)


# ── Singleton ──────────────────────────────────────────────────

_client: SupabaseStorageClient | None = None


def _get_client() -> SupabaseStorageClient:
    global _client
    if _client is None:
        _client = SupabaseStorageClient()
    return _client


# ── High-level API used by routes and services ─────────────────


async def initialize_buckets() -> None:
    """
    Create all required Supabase Storage buckets on startup.
    Called from the FastAPI lifespan handler.
    No-op when Supabase is not configured.
    """
    if not settings.supabase_configured:
        logger.info("Supabase not configured — using local filesystem storage")
        return

    client = _get_client()
    # Avatars and posts are public (profile images, post media)
    await client.ensure_bucket(settings.SUPABASE_BUCKET_AVATARS, public=True)
    await client.ensure_bucket(settings.SUPABASE_BUCKET_POSTS, public=True)
    # Verification docs, attachments, and resumes are private
    await client.ensure_bucket(settings.SUPABASE_BUCKET_VERIFICATION, public=False)
    await client.ensure_bucket(settings.SUPABASE_BUCKET_ATTACHMENTS, public=False)
    await client.ensure_bucket(settings.SUPABASE_BUCKET_RESUMES, public=False)
    logger.info("Supabase Storage buckets initialized")


async def upload_file(
    bucket: str,
    data: bytes,
    filename: str,
    *,
    folder: str = "",
    content_type: str | None = None,
) -> str:
    """
    Upload a file and return a URL.

    - With Supabase: uploads to the specified bucket, returns a public
      URL (for public buckets) or the storage path (for signed-URL
      buckets like verification-docs).
    - Without Supabase: writes to the local ``uploads/`` directory and
      returns ``/uploads/<filename>``.
    """
    ct = content_type or _guess_content_type(filename)
    safe_name = _safe_filename(filename)
    object_path = f"{folder}/{safe_name}" if folder else safe_name

    if settings.supabase_configured:
        client = _get_client()
        await client.upload(bucket, object_path, data, ct)

        # Public buckets get a direct URL; private buckets get the path
        # (caller uses get_signed_url when they need access)
        if bucket in (settings.SUPABASE_BUCKET_AVATARS, settings.SUPABASE_BUCKET_POSTS):
            return client.public_url(bucket, object_path)
        return f"{bucket}/{object_path}"
    else:
        # Local fallback
        LOCAL_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        dest = LOCAL_UPLOAD_DIR / safe_name
        dest.write_bytes(data)
        return f"/uploads/{safe_name}"


async def upload_verification_doc(
    data: bytes,
    filename: str,
    user_id: str,
) -> str:
    """
    Upload a verification document to the private verification bucket.
    Returns the storage path (not a public URL).
    """
    ct = _guess_content_type(filename)
    ext = Path(filename).suffix.lower()
    safe_name = f"{user_id}_{secrets.token_hex(8)}{ext}"
    bucket = settings.SUPABASE_BUCKET_VERIFICATION

    if settings.supabase_configured:
        client = _get_client()
        object_path = f"{user_id}/{safe_name}"
        await client.upload(bucket, object_path, data, ct)
        return f"{bucket}/{object_path}"
    else:
        LOCAL_VERIFICATION_DIR.mkdir(parents=True, exist_ok=True)
        dest = LOCAL_VERIFICATION_DIR / safe_name
        dest.write_bytes(data)
        return f"verification_docs/{safe_name}"


async def get_signed_url(storage_path: str, expires_in: int = 3600) -> str:
    """
    Get a time-limited signed URL for a private file.

    ``storage_path`` is ``"bucket/path/to/file.ext"``.
    For local storage, returns the path as-is (served by StaticFiles).
    """
    if not settings.supabase_configured:
        # Local fallback: if the path starts with "verification_docs/",
        # the route serves it via FileResponse directly, so just return path.
        return f"/{storage_path}"

    # Split "bucket/rest/of/path" into bucket and path
    parts = storage_path.split("/", 1)
    if len(parts) != 2:
        return storage_path
    bucket, path = parts

    client = _get_client()
    return await client.create_signed_url(bucket, path, expires_in)


async def create_upload_url(
    bucket: str,
    filename: str,
    folder: str = "",
) -> dict:
    """
    Generate a signed upload URL for direct client-to-Supabase upload.

    Returns ``{"signed_url": ..., "path": ..., "token": ..., "public_url": ...}``.
    Raises RuntimeError when Supabase is not configured.
    """
    if not settings.supabase_configured:
        raise RuntimeError(
            "Signed upload URLs require Supabase configuration. "
            "Use the /uploads/image endpoint instead."
        )

    safe_name = _safe_filename(filename)
    object_path = f"{folder}/{safe_name}" if folder else safe_name
    client = _get_client()
    result = await client.create_signed_upload_url(bucket, object_path)

    # Include the public URL for convenience (only meaningful for public buckets)
    result["public_url"] = client.public_url(bucket, object_path)
    return result
