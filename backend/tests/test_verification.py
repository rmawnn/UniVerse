"""Tests for student verification flow."""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.integration


class TestVerification:
    async def test_send_verification_code(self, client: AsyncClient, auth_header, university):
        uni_email = f"student@{university.domain}"
        resp = await client.post("/api/v1/verification/send", json={
            "university_email": uni_email,
        }, headers=auth_header)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "pending"
        assert data["debug_code"] is not None
        assert len(data["debug_code"]) == 6
        assert data["verification_id"] is not None

    async def test_confirm_verification_code(self, client: AsyncClient, auth_header, university):
        uni_email = f"student@{university.domain}"

        # Send code
        resp = await client.post("/api/v1/verification/send", json={
            "university_email": uni_email,
        }, headers=auth_header)
        send_data = resp.json()
        verification_id = send_data["verification_id"]
        code = send_data["debug_code"]

        # Confirm
        resp = await client.post("/api/v1/verification/confirm", json={
            "verification_id": verification_id,
            "code": code,
        }, headers=auth_header)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "verified"
        assert university.name in data["university_name"]

    async def test_user_becomes_verified_after_confirmation(
        self, client: AsyncClient, auth_header, university,
    ):
        uni_email = f"student@{university.domain}"

        # Before: not verified
        resp = await client.get("/api/v1/users/me", headers=auth_header)
        assert resp.json()["is_verified_student"] is False

        # Send + confirm
        resp = await client.post("/api/v1/verification/send", json={
            "university_email": uni_email,
        }, headers=auth_header)
        send_data = resp.json()
        verification_id = send_data["verification_id"]
        code = send_data["debug_code"]

        await client.post("/api/v1/verification/confirm", json={
            "verification_id": verification_id,
            "code": code,
        }, headers=auth_header)

        # After: verified
        resp = await client.get("/api/v1/users/me", headers=auth_header)
        assert resp.json()["is_verified_student"] is True
        assert resp.json()["university_id"] is not None

    async def test_wrong_code_rejected(self, client: AsyncClient, auth_header, university):
        uni_email = f"student@{university.domain}"

        resp = await client.post("/api/v1/verification/send", json={
            "university_email": uni_email,
        }, headers=auth_header)
        verification_id = resp.json()["verification_id"]

        resp = await client.post("/api/v1/verification/confirm", json={
            "verification_id": verification_id,
            "code": "000000",
        }, headers=auth_header)
        assert resp.status_code == 400

    async def test_unknown_domain_rejected(self, client: AsyncClient, auth_header):
        resp = await client.post("/api/v1/verification/send", json={
            "university_email": "student@nonexistent-university.edu",
        }, headers=auth_header)
        assert resp.status_code == 400

    async def test_unauthenticated_cannot_verify(self, client: AsyncClient):
        resp = await client.post("/api/v1/verification/send", json={
            "university_email": "student@test.edu",
        })
        assert resp.status_code == 401
