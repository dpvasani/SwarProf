#!/usr/bin/env python3
"""
File handling utilities
"""

import os
import shutil
from pathlib import Path
from typing import Optional
from ..config import settings

def ensure_upload_directory():
    """Ensure upload directory exists"""
    os.makedirs(settings.UPLOAD_FOLDER, exist_ok=True)
    os.makedirs(settings.RESULTS_FOLDER, exist_ok=True)

def cleanup_temp_file(file_path: str) -> bool:
    """Clean up temporary file"""
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            return True
    except Exception as e:
        print(f"Warning: Could not clean up temporary file {file_path}: {e}")
    return False

def get_file_extension(filename: str) -> Optional[str]:
    """Get file extension"""
    if '.' in filename:
        return filename.rsplit('.', 1)[1].lower()
    return None

def is_allowed_file(filename: str) -> bool:
    """Check if file extension is allowed"""
    ext = get_file_extension(filename)
    return ext in settings.ALLOWED_EXTENSIONS if ext else False

def get_file_size(file_path: str) -> int:
    """Get file size in bytes"""
    try:
        return os.path.getsize(file_path)
    except OSError:
        return 0

def create_unique_filename(original_filename: str) -> str:
    """Create unique filename with timestamp"""
    from datetime import datetime
    from werkzeug.utils import secure_filename
    
    secure_name = secure_filename(original_filename)
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    return f"{timestamp}_{secure_name}"