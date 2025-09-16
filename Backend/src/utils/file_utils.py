#!/usr/bin/env python3
"""
File handling utilities
"""

import os
import shutil
from pathlib import Path
from typing import Optional
from datetime import datetime
from ..config import settings

def secure_filename(filename):
    """Secure a filename by removing unsafe characters"""
    import re
    # Remove path separators and other unsafe characters
    # First, remove any characters that aren't alphanumeric, spaces, dots, underscores, or hyphens
    filename = re.sub(r'[^A-Za-z0-9\s._\-]', '', filename).strip()
    
    # Replace multiple spaces, hyphens, or underscores with a single underscore
    filename = re.sub(r'[\s_\-]+', '_', filename)
    
    # Remove leading/trailing underscores and ensure we have a valid filename
    filename = filename.strip('_')
    
    # If filename is empty or too short, provide a fallback
    if not filename or len(filename) < 1:
        filename = 'unnamed_file'
    
    return filename

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
    secure_name = secure_filename(original_filename)
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    return f"{timestamp}_{secure_name}"

def save_uploaded_file(file_content: bytes, filename: str) -> str:
    """Save uploaded file and return the path"""
    ensure_upload_directory()
    unique_filename = create_unique_filename(filename)
    file_path = os.path.join(settings.UPLOAD_FOLDER, unique_filename)
    
    with open(file_path, "wb") as buffer:
        buffer.write(file_content)
    
    return file_path