#!/usr/bin/env python3
"""
Configuration settings for the FastAPI application
"""

import os
from typing import List, Set

class Settings:
    # Application settings
    APP_NAME: str = "Artist Information Extraction API"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    
    # Server settings
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    
    # Database settings
    MONGODB_URL: str = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "artist_extraction_db")
    
    # Security settings
    JWT_SECRET: str = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRATION_HOURS: int = int(os.getenv("JWT_EXPIRATION_HOURS", "24"))
    
    # AI/ML settings
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    # File upload settings
    MAX_FILE_SIZE: int = int(os.getenv("MAX_FILE_SIZE", str(16 * 1024 * 1024)))  # 16MB
    UPLOAD_FOLDER: str = os.getenv("UPLOAD_FOLDER", "uploads")
    RESULTS_FOLDER: str = os.getenv("RESULTS_FOLDER", "results")
    
    # Allowed file extensions
    ALLOWED_EXTENSIONS: Set[str] = {'pdf', 'docx', 'jpg', 'jpeg', 'png', 'bmp', 'tiff'}
    
    # CORS settings
    CORS_ORIGINS: List[str] = os.getenv("CORS_ORIGINS", "*").split(",")
    
    # Logging settings
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    # Create upload directories
    def __post_init__(self):
        import os
        os.makedirs(self.UPLOAD_FOLDER, exist_ok=True)
        os.makedirs(self.RESULTS_FOLDER, exist_ok=True)

# Create settings instance
settings = Settings()

# Ensure directories exist
import os
os.makedirs(settings.UPLOAD_FOLDER, exist_ok=True)
os.makedirs(settings.RESULTS_FOLDER, exist_ok=True)