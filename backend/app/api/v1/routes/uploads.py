import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, UploadFile, File, Query

from app.core.config import settings
from app.core.dependencies import get_current_user
from app.core.exceptions import BadRequest
from app.core.rate_limit import RateLimiter
from app.models.user import User
from app.services import storage_service

router = APIRouter()

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

# ── Magic bytes for file type validation ─────────────────────
_MAGIC_BYTES = {
    ".jpg": [b"\xff\xd8\xff"],
    ".jpeg": [b"\xff\xd8\xff"],
    ".png": [b"\x89PNG\r\n\x1a\n"],
    ".webp": [b"RIFF"],  # WebP starts with RIFF
    ".pdf": [b"%PDF"],
    ".mp4": [b"\x00\x00\x00", b"ftyp"],  # Either ISO BMFF or ftyp at offset 4
    ".webm": [b"\x1a\x45\xdf\xa3"],  # EBML header
}


def _validate_magic_bytes(data: bytes, ext: str) -> bool:
    """Verify file content matches the claimed extension via magic bytes."""
    signatures = _MAGIC_BYTES.get(ext.lower(), [])
    if not signatures:
        return True  # Unknown extension — skip check
    return any(data[:len(sig)] == sig for sig in signatures)
MAX_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB

VIDEO_ALLOWED_TYPES = {"video/mp4", "video/webm"}
VIDEO_ALLOWED_EXTENSIONS = {".mp4", ".webm"}
VIDEO_MAX_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB
VIDEO_MIN_SIZE_BYTES = 10 * 1024  # 10 KB


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    _rl=Depends(RateLimiter(max_calls=15, window_seconds=300, prefix="upload:image")),
):
    """Upload a single image file.

    With Supabase configured: uploads to the `posts` bucket.
    Without Supabase: saves to the local ``uploads/`` directory.

    Returns the URL for use in post image_url or profile_image_url.
    """
    # Validate content type
    if file.content_type not in ALLOWED_TYPES:
        raise BadRequest(
            f"Invalid file type '{file.content_type}'. "
            f"Allowed: jpg, png, webp"
        )

    # Validate extension
    original_name = file.filename or "upload.jpg"
    ext = Path(original_name).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise BadRequest(
            f"Invalid file extension '{ext}'. "
            f"Allowed: .jpg, .jpeg, .png, .webp"
        )

    # Read and validate size
    data = await file.read()
    if len(data) > MAX_SIZE_BYTES:
        raise BadRequest(
            f"File too large ({len(data) / 1024 / 1024:.1f} MB). "
            f"Maximum is 5 MB"
        )

    if len(data) == 0:
        raise BadRequest("File is empty")

    # Magic bytes validation — reject disguised files
    if not _validate_magic_bytes(data, ext):
        raise BadRequest("File content does not match the file extension")

    url = await storage_service.upload_file(
        bucket=settings.SUPABASE_BUCKET_POSTS,
        data=data,
        filename=original_name,
        folder=str(current_user.id),
    )

    return {"url": url}


@router.post("/video")
async def upload_video(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Upload a single short video file.

    Constraints: MP4 or WebM only, max 15 MB, min 10 KB.
    """
    if file.content_type not in VIDEO_ALLOWED_TYPES:
        raise BadRequest(
            f"Invalid file type '{file.content_type}'. Allowed: mp4, webm"
        )

    original_name = file.filename or "upload.mp4"
    ext = Path(original_name).suffix.lower()
    if ext not in VIDEO_ALLOWED_EXTENSIONS:
        raise BadRequest(
            f"Invalid file extension '{ext}'. Allowed: .mp4, .webm"
        )

    # Read in chunks to avoid holding oversized files in memory
    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = await file.read(1024 * 1024)
        if not chunk:
            break
        total += len(chunk)
        if total > VIDEO_MAX_SIZE_BYTES:
            raise BadRequest(
                f"File too large. Maximum is {VIDEO_MAX_SIZE_BYTES // (1024 * 1024)} MB"
            )
        chunks.append(chunk)

    data = b"".join(chunks)

    if len(data) < VIDEO_MIN_SIZE_BYTES:
        raise BadRequest("File is too small or empty — not a valid video")

    # Basic MP4 magic-byte check
    if ext == ".mp4" and data[:4] != b"\x00\x00\x00" and data[4:8] != b"ftyp":
        if data[:4] in (b"<htm", b"<!DO", b"{\n  ", b"PK\x03\x04"):
            raise BadRequest("File does not appear to be a valid video")

    url = await storage_service.upload_file(
        bucket=settings.SUPABASE_BUCKET_POSTS,
        data=data,
        filename=original_name,
        folder=f"{current_user.id}/videos",
    )

    return {"url": url}


@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Upload a user avatar image.

    With Supabase: uploads to the `avatars` bucket (public).
    Returns the public URL.
    """
    if file.content_type not in ALLOWED_TYPES:
        raise BadRequest(
            f"Invalid file type '{file.content_type}'. Allowed: jpg, png, webp"
        )

    original_name = file.filename or "avatar.jpg"
    ext = Path(original_name).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise BadRequest(f"Invalid extension '{ext}'.")

    data = await file.read()
    if len(data) > MAX_SIZE_BYTES:
        raise BadRequest("File too large. Maximum is 5 MB")
    if len(data) == 0:
        raise BadRequest("File is empty")

    url = await storage_service.upload_file(
        bucket=settings.SUPABASE_BUCKET_AVATARS,
        data=data,
        filename=original_name,
        folder=str(current_user.id),
    )

    return {"url": url}


@router.post("/resume")
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Upload a resume/CV (PDF only, max 5 MB)."""
    if file.content_type != "application/pdf":
        raise BadRequest("Only PDF files are accepted for resumes.")

    original_name = file.filename or "resume.pdf"
    ext = Path(original_name).suffix.lower()
    if ext != ".pdf":
        raise BadRequest("Only .pdf files accepted.")

    data = await file.read()
    if len(data) > MAX_SIZE_BYTES:
        raise BadRequest("File too large. Maximum is 5 MB")
    if len(data) == 0:
        raise BadRequest("File is empty")

    url = await storage_service.upload_file(
        bucket=settings.SUPABASE_BUCKET_RESUMES,
        data=data,
        filename=original_name,
        folder=str(current_user.id),
    )

    return {"url": url}


CV_ALLOWED_TYPES = {"application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}
CV_ALLOWED_EXTENSIONS = {".pdf", ".docx"}
CV_MAX_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


@router.post("/cv")
async def upload_cv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    _rl=Depends(RateLimiter(max_calls=10, window_seconds=300, prefix="upload:cv")),
):
    """Upload a CV / resume (PDF or DOCX, max 10 MB).

    Stored in the private ``resumes`` bucket. Returns the storage path
    which is attached to a job application record. Employers access the
    file via a time-limited signed URL.
    """
    original_name = file.filename or "cv.pdf"
    ext = Path(original_name).suffix.lower()

    # Validate extension
    if ext not in CV_ALLOWED_EXTENSIONS:
        raise BadRequest(
            f"Invalid file extension '{ext}'. Allowed: .pdf, .docx"
        )

    # Validate content type
    if file.content_type not in CV_ALLOWED_TYPES:
        # Some browsers send generic octet-stream — allow if extension is valid
        if file.content_type != "application/octet-stream":
            raise BadRequest(
                f"Invalid file type '{file.content_type}'. Allowed: PDF, DOCX"
            )

    # Read and validate size
    data = await file.read()
    if len(data) == 0:
        raise BadRequest("File is empty")
    if len(data) > CV_MAX_SIZE_BYTES:
        raise BadRequest(
            f"File too large ({len(data) / 1024 / 1024:.1f} MB). "
            f"Maximum is 10 MB"
        )

    # Magic bytes validation
    # PDF: starts with %PDF
    # DOCX: ZIP archive starting with PK\x03\x04
    if ext == ".pdf" and not data[:4].startswith(b"%PDF"):
        raise BadRequest("File content does not appear to be a valid PDF")
    if ext == ".docx" and data[:4] != b"PK\x03\x04":
        raise BadRequest("File content does not appear to be a valid DOCX")

    ct = "application/pdf" if ext == ".pdf" else (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )

    url = await storage_service.upload_file(
        bucket=settings.SUPABASE_BUCKET_RESUMES,
        data=data,
        filename=original_name,
        folder=str(current_user.id),
        content_type=ct,
    )

    return {"url": url, "filename": original_name, "size": len(data)}


@router.post("/signed-url")
async def get_signed_upload_url(
    bucket: str = Query(..., description="Target bucket name"),
    filename: str = Query(..., description="Original filename with extension"),
    folder: str = Query("", description="Optional folder prefix"),
    current_user: User = Depends(get_current_user),
):
    """Generate a signed upload URL for direct client-to-Supabase upload.

    This lets the frontend upload large files directly to Supabase
    without routing through FastAPI — reducing server load and latency.

    Requires Supabase configuration.
    """
    # Validate bucket is one of ours
    allowed_buckets = {
        settings.SUPABASE_BUCKET_AVATARS,
        settings.SUPABASE_BUCKET_POSTS,
        settings.SUPABASE_BUCKET_ATTACHMENTS,
        settings.SUPABASE_BUCKET_RESUMES,
    }
    if bucket not in allowed_buckets:
        raise BadRequest(f"Invalid bucket. Allowed: {', '.join(sorted(allowed_buckets))}")

    try:
        result = await storage_service.create_upload_url(
            bucket=bucket,
            filename=filename,
            folder=folder or str(current_user.id),
        )
    except RuntimeError as e:
        raise BadRequest(str(e))

    return result
