#!/usr/bin/env python3
"""
Alternative entry point for running the FastAPI application
Can be used for development or testing purposes
"""

from app import app

# This file can be used to run the app with: python -m src.main
# But the recommended way is to use server.py

if __name__ == "__main__":
    import uvicorn
    from .config import settings
    
    uvicorn.run(
        "app:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )