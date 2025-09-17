#!/usr/bin/env python3
"""
Configuration settings for the FastAPI application
"""

import os
from typing import List, Set
from pathlib import Path
from dotenv import load_dotenv

# Attempt to load .ev from project root (two levels up from this file: Backend/src -> Backend)
project_root = Path(__file__).resolve().parents[1]
dot_env_path = project_root / '.ev'
if dot_env_path.exists():
    load_dotenv(dot_env_path)
    print(f"Loaded environment from: {dot_env_path}")
else:
    # Fallback to default dotenv behavior (current working directory)
    load_dotenv()
    print(f".ev not found at {dot_env_path}, attempted default load_dotenv()")

def create_directories():
    """Create necessary directories"""
    import os
    os.makedirs("uploads", exist_ok=True)
    os.makedirs("results", exist_ok=True)

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
    
    def __post_init__(self):
        """Validate configuration after initialization"""
        if not self.GEMINI_API_KEY:
            print("⚠️ Warning: GEMINI_API_KEY not set. AI extraction will use fallback method.")
    
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

# Create settings instance
settings = Settings()

# Create directories on import
create_directories()