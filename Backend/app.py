#!/usr/bin/env python3
"""
FastAPI Application Factory
Similar to Node.js app.js - creates and configures the FastAPI app
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from src.config import settings
from src.db.dbconnect import connect_to_mongo, close_mongo_connection
from src.routes.user_routes import router as user_router
from src.routes.artist_routes import router as artist_router
from src.controllers.artist_controller import artist_controller


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    print("🚀 Starting Artist Information Extraction API...")
    await connect_to_mongo()
    await artist_controller.initialize()
    print("✅ Application startup complete")
    yield
    # Shutdown
    print("🔄 Shutting down application...")
    await close_mongo_connection()
    print("✅ Application shutdown complete")


def create_app() -> FastAPI:
    """Create and configure FastAPI application"""
    
    # Initialize FastAPI app
    app = FastAPI(
        title=settings.APP_NAME,
        description="Advanced API for extracting artist information from documents using AI",
        version=settings.APP_VERSION,
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc"
    )

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include routers
    app.include_router(user_router, prefix="/auth", tags=["Authentication"])
    app.include_router(artist_router, prefix="/api", tags=["Artist Extraction"])

    # Root endpoint
    @app.get("/")
    async def root():
        """API documentation endpoint"""
        return {
            "message": "Artist Information Extraction API - FastAPI Version",
            "version": settings.APP_VERSION,
            "endpoints": {
                "/": "This documentation",
                "/health": "Health check",
                "/docs": "Swagger UI documentation",
                "/redoc": "ReDoc documentation",
                "/auth/register": "POST - Register new user",
                "/auth/login": "POST - User login",
                "/auth/profile": "GET - Get user profile",
                "/api/extract": "POST - Extract artist information from uploaded file",
                "/api/artists": "GET - List all artists (paginated)",
                "/api/artists/{artist_id}": "GET - Get specific artist",
                "/api/results": "GET - List all saved extraction results",
                "/api/results/{result_id}": "GET - Retrieve a specific saved result"
            },
            "supported_formats": list(settings.ALLOWED_EXTENSIONS),
            "max_file_size": f"{settings.MAX_FILE_SIZE // (1024*1024)}MB",
            "features": [
                "User authentication and authorization",
                "MongoDB integration for data persistence",
                "Advanced AI-powered information extraction",
                "Comprehensive artist database management"
            ]
        }

    # Health check endpoint
    @app.get("/health")
    async def health_check():
        """Health check endpoint"""
        from src.db.dbconnect import get_database
        import datetime
        
        try:
            # Test MongoDB connection
            db = get_database()
            await db.command("ping")
            db_status = "connected"
        except Exception as e:
            db_status = f"error: {str(e)}"
        
        return {
            "status": "healthy",
            "message": "Artist Extraction API is running",
            "database": db_status,
            "gemini_configured": bool(settings.GEMINI_API_KEY),
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "version": settings.APP_VERSION
        }

    return app


# Create the app instance
app = create_app()