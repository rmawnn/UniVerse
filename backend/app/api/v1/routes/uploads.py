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
VIDEO_MAX_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB


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
    - Max 20 MB
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

    data = await file.read()
    if len(data) > VIDEO_MAX_SIZE_BYTES:
        raise BadRequest(
            f"File too large ({len(data) / 1024 / 1024:.1f} MB). Maximum is 20 MB"
        )

    if len(data) == 0:
        raise BadRequest("File is empty")

    safe_name = f"{uuid.uuid4().hex}{ext}"
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    dest = UPLOAD_DIR / safe_name
    dest.write_bytes(data)

    return {"url": f"/uploads/{safe_name}"}
