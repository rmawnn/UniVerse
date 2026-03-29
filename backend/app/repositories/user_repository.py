from uuid import UUID

from sqlalchemy import select, func, case, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


class UserRepository:
    """Database access for User entities.

    All methods receive an AsyncSession from the caller (service layer).
    None of them call commit() — transaction boundaries are owned by
    the get_db dependency at the request level.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: UUID) -> User | None:
        return await self.db.get(User, user_id)

    async def get_by_email(self, email: str) -> User | None:
        stmt = select(User).where(User.email == email)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_username(self, username: str) -> User | None:
        stmt = select(User).where(User.username == username)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def update(self, user: User, **fields: object) -> User:
        """Set only the provided fields on the user, then flush."""
        for key, value in fields.items():
            setattr(user, key, value)
        await self.db.flush()
        await self.db.refresh(user)
        return user

    async def update_password(self, user: User, new_password_hash: str) -> None:
        """Update only the password_hash field."""
        user.password_hash = new_password_hash
        await self.db.flush()

    async def create(self, user: User) -> User:
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)
        return user

    async def search(
        self,
        query: str,
        *,
        exclude_user_id: UUID | None = None,
        skip: int = 0,
        limit: int = 20,
    ) -> list[User]:
        """
        Search users by username or full_name (case-insensitive ILIKE).

        Ordering: exact username match first, then verified users,
        then alphabetically by username.
        """
        pattern = f"%{query}%"

        stmt = (
            select(User)
            .where(
                User.is_active == True,  # noqa: E712
                or_(
                    User.username.ilike(pattern),
                    User.full_name.ilike(pattern),
                ),
            )
            .order_by(
                # Exact username match first (0 sorts before 1)
                case(
                    (func.lower(User.username) == query.lower(), 0),
                    else_=1,
                ),
                # Verified users next
                case(
                    (User.is_verified_student == True, 0),  # noqa: E712
                    else_=1,
                ),
                User.username.asc(),
            )
            .offset(skip)
            .limit(limit)
        )

        if exclude_user_id is not None:
            stmt = stmt.where(User.id != exclude_user_id)

        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def count_search(
        self,
        query: str,
        *,
        exclude_user_id: UUID | None = None,
    ) -> int:
        pattern = f"%{query}%"

        stmt = (
            select(func.count())
            .select_from(User)
            .where(
                User.is_active == True,  # noqa: E712
                or_(
                    User.username.ilike(pattern),
                    User.full_name.ilike(pattern),
                ),
            )
        )

        if exclude_user_id is not None:
            stmt = stmt.where(User.id != exclude_user_id)

        result = await self.db.execute(stmt)
        return result.scalar_one()
