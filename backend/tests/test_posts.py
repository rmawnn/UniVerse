"""Tests for post creation and access rules."""

from uuid import uuid4

from httpx import AsyncClient


class TestCreatePost:
    async def test_member_can_create_post(self, client: AsyncClient, community):
        community_data, headers = community
        resp = await client.post(
            f"/api/v1/communities/{community_data['id']}/posts",
            json={"content": "My first post!"},
            headers=headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["content"] == "My first post!"
        assert data["community_id"] == community_data["id"]
        assert data["like_count"] == 0
        assert data["liked_by_me"] is False

    async def test_non_member_cannot_create_post(
        self, client: AsyncClient, community, university, unique_suffix: str,
    ):
        community_data, _ = community

        # Create a second verified user who is NOT a member
        password = "testpassword123"
        email = f"outsider_{unique_suffix}@example.com"
        uni_email = f"outsider_{unique_suffix}@{university.domain}"

        await client.post("/api/v1/auth/register", json={
            "email": email,
            "password": password,
            "full_name": "Outsider",
            "username": f"outsider_{unique_suffix}",
        })
        resp = await client.post("/api/v1/auth/login", json={
            "identifier": email, "password": password,
        })
        token = resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Verify the outsider
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

        # Try to post in a community they haven't joined
        resp = await client.post(
            f"/api/v1/communities/{community_data['id']}/posts",
            json={"content": "Should fail"},
            headers=headers,
        )
        assert resp.status_code == 403


class TestListPosts:
    async def test_list_posts_in_community(self, client: AsyncClient, post_in_community):
        post_data, community_data, headers = post_in_community
        resp = await client.get(
            f"/api/v1/communities/{community_data['id']}/posts",
            headers=headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 1
        assert any(p["id"] == post_data["id"] for p in data["items"])

    async def test_get_single_post(self, client: AsyncClient, post_in_community):
        post_data, _, headers = post_in_community
        resp = await client.get(
            f"/api/v1/posts/{post_data['id']}",
            headers=headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == post_data["id"]
        assert data["like_count"] == 0


class TestLikePost:
    async def test_toggle_like(self, client: AsyncClient, post_in_community):
        post_data, _, headers = post_in_community

        # Like
        resp = await client.post(
            f"/api/v1/posts/{post_data['id']}/like",
            headers=headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["liked"] is True
        assert data["like_count"] == 1

        # Unlike
        resp = await client.post(
            f"/api/v1/posts/{post_data['id']}/like",
            headers=headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["liked"] is False
        assert data["like_count"] == 0
