#!/usr/bin/env python3
"""
Server Entry Point
Similar to Node.js server.js - starts the server
"""

import uvicorn
from app import app
from src.config import settings

if __name__ == "__main__":
    print("🚀 Starting Artist Information Extraction API Server...")
    print(f"📁 Upload folder: {settings.UPLOAD_FOLDER}")
    print(f"🔑 Gemini API configured: {'Yes' if settings.GEMINI_API_KEY else 'No'}")
    print(f"🗄️ MongoDB URL: {settings.MONGODB_URL}")
    print(f"📄 Supported formats: {', '.join(settings.ALLOWED_EXTENSIONS)}")
    print(f"🌐 API will be available at: http://{settings.HOST}:{settings.PORT}")
    print(f"📖 Documentation at: http://{settings.HOST}:{settings.PORT}/docs")
    print(f"📚 ReDoc at: http://{settings.HOST}:{settings.PORT}/redoc")
    
    uvicorn.run(
        "app:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )