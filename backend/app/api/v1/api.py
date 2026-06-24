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
from app.api.v1.routes.ws import router as ws_router
from app.api.v1.routes.admin import router as admin_router
from app.api.v1.routes.uploads import router as uploads_router
from app.api.v1.routes.stories import router as stories_router
from app.api.v1.routes.saved_posts import router as saved_posts_router
from app.api.v1.routes.jobs import router as jobs_router
from app.api.v1.routes.reports import router as reports_router
from app.api.v1.routes.search import router as search_router
from app.api.v1.routes.trending import router as trending_router
from app.api.v1.routes.ai import router as ai_router
from app.api.v1.routes.reposts import router as reposts_router
from app.api.v1.routes.polls import router as polls_router

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
v1_router.include_router(ws_router, tags=["WebSocket"])
v1_router.include_router(admin_router, prefix="/admin", tags=["Admin"])
v1_router.include_router(uploads_router, prefix="/uploads", tags=["Uploads"])
v1_router.include_router(stories_router, prefix="/stories", tags=["Stories"])
v1_router.include_router(saved_posts_router, tags=["Saved Posts"])
v1_router.include_router(jobs_router, tags=["Jobs"])
v1_router.include_router(reports_router, tags=["Reports"])
v1_router.include_router(search_router, tags=["Search"])
v1_router.include_router(trending_router, tags=["Trending"])
v1_router.include_router(ai_router, tags=["AI"])
v1_router.include_router(reposts_router, tags=["Reposts"])
v1_router.include_router(polls_router, tags=["Polls"])
