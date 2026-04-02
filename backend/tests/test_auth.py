"""Tests for authentication: register, login, reject invalid credentials."""

import pytest
from httpx import AsyncClient


class TestRegister:
    async def test_register_success(self, client: AsyncClient, unique_suffix: str):
        resp = await client.post("/api/v1/auth/register", json={
            "email": f"new_{unique_suffix}@example.com",
            "password": "securepass123",
            "full_name": "New User",
            "username": f"new_{unique_suffix}",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["email"] == f"new_{unique_suffix}@example.com"
        assert data["username"] == f"new_{unique_suffix}"
        assert data["is_verified_student"] is False
        assert "password_hash" not in data

    async def test_register_duplicate_email(self, client: AsyncClient, registered_user):
        user_data, _ = registered_user
        resp = await client.post("/api/v1/auth/register", json={
            "email": user_data["email"],
            "password": "anotherpass123",
            "full_name": "Duplicate",
            "username": "totally_unique_name",
        })
        assert resp.status_code == 409

    async def test_register_duplicate_username(self, client: AsyncClient, registered_user):
        user_data, _ = registered_user
        resp = await client.post("/api/v1/auth/register", json={
            "email": "completely_unique@example.com",
            "password": "anotherpass123",
            "full_name": "Duplicate",
            "username": user_data["username"],
        })
        assert resp.status_code == 409

    async def test_register_short_password(self, client: AsyncClient):
        resp = await client.post("/api/v1/auth/register", json={
            "email": "short@example.com",
            "password": "short",
            "full_name": "Short Pass",
            "username": "shortpass",
        })
        assert resp.status_code == 422


class TestLogin:
    async def test_login_success(self, client: AsyncClient, registered_user):
        user_data, password = registered_user
        resp = await client.post("/api/v1/auth/login", json={
            "email": user_data["email"],
            "password": password,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    async def test_login_wrong_password(self, client: AsyncClient, registered_user):
        user_data, _ = registered_user
        resp = await client.post("/api/v1/auth/login", json={
            "email": user_data["email"],
            "password": "wrongpassword123",
        })
        assert resp.status_code == 401

    async def test_login_nonexistent_email(self, client: AsyncClient):
        resp = await client.post("/api/v1/auth/login", json={
            "email": "nobody@example.com",
            "password": "whatever123",
        })
        assert resp.status_code == 401


class TestAuthenticatedAccess:
    async def test_get_me_with_token(self, client: AsyncClient, auth_header):
        resp = await client.get("/api/v1/users/me", headers=auth_header)
        assert resp.status_code == 200
        assert "email" in resp.json()

    async def test_get_me_without_token(self, client: AsyncClient):
        resp = await client.get("/api/v1/users/me")
        assert resp.status_code == 401
