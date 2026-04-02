"""Tests for the home feed endpoint."""

from httpx import AsyncClient


class TestHomeFeed:
    async def test_feed_shows_posts_from_joined_communities(
        self, client: AsyncClient, post_in_community,
    ):
        post_data, _, headers = post_in_community

        resp = await client.get("/api/v1/feed", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 1
        post_ids = [p["id"] for p in data["items"]]
        assert post_data["id"] in post_ids

    async def test_feed_empty_when_no_communities(self, client: AsyncClient, auth_header):
        # auth_header is for an unverified user with no communities
        resp = await client.get("/api/v1/feed", headers=auth_header)
        assert resp.status_code == 200
        data = resp.json()
        assert data["items"] == []
        assert data["total"] == 0

    async def test_feed_requires_authentication(self, client: AsyncClient):
        resp = await client.get("/api/v1/feed")
        assert resp.status_code == 401

    async def test_feed_includes_like_context(self, client: AsyncClient, post_in_community):
        post_data, _, headers = post_in_community

        # Like the post
        await client.post(f"/api/v1/posts/{post_data['id']}/like", headers=headers)

        # Feed should reflect the like
        resp = await client.get("/api/v1/feed", headers=headers)
        data = resp.json()
        feed_post = next(p for p in data["items"] if p["id"] == post_data["id"])
        assert feed_post["liked_by_me"] is True
        assert feed_post["like_count"] == 1
