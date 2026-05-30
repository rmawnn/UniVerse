from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=100)
    username: str = Field(
        min_length=3,
        max_length=30,
        pattern=r"^[a-zA-Z0-9_]+$",
    )


class LoginRequest(BaseModel):
    identifier: str = Field(min_length=1, max_length=150)
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
