from fastapi import APIRouter

v1_router = APIRouter()

# Health check — useful for deployment probes
@v1_router.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok"}


# ── Active routers ────────────────────────────────────────────
from app.api.v1.routes.auth import router as auth_router
from app.api.v1.routes.users import router as users_router

v1_router.include_router(auth_router, prefix="/auth", tags=["Auth"])
v1_router.include_router(users_router, prefix="/users", tags=["Users"])

# ── Future routers (uncomment as modules are built) ──────────
# from app.api.v1.routes.universities import router as universities_router
# from app.api.v1.routes.verification import router as verification_router
# from app.api.v1.routes.communities import router as communities_router
# from app.api.v1.routes.posts import router as posts_router
# from app.api.v1.routes.messaging import router as messaging_router
# from app.api.v1.routes.notifications import router as notifications_router
#
# v1_router.include_router(universities_router, prefix="/universities", tags=["Universities"])
# v1_router.include_router(verification_router, prefix="/verification", tags=["Verification"])
# v1_router.include_router(communities_router, prefix="/communities", tags=["Communities"])
# v1_router.include_router(posts_router, prefix="/posts", tags=["Posts"])
# v1_router.include_router(messaging_router, prefix="/messaging", tags=["Messaging"])
# v1_router.include_router(notifications_router, prefix="/notifications", tags=["Notifications"])
