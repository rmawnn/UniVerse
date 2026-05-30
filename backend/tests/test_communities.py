"""Tests for community creation and membership."""

from uuid import uuid4

from httpx import AsyncClient


class TestCreateCommunity:
    async def test_verified_user_can_create_community(
        self, client: AsyncClient, verified_user_header,
    ):
        headers, _ = verified_user_header
        resp = await client.post("/api/v1/communities", json={
            "name": "Test Community",
            "description": "A test community",
        }, headers=headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Test Community"
        assert data["is_member"] is True
        assert data["my_role"] == "admin"
        assert data["member_count"] == 1

    async def test_unverified_user_cannot_create_community(
        self, client: AsyncClient, auth_header,
    ):
        resp = await client.post("/api/v1/communities", json={
            "name": "Should Fail",
        }, headers=auth_header)
        assert resp.status_code == 403


class TestJoinCommunity:
    async def test_verified_user_can_join_community(
        self, client: AsyncClient, community, university, unique_suffix: str,
    ):
        community_data, _ = community

        # Create a second verified user
        password = "testpassword123"
        email = f"joiner_{unique_suffix}@example.com"
        uni_email = f"joiner_{unique_suffix}@{university.domain}"

        resp = await client.post("/api/v1/auth/register", json={
            "email": email,
            "password": password,
            "full_name": "Joiner",
            "username": f"joiner_{unique_suffix}",
        })
        assert resp.status_code == 201

        resp = await client.post("/api/v1/auth/login", json={
            "identifier": email, "password": password,
        })
        token = resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Verify the second user
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

        # Join community
        resp = await client.post(
            f"/api/v1/communities/{community_data['id']}/join",
            headers=headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_member"] is True
        assert data["my_role"] == "member"
        assert data["member_count"] == 2

    async def test_cannot_join_twice(self, client: AsyncClient, community):
        community_data, headers = community
        resp = await client.post(
            f"/api/v1/communities/{community_data['id']}/join",
            headers=headers,
        )
        assert resp.status_code == 409


class TestCommunitySearch:
    async def test_search_communities_by_name(self, client: AsyncClient, community):
        community_data, headers = community
        name_fragment = community_data["name"][:10]
        resp = await client.get(
            f"/api/v1/communities/search?q={name_fragment}",
            headers=headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 1
        ids = [item["id"] for item in data["items"]]
        assert community_data["id"] in ids

    async def test_search_without_auth_returns_null_is_member(self, client: AsyncClient, community):
        community_data, _ = community
        name_fragment = community_data["name"][:10]
        resp = await client.get(f"/api/v1/communities/search?q={name_fragment}")
        assert resp.status_code == 200
        for item in resp.json()["items"]:
            assert item["is_member"] is None
