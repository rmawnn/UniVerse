"""Tests for conversations and messaging."""

from uuid import uuid4

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.integration


async def _create_second_verified_user(
    client: AsyncClient, university, unique_suffix: str,
) -> tuple[dict, str]:
    """Helper: register + verify a second user. Returns (headers, user_data)."""
    password = "TestPassword123!"
    email = f"peer_{unique_suffix}@testuni.edu"
    uni_email = f"peer_{unique_suffix}@{university.domain}"

    resp = await client.post("/api/v1/auth/register", json={
        "email": email,
        "password": password,
        "full_name": f"Peer {unique_suffix}",
        "username": f"peer_{unique_suffix}",
    })
    user_data = resp.json()

    resp = await client.post("/api/v1/auth/login", json={
        "identifier": email, "password": password,
    })
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.post("/api/v1/verification/send", json={
        "university_email": uni_email,
    }, headers=headers)
    send_data = resp.json()
    verification_id = send_data["verification_id"]
    code = send_data["debug_code"]
    await client.post("/api/v1/verification/confirm", json={
        "verification_id": verification_id,
        "code": code,
    }, headers=headers)

    return headers, user_data


class TestConversations:
    async def test_create_conversation(
        self, client: AsyncClient, verified_user_header, university, unique_suffix: str,
    ):
        headers_a, _ = verified_user_header
        headers_b, user_b = await _create_second_verified_user(
            client, university, unique_suffix,
        )

        resp = await client.post("/api/v1/conversations", json={
            "participant_id": user_b["id"],
        }, headers=headers_a)
        assert resp.status_code == 201
        data = resp.json()
        assert len(data["participants"]) == 2
        assert data["last_message"] is None

    async def test_reuse_existing_conversation(
        self, client: AsyncClient, verified_user_header, university, unique_suffix: str,
    ):
        headers_a, _ = verified_user_header
        headers_b, user_b = await _create_second_verified_user(
            client, university, unique_suffix,
        )

        # Create once
        resp1 = await client.post("/api/v1/conversations", json={
            "participant_id": user_b["id"],
        }, headers=headers_a)
        conv_id_1 = resp1.json()["id"]

        # Create again → should return the same conversation
        resp2 = await client.post("/api/v1/conversations", json={
            "participant_id": user_b["id"],
        }, headers=headers_a)
        assert resp2.status_code == 201
        assert resp2.json()["id"] == conv_id_1

    async def test_cannot_dm_yourself(
        self, client: AsyncClient, verified_user_header,
    ):
        headers, user_data = verified_user_header
        resp = await client.post("/api/v1/conversations", json={
            "participant_id": user_data["id"],
        }, headers=headers)
        assert resp.status_code == 400


class TestMessages:
    async def test_send_and_list_messages(
        self, client: AsyncClient, verified_user_header, university, unique_suffix: str,
    ):
        headers_a, _ = verified_user_header
        headers_b, user_b = await _create_second_verified_user(
            client, university, unique_suffix,
        )

        # Create conversation
        resp = await client.post("/api/v1/conversations", json={
            "participant_id": user_b["id"],
        }, headers=headers_a)
        conv_id = resp.json()["id"]

        # Send a message
        resp = await client.post(
            f"/api/v1/conversations/{conv_id}/messages",
            json={"content": "Hello!"},
            headers=headers_a,
        )
        assert resp.status_code == 201
        msg_data = resp.json()
        assert msg_data["content"] == "Hello!"
        assert msg_data["conversation_id"] == conv_id

        # Other participant can read messages
        resp = await client.get(
            f"/api/v1/conversations/{conv_id}/messages",
            headers=headers_b,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["items"][0]["content"] == "Hello!"

    async def test_non_participant_cannot_send_message(
        self, client: AsyncClient, verified_user_header, university, unique_suffix: str,
    ):
        headers_a, _ = verified_user_header
        headers_b, user_b = await _create_second_verified_user(
            client, university, unique_suffix,
        )

        # Create conversation between A and B
        resp = await client.post("/api/v1/conversations", json={
            "participant_id": user_b["id"],
        }, headers=headers_a)
        conv_id = resp.json()["id"]

        # Create a third user C
        suffix_c = uuid4().hex[:8]
        headers_c, _ = await _create_second_verified_user(
            client, university, suffix_c,
        )

        # C tries to send a message → should fail
        resp = await client.post(
            f"/api/v1/conversations/{conv_id}/messages",
            json={"content": "I shouldn't be here"},
            headers=headers_c,
        )
        assert resp.status_code == 403

    async def test_list_conversations(
        self, client: AsyncClient, verified_user_header, university, unique_suffix: str,
    ):
        headers_a, _ = verified_user_header
        headers_b, user_b = await _create_second_verified_user(
            client, university, unique_suffix,
        )

        # Create conversation and send a message
        resp = await client.post("/api/v1/conversations", json={
            "participant_id": user_b["id"],
        }, headers=headers_a)
        conv_id = resp.json()["id"]

        await client.post(
            f"/api/v1/conversations/{conv_id}/messages",
            json={"content": "Hi there!"},
            headers=headers_a,
        )

        # List conversations
        resp = await client.get("/api/v1/conversations", headers=headers_a)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 1
        conv = next(c for c in data["items"] if c["id"] == conv_id)
        assert conv["last_message"]["content"] == "Hi there!"
