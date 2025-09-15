#!/usr/bin/env python3
"""
FastAPI Artist Information Extraction API
Main application entry point
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .config import settings
from .db.dbconnect import connect_to_mongo, close_mongo_connection
from .routes.user_routes import router as user_router
from .routes.artist_routes import router as artist_router
from .services.extraction_service import extraction_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    await connect_to_mongo()
    await extraction_service.initialize()
    yield
    # Shutdown
    await close_mongo_connection()


# Initialize FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="Advanced API for extracting artist information from documents using AI",
    version=settings.APP_VERSION,
    lifespan=lifespan
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


@app.get("/")
async def root():
    """API documentation endpoint"""
    return {
        "message": "Artist Information Extraction API - FastAPI Version",
        "version": settings.APP_VERSION,
        "endpoints": {
            "/": "This documentation",
            "/health": "Health check",
            "/auth/register": "POST - Register new user",
            "/auth/login": "POST - User login",
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


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    from .database import get_database
    
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
        "timestamp": __import__('datetime').datetime.utcnow().isoformat()
    }


if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Artist Information Extraction API (FastAPI)...")
    print(f"📁 Upload folder: {settings.UPLOAD_FOLDER}")
    print(f"🔑 Gemini API configured: {'Yes' if settings.GEMINI_API_KEY else 'No'}")
    print(f"🗄️ MongoDB URL: {settings.MONGODB_URL}")
    print(f"📄 Supported formats: {', '.join(settings.ALLOWED_EXTENSIONS)}")
    print("🌐 API will be available at: http://localhost:8000")
    print("📖 Documentation at: http://localhost:8000/docs")
    
    uvicorn.run("src.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)