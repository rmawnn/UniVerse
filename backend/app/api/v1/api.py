from fastapi import APIRouter

v1_router = APIRouter()

# Health check — useful for deployment probes
@v1_router.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok"}


# ── Active routers ────────────────────────────────────────────
from app.api.v1.routes.auth import router as auth_router
from app.api.v1.routes.users import router as users_router
from app.api.v1.routes.universities import router as universities_router
from app.api.v1.routes.verification import router as verification_router
from app.api.v1.routes.communities import router as communities_router
from app.api.v1.routes.posts import router as posts_router
from app.api.v1.routes.comments import router as comments_router
from app.api.v1.routes.post_likes import router as post_likes_router
from app.api.v1.routes.conversations import router as conversations_router
from app.api.v1.routes.notifications import router as notifications_router
from app.api.v1.routes.feed import router as feed_router
from app.api.v1.routes.explore import router as explore_router

v1_router.include_router(auth_router, prefix="/auth", tags=["Auth"])
v1_router.include_router(users_router, prefix="/users", tags=["Users"])
v1_router.include_router(universities_router, prefix="/universities", tags=["Universities"])
v1_router.include_router(verification_router, prefix="/verification", tags=["Verification"])
v1_router.include_router(communities_router, prefix="/communities", tags=["Communities"])
v1_router.include_router(posts_router, tags=["Posts"])
v1_router.include_router(comments_router, tags=["Comments"])
v1_router.include_router(post_likes_router, tags=["Likes"])
v1_router.include_router(conversations_router, tags=["Messaging"])
v1_router.include_router(notifications_router, tags=["Notifications"])
v1_router.include_router(feed_router, tags=["Feed"])
v1_router.include_router(explore_router, tags=["Explore"])
