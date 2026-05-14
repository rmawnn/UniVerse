from uuid import UUID

from sqlalchemy import select, func, case, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.user_follow import UserFollow


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

    async def list_all(self, *, skip: int = 0, limit: int = 50) -> list[User]:
        stmt = (
            select(User)
            .order_by(User.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def count_all(self) -> int:
        stmt = select(func.count()).select_from(User)
        result = await self.db.execute(stmt)
        return result.scalar_one()

    def _admin_filters(
        self,
        stmt,
        *,
        search: str | None = None,
        is_active: bool | None = None,
        is_verified: bool | None = None,
        role: str | None = None,
    ):
        if search:
            pattern = f"%{search}%"
            stmt = stmt.where(
                or_(
                    User.username.ilike(pattern),
                    User.email.ilike(pattern),
                    User.full_name.ilike(pattern),
                )
            )
        if is_active is not None:
            stmt = stmt.where(User.is_active == is_active)
        if is_verified is not None:
            stmt = stmt.where(User.is_verified_student == is_verified)
        if role is not None:
            stmt = stmt.where(User.role == role)
        return stmt

    async def list_all_filtered(
        self,
        *,
        search: str | None = None,
        is_active: bool | None = None,
        is_verified: bool | None = None,
        role: str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[User]:
        stmt = select(User).order_by(User.created_at.desc()).offset(skip).limit(limit)
        stmt = self._admin_filters(
            stmt, search=search, is_active=is_active, is_verified=is_verified, role=role,
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def count_all_filtered(
        self,
        *,
        search: str | None = None,
        is_active: bool | None = None,
        is_verified: bool | None = None,
        role: str | None = None,
    ) -> int:
        stmt = select(func.count()).select_from(User)
        stmt = self._admin_filters(
            stmt, search=search, is_active=is_active, is_verified=is_verified, role=role,
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def get_following_ids(self, user_id: UUID) -> set[UUID]:
        """Return IDs of users that the given user follows."""
        stmt = select(UserFollow.following_id).where(
            UserFollow.follower_id == user_id,
        )
        result = await self.db.execute(stmt)
        return {row[0] for row in result.all()}

    async def list_suggested(
        self,
        current_user_id: UUID,
        *,
        university_id: UUID | None = None,
        limit: int = 10,
    ) -> list[User]:
        """Return active users that the current user is NOT following.

        Ordering priority:
          1. Same university as the current user (if university_id given)
          2. Verified students first
          3. Random tiebreaker for variety

        Excludes the current user.
        """
        following_ids = (
            select(UserFollow.following_id)
            .where(UserFollow.follower_id == current_user_id)
        ).subquery()

        same_uni = case(
            (User.university_id == university_id, 0),
            else_=1,
        ) if university_id else case(else_=1)

        verified = case(
            (User.is_verified_student == True, 0),  # noqa: E712
            else_=1,
        )

        stmt = (
            select(User)
            .where(
                User.is_active == True,  # noqa: E712
                User.id != current_user_id,
                User.id.notin_(select(following_ids)),
            )
            .order_by(same_uni, verified, func.random())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
