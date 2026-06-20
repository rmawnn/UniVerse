"""
Email delivery service for UniVerse.

Supports three providers in priority order:
  1. Resend  — modern email API (recommended)
  2. SendGrid — widely used transactional email
  3. SMTP    — universal fallback (Gmail, Outlook, any SMTP server)

Provider is selected via the EMAIL_PROVIDER env var.
When EMAIL_PROVIDER is empty, email sending is skipped (dev mode).

Retry logic: transient failures (network, 5xx) are retried up to 3 times
with exponential backoff (1s, 2s, 4s).
"""

import asyncio
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

MAX_RETRIES = 3
RETRY_BASE_DELAY = 1  # seconds


# ── HTML template ────────────────────────────────────────────


def _build_verification_html(code: str, expiry_minutes: int = 10) -> str:
    """Build an HTML verification email with the 6-digit code."""
    return f"""\
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UniVerse Verification</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color:#1e2761;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">UniVerse</h1>
              <p style="margin:8px 0 0;color:#cadcfc;font-size:14px;">Student Verification</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 16px;color:#333;font-size:16px;line-height:1.5;">
                Hi there! Use the code below to verify your university email address.
              </p>
              <!-- Code block -->
              <div style="background-color:#f0f4ff;border:2px dashed #1e2761;border-radius:8px;padding:24px;text-align:center;margin:24px 0;">
                <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#1e2761;font-family:'Courier New',monospace;">
                  {code}
                </span>
              </div>
              <p style="margin:0 0 8px;color:#666;font-size:14px;line-height:1.5;">
                This code expires in <strong>{expiry_minutes} minutes</strong>.
              </p>
              <p style="margin:0;color:#666;font-size:14px;line-height:1.5;">
                If you didn't request this, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;background-color:#f9fafb;border-top:1px solid #eee;text-align:center;">
              <p style="margin:0;color:#999;font-size:12px;">
                UniVerse &mdash; Student-only university platform
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _build_password_reset_html(reset_url: str, expiry_minutes: int = 30) -> str:
    """Build an HTML password-reset email with a clickable link."""
    return f"""\
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UniVerse Password Reset</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color:#1e2761;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">UniVerse</h1>
              <p style="margin:8px 0 0;color:#cadcfc;font-size:14px;">Password Reset</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 16px;color:#333;font-size:16px;line-height:1.5;">
                We received a request to reset your password. Click the button below to choose a new one.
              </p>
              <!-- CTA button -->
              <div style="text-align:center;margin:28px 0;">
                <a href="{reset_url}" style="display:inline-block;background-color:#1e2761;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:8px;">
                  Reset Password
                </a>
              </div>
              <p style="margin:0 0 8px;color:#666;font-size:14px;line-height:1.5;">
                This link expires in <strong>{expiry_minutes} minutes</strong>.
              </p>
              <p style="margin:0 0 16px;color:#666;font-size:14px;line-height:1.5;">
                If you didn&rsquo;t request a password reset, you can safely ignore this email. Your password won&rsquo;t be changed.
              </p>
              <p style="margin:0;color:#999;font-size:12px;line-height:1.5;border-top:1px solid #eee;padding-top:16px;">
                If the button doesn&rsquo;t work, copy and paste this link:<br>
                <a href="{reset_url}" style="color:#1e2761;word-break:break-all;">{reset_url}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;background-color:#f9fafb;border-top:1px solid #eee;text-align:center;">
              <p style="margin:0;color:#999;font-size:12px;">
                UniVerse &mdash; Student-only university platform
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _build_password_reset_text(reset_url: str, expiry_minutes: int = 30) -> str:
    """Build a plain-text fallback for the password reset email."""
    return (
        f"UniVerse - Password Reset\n"
        f"=========================\n\n"
        f"We received a request to reset your password.\n\n"
        f"Click the link below to choose a new password:\n"
        f"{reset_url}\n\n"
        f"This link expires in {expiry_minutes} minutes.\n\n"
        f"If you didn't request this, you can safely ignore this email.\n"
    )


def _build_verification_text(code: str, expiry_minutes: int = 10) -> str:
    """Build a plain-text fallback for the verification email."""
    return (
        f"UniVerse - Student Verification\n"
        f"================================\n\n"
        f"Your verification code is: {code}\n\n"
        f"This code expires in {expiry_minutes} minutes.\n\n"
        f"If you didn't request this, you can safely ignore this email.\n"
    )


# ── Provider implementations ─────────────────────────────────


async def _send_via_resend(
    to: str,
    subject: str,
    html: str,
    text: str,
) -> None:
    """Send email using the Resend API (https://resend.com)."""
    api_key = settings.RESEND_API_KEY
    if not api_key:
        raise RuntimeError("RESEND_API_KEY is not configured")

    payload = {
        "from": settings.EMAIL_FROM,
        "to": [to],
        "subject": subject,
        "html": html,
        "text": text,
    }

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            "https://api.resend.com/emails",
            json=payload,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
        )

    if resp.status_code >= 500:
        raise RuntimeError(f"Resend server error: {resp.status_code} {resp.text}")
    if resp.status_code >= 400:
        logger.error(
            "Resend rejected email to %s (from=%s): %d %s",
            to, settings.EMAIL_FROM, resp.status_code, resp.text,
        )
        raise ValueError(f"Resend client error: {resp.status_code} {resp.text}")

    logger.info("Email sent via Resend to %s (id=%s)", to, resp.json().get("id"))


async def _send_via_sendgrid(
    to: str,
    subject: str,
    html: str,
    text: str,
) -> None:
    """Send email using the SendGrid v3 API."""
    api_key = settings.SENDGRID_API_KEY
    if not api_key:
        raise RuntimeError("SENDGRID_API_KEY is not configured")

    payload = {
        "personalizations": [{"to": [{"email": to}]}],
        "from": {"email": settings.EMAIL_FROM},
        "subject": subject,
        "content": [
            {"type": "text/plain", "value": text},
            {"type": "text/html", "value": html},
        ],
    }

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            "https://api.sendgrid.com/v3/mail/send",
            json=payload,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
        )

    if resp.status_code >= 500:
        raise RuntimeError(f"SendGrid server error: {resp.status_code} {resp.text}")
    if resp.status_code >= 400:
        raise ValueError(f"SendGrid client error: {resp.status_code} {resp.text}")

    logger.info("Email sent via SendGrid to %s (status=%d)", to, resp.status_code)


async def _send_via_smtp(
    to: str,
    subject: str,
    html: str,
    text: str,
) -> None:
    """Send email via SMTP (runs blocking I/O in a thread pool)."""
    host = settings.SMTP_HOST
    port = settings.SMTP_PORT
    user = settings.SMTP_USER
    password = settings.SMTP_PASSWORD

    if not host:
        raise RuntimeError("SMTP_HOST is not configured")

    msg = MIMEMultipart("alternative")
    msg["From"] = settings.EMAIL_FROM
    msg["To"] = to
    msg["Subject"] = subject
    msg.attach(MIMEText(text, "plain", "utf-8"))
    msg.attach(MIMEText(html, "html", "utf-8"))

    def _blocking_send():
        if port == 465:
            # SSL
            with smtplib.SMTP_SSL(host, port, timeout=15) as server:
                if user and password:
                    server.login(user, password)
                server.sendmail(settings.EMAIL_FROM, to, msg.as_string())
        else:
            # STARTTLS (port 587) or plain (port 25)
            with smtplib.SMTP(host, port, timeout=15) as server:
                server.ehlo()
                if port == 587:
                    server.starttls()
                    server.ehlo()
                if user and password:
                    server.login(user, password)
                server.sendmail(settings.EMAIL_FROM, to, msg.as_string())

    await asyncio.get_event_loop().run_in_executor(None, _blocking_send)
    logger.info("Email sent via SMTP to %s (%s:%d)", to, host, port)


# ── Dispatch with retry ──────────────────────────────────────

_PROVIDERS = {
    "resend": _send_via_resend,
    "sendgrid": _send_via_sendgrid,
    "smtp": _send_via_smtp,
}


async def send_verification_email(
    to: str,
    code: str,
    expiry_minutes: int = 10,
) -> bool:
    """
    Send a verification code email to the given address.

    Returns True if sent successfully, False if sending is disabled or
    all retries failed (logs the error but doesn't raise — the caller
    still returns the debug_code in dev mode and the verification request
    is already created in the DB).
    """
    provider = settings.EMAIL_PROVIDER.lower().strip()

    if not provider:
        logger.debug("EMAIL_PROVIDER not set — skipping email send (dev mode)")
        return False

    send_fn = _PROVIDERS.get(provider)
    if not send_fn:
        logger.error("Unknown EMAIL_PROVIDER '%s'. Supported: resend, sendgrid, smtp", provider)
        return False

    subject = f"UniVerse Verification Code: {code}"
    html = _build_verification_html(code, expiry_minutes)
    text = _build_verification_text(code, expiry_minutes)

    last_error: Exception | None = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            await send_fn(to, subject, html, text)
            return True
        except (RuntimeError, httpx.ConnectError, httpx.TimeoutException, OSError) as exc:
            # Transient / server errors — retry
            last_error = exc
            if attempt < MAX_RETRIES:
                delay = RETRY_BASE_DELAY * (2 ** (attempt - 1))
                logger.warning(
                    "Email send attempt %d/%d failed (%s), retrying in %ds...",
                    attempt, MAX_RETRIES, exc, delay,
                )
                await asyncio.sleep(delay)
            else:
                logger.error(
                    "Email send failed after %d attempts: %s", MAX_RETRIES, exc,
                )
        except ValueError as exc:
            # Client errors (400) — don't retry, it won't help
            logger.error("Email send client error (no retry): %s", exc)
            last_error = exc
            break

    return False


async def send_password_reset_email(
    to: str,
    reset_url: str,
    expiry_minutes: int = 30,
) -> bool:
    """
    Send a password reset email with a link to the given address.

    Returns True if sent successfully, False if sending is disabled or
    all retries failed.
    """
    provider = settings.EMAIL_PROVIDER.lower().strip()

    if not provider:
        logger.debug("EMAIL_PROVIDER not set — skipping password reset email (dev mode)")
        return False

    send_fn = _PROVIDERS.get(provider)
    if not send_fn:
        logger.error("Unknown EMAIL_PROVIDER '%s'. Supported: resend, sendgrid, smtp", provider)
        return False

    subject = "UniVerse — Reset Your Password"
    html = _build_password_reset_html(reset_url, expiry_minutes)
    text = _build_password_reset_text(reset_url, expiry_minutes)

    last_error: Exception | None = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            await send_fn(to, subject, html, text)
            return True
        except (RuntimeError, httpx.ConnectError, httpx.TimeoutException, OSError) as exc:
            last_error = exc
            if attempt < MAX_RETRIES:
                delay = RETRY_BASE_DELAY * (2 ** (attempt - 1))
                logger.warning(
                    "Password reset email attempt %d/%d failed (%s), retrying in %ds...",
                    attempt, MAX_RETRIES, exc, delay,
                )
                await asyncio.sleep(delay)
            else:
                logger.error(
                    "Password reset email failed after %d attempts: %s", MAX_RETRIES, exc,
                )
        except ValueError as exc:
            logger.error("Password reset email client error (no retry): %s", exc)
            last_error = exc
            break

    return False
