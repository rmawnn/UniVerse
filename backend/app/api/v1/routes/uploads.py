import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, UploadFile, File

from app.core.dependencies import get_current_user
from app.core.exceptions import BadRequest
from app.models.user import User

router = APIRouter()

UPLOAD_DIR = Path(__file__).resolve().parents[4] / "uploads"
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB

VIDEO_ALLOWED_TYPES = {"video/mp4", "video/webm"}
VIDEO_ALLOWED_EXTENSIONS = {".mp4", ".webm"}
VIDEO_MAX_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB (≈10s at reasonable quality)
VIDEO_MIN_SIZE_BYTES = 10 * 1024  # 10 KB minimum (reject empty/corrupt files)


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Upload a single image file.

    Returns the URL path that can be used in post image_url
    or profile_image_url fields.

    Constraints:
    - JPEG, PNG, or WebP only
    - Max 5 MB
    - One file at a time
    """
    # Validate content type
    if file.content_type not in ALLOWED_TYPES:
        raise BadRequest(
            f"Invalid file type '{file.content_type}'. "
            f"Allowed: jpg, png, webp"
        )

    # Validate extension
    original_name = file.filename or "upload"
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

    # Generate safe unique filename
    safe_name = f"{uuid.uuid4().hex}{ext}"

    # Ensure upload directory exists
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    # Write file
    dest = UPLOAD_DIR / safe_name
    dest.write_bytes(data)

    return {"url": f"/uploads/{safe_name}"}


@router.post("/video")
async def upload_video(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Upload a single short video file.

    Returns the URL path for use in post video_url fields.

    Constraints:
    - MP4 or WebM only
    - Max 15 MB
    - Min 10 KB (rejects corrupt/empty files)
    """
    if file.content_type not in VIDEO_ALLOWED_TYPES:
        raise BadRequest(
            f"Invalid file type '{file.content_type}'. Allowed: mp4, webm"
        )

    original_name = file.filename or "upload"
    ext = Path(original_name).suffix.lower()
    if ext not in VIDEO_ALLOWED_EXTENSIONS:
        raise BadRequest(
            f"Invalid file extension '{ext}'. Allowed: .mp4, .webm"
        )

    # Read in chunks to avoid holding oversized files in memory
    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = await file.read(1024 * 1024)  # 1 MB chunks
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

    # Basic MP4 magic-byte check (ftyp box)
    if ext == ".mp4" and data[:4] != b"\x00\x00\x00" and data[4:8] != b"ftyp":
        # Lenient check: just verify first bytes aren't plain text
        if data[:4] in (b"<htm", b"<!DO", b"{\n  ", b"PK\x03\x04"):
            raise BadRequest("File does not appear to be a valid video")

    safe_name = f"{uuid.uuid4().hex}{ext}"
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    dest = UPLOAD_DIR / safe_name
    dest.write_bytes(data)

    return {"url": f"/uploads/{safe_name}"}
