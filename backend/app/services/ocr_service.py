"""
OCR extraction service for student verification documents.

Extracts structured data from uploaded student ID cards and enrollment documents.
Uses pytesseract for OCR when available, with a regex-based fallback parser.

Extracted fields:
  - student_name: Full name of the student
  - student_number: Student ID / enrollment number
  - university_name: Institution name
  - department: Department / faculty
  - expiration_date: Card expiry (if present)
"""

import io
import logging
import re
from pathlib import Path

logger = logging.getLogger(__name__)


def _try_import_ocr():
    """Attempt to import OCR dependencies. Returns (pytesseract, Image) or (None, None)."""
    try:
        import pytesseract
        from PIL import Image
        return pytesseract, Image
    except ImportError:
        return None, None


def _try_import_pdf():
    """Attempt to import PDF dependencies. Returns fitz module or None."""
    try:
        import fitz  # PyMuPDF
        return fitz
    except ImportError:
        return None


# ── Regex patterns for data extraction ──────────────────────

# Student number patterns (various formats)
STUDENT_NUMBER_PATTERNS = [
    r"(?:student\s*(?:id|no|number|num)[:\s#]*)\s*(\d[\d\-\.]{4,20})",
    r"(?:enrollment\s*(?:no|number|id)[:\s#]*)\s*(\d[\d\-\.]{4,20})",
    r"(?:matric(?:ulation)?\s*(?:no|number|id)[:\s#]*)\s*(\d[\d\-\.]{4,20})",
    r"(?:reg(?:istration)?\s*(?:no|number|id)[:\s#]*)\s*(\d[\d\-\.]{4,20})",
    r"(?:öğrenci\s*(?:no|numarası)[:\s#]*)\s*(\d[\d\-\.]{4,20})",  # Turkish
    r"\b(\d{6,12})\b",  # Fallback: standalone 6-12 digit number
]

# University name patterns
UNIVERSITY_PATTERNS = [
    r"(?:university\s+of\s+\w[\w\s]{2,40})",
    r"(?:\w[\w\s]{2,30}\s+university)",
    r"(?:\w[\w\s]{2,30}\s+üniversitesi)",  # Turkish
    r"(?:institut[eo]\s+\w[\w\s]{2,40})",
    r"(?:college\s+of\s+\w[\w\s]{2,40})",
    r"(?:\w[\w\s]{2,30}\s+college)",
]

# Expiration date patterns
DATE_PATTERNS = [
    r"(?:exp(?:ir[ey]|iration)?[:\s]*)\s*(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4})",
    r"(?:valid\s*(?:until|thru|through)[:\s]*)\s*(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4})",
    r"(?:geçerlilik[:\s]*)\s*(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4})",  # Turkish
]

# Department patterns
DEPARTMENT_PATTERNS = [
    r"(?:department\s+of\s+\w[\w\s]{2,40})",
    r"(?:dept[:\.\s]+\w[\w\s]{2,40})",
    r"(?:faculty\s+of\s+\w[\w\s]{2,40})",
    r"(?:school\s+of\s+\w[\w\s]{2,40})",
    r"(?:bölüm[:\s]+\w[\w\s]{2,40})",  # Turkish
    r"(?:fakülte[:\s]+\w[\w\s]{2,40})",  # Turkish
]

# Name patterns (lines that look like a person's name)
NAME_PATTERNS = [
    r"(?:name[:\s]+)(\w[\w\s\.]{2,50})",
    r"(?:ad[ıi]\s*soyad[ıi][:\s]+)(\w[\w\s\.]{2,50})",  # Turkish
    r"(?:student[:\s]+)(\w[\w\s\.]{2,50})",
]


def extract_text_from_image(file_content: bytes) -> str:
    """Extract text from an image file using OCR."""
    pytesseract, Image = _try_import_ocr()

    if pytesseract is None or Image is None:
        logger.warning("pytesseract or Pillow not installed — OCR unavailable")
        return ""

    try:
        image = Image.open(io.BytesIO(file_content))

        # Pre-process: convert to grayscale for better OCR
        if image.mode != "L":
            image = image.convert("L")

        # Try multiple languages (English + Turkish as example)
        try:
            text = pytesseract.image_to_string(image, lang="eng+tur")
        except Exception:
            text = pytesseract.image_to_string(image, lang="eng")

        return text.strip()
    except Exception as e:
        logger.error(f"OCR extraction failed: {e}")
        return ""


def extract_text_from_pdf(file_content: bytes) -> str:
    """Extract text from a PDF file."""
    fitz = _try_import_pdf()

    if fitz is None:
        logger.warning("PyMuPDF not installed — PDF text extraction unavailable")
        return ""

    try:
        doc = fitz.open(stream=file_content, filetype="pdf")
        text_parts = []
        for page_num in range(min(doc.page_count, 5)):  # Max 5 pages
            page = doc[page_num]
            text_parts.append(page.get_text())
        doc.close()
        return "\n".join(text_parts).strip()
    except Exception as e:
        logger.error(f"PDF text extraction failed: {e}")
        return ""


def extract_text(file_content: bytes, content_type: str) -> str:
    """Extract text from a file based on its content type."""
    if content_type == "application/pdf":
        text = extract_text_from_pdf(file_content)
        # If PDF text extraction yielded nothing, it might be a scanned PDF
        if not text.strip():
            logger.info("PDF had no extractable text, attempting OCR on rendered pages")
            # For scanned PDFs, we'd render to image then OCR
            # This requires pymupdf + pytesseract
            fitz = _try_import_pdf()
            pytesseract, PILImage = _try_import_ocr()
            if fitz and pytesseract and PILImage:
                try:
                    doc = fitz.open(stream=file_content, filetype="pdf")
                    for page_num in range(min(doc.page_count, 3)):
                        page = doc[page_num]
                        pix = page.get_pixmap(dpi=200)
                        img = PILImage.frombytes("RGB", [pix.width, pix.height], pix.samples)
                        text += pytesseract.image_to_string(img, lang="eng") + "\n"
                    doc.close()
                except Exception as e:
                    logger.error(f"Scanned PDF OCR failed: {e}")
        return text
    elif content_type in ("image/jpeg", "image/png", "image/jpg"):
        return extract_text_from_image(file_content)
    else:
        logger.warning(f"Unsupported content type for OCR: {content_type}")
        return ""


def parse_extracted_data(raw_text: str) -> dict:
    """
    Parse structured fields from OCR raw text using regex patterns.

    Returns a dict with keys:
      - student_name: str | None
      - student_number: str | None
      - university_name: str | None
      - department: str | None
      - expiration_date: str | None
    """
    text_lower = raw_text.lower()
    result = {
        "student_name": None,
        "student_number": None,
        "university_name": None,
        "department": None,
        "expiration_date": None,
    }

    # Extract student number
    for pattern in STUDENT_NUMBER_PATTERNS:
        match = re.search(pattern, text_lower, re.IGNORECASE)
        if match:
            result["student_number"] = match.group(1).strip()
            break

    # Extract university name
    for pattern in UNIVERSITY_PATTERNS:
        match = re.search(pattern, raw_text, re.IGNORECASE)
        if match:
            result["university_name"] = match.group(0).strip()
            break

    # Extract expiration date
    for pattern in DATE_PATTERNS:
        match = re.search(pattern, raw_text, re.IGNORECASE)
        if match:
            result["expiration_date"] = match.group(1).strip()
            break

    # Extract department
    for pattern in DEPARTMENT_PATTERNS:
        match = re.search(pattern, raw_text, re.IGNORECASE)
        if match:
            result["department"] = match.group(0).strip()
            break

    # Extract student name
    for pattern in NAME_PATTERNS:
        match = re.search(pattern, raw_text, re.IGNORECASE)
        if match:
            result["student_name"] = match.group(1).strip()
            break

    return result


async def run_ocr_pipeline(
    file_content: bytes,
    content_type: str,
) -> tuple[str, dict]:
    """
    Full OCR pipeline: extract text → parse structured data.

    Returns:
      (raw_text, extracted_data_dict)
    """
    raw_text = extract_text(file_content, content_type)
    extracted_data = parse_extracted_data(raw_text)
    return raw_text, extracted_data
