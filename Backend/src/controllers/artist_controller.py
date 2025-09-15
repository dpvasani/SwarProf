#!/usr/bin/env python3
"""
Artist controller for handling artist information extraction and management
Maintains the same accuracy as the original Flask implementation
"""

import os
from datetime import datetime
from typing import Dict, Any, Optional
from fastapi import HTTPException, UploadFile, status
from werkzeug.utils import secure_filename
from bson import ObjectId

from ..schemas.artist_schemas import ArtistInfo, ExtractionResponse, PaginatedResponse
from ..models.artist_model import artist_model
from ..services.extraction_service import extraction_service
from ..config import settings

class ArtistController:
    
    def __init__(self):
        # Create upload directory if it doesn't exist
        os.makedirs(settings.UPLOAD_FOLDER, exist_ok=True)
    
    def _allowed_file(self, filename: str) -> bool:
        """Check if file extension is allowed"""
        return '.' in filename and filename.rsplit('.', 1)[1].lower() in settings.ALLOWED_EXTENSIONS
    
    async def extract_artist_info(self, file: UploadFile, current_user: Dict[str, Any]) -> ExtractionResponse:
        """
        Extract artist information from uploaded file
        Maintains the same accuracy as the original Flask implementation
        """
        # Validate file
        if not self._allowed_file(file.filename):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type not allowed. Supported formats: {', '.join(settings.ALLOWED_EXTENSIONS)}"
            )
        
        if file.size and file.size > settings.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File too large. Maximum size: {settings.MAX_FILE_SIZE // (1024*1024)}MB"
            )
        
        try:
            # Save uploaded file
            filename = secure_filename(file.filename)
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            saved_filename = f"{timestamp}_{filename}"
            file_path = os.path.join(settings.UPLOAD_FOLDER, saved_filename)
            
            # Save file to disk
            with open(file_path, "wb") as buffer:
                content = await file.read()
                buffer.write(content)
            
            print(f"Processing file: {filename} (saved as: {saved_filename})")
            
            # Extract text from document
            extracted_text = await extraction_service.extract_text(file_path)
            
            if not extracted_text or len(extracted_text.strip()) < 10:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Could not extract meaningful text from the document"
                )
            
            # Get artist information using Gemini
            artist_info_raw = await extraction_service.extract_artist_info_with_gemini(extracted_text)
            
            # Convert to Pydantic model for validation
            try:
                artist_info = ArtistInfo(**artist_info_raw)
            except Exception as e:
                print(f"Validation error: {e}")
                # If validation fails, store raw data
                artist_info = ArtistInfo(
                    summary=f"Raw extraction data (validation failed): {str(artist_info_raw)[:500]}..."
                )
            
            # Save to MongoDB
            artist_doc = {
                "artist_info": artist_info.dict(),
                "original_filename": filename,
                "saved_filename": saved_filename,
                "extracted_text": extracted_text,
                "extraction_status": "completed",
                "created_by": ObjectId(current_user["_id"]),
            }
            
            artist_id = await artist_model.create_artist(artist_doc)
            
            print(f"✅ Results saved to MongoDB with ID: {artist_id}")
            
            # Clean up temporary file
            try:
                os.remove(file_path)
            except Exception as cleanup_error:
                print(f"Warning: Could not clean up temporary file: {cleanup_error}")
            
            return ExtractionResponse(
                success=True,
                artist_id=artist_id,
                filename=filename,
                extracted_text_length=len(extracted_text),
                extracted_text_preview=extracted_text[:200] + "..." if len(extracted_text) > 200 else extracted_text,
                artist_info=artist_info,
                message="Artist information extracted and saved successfully"
            )
            
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error processing file: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error processing file: {str(e)}"
            )
    
    async def list_artists(
        self, 
        page: int = 1, 
        limit: int = 10, 
        search: Optional[str] = None,
        current_user: Dict[str, Any] = None
    ) -> PaginatedResponse:
        """List all artists with pagination and search"""
        skip = (page - 1) * limit
        
        # Get total count
        total = await artist_model.count_documents(search)
        
        # Get artists
        artists = await artist_model.find_all(skip=skip, limit=limit, search=search)
        
        # Convert ObjectId to string
        for artist in artists:
            artist["_id"] = str(artist["_id"])
            artist["created_by"] = str(artist["created_by"])
        
        return PaginatedResponse(
            success=True,
            total=total,
            page=page,
            limit=limit,
            total_pages=(total + limit - 1) // limit,
            data=artists
        )
    
    async def get_artist(self, artist_id: str, current_user: Dict[str, Any]) -> Dict[str, Any]:
        """Get specific artist by ID"""
        try:
            artist = await artist_model.find_by_id(artist_id)
            if not artist:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, 
                    detail="Artist not found"
                )
            
            # Convert ObjectId to string
            artist["_id"] = str(artist["_id"])
            artist["created_by"] = str(artist["created_by"])
            
            return {
                "success": True,
                "artist": artist
            }
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail=f"Invalid artist ID: {str(e)}"
            )
    
    async def list_results(
        self, 
        page: int = 1, 
        limit: int = 10,
        current_user: Dict[str, Any] = None
    ) -> PaginatedResponse:
        """List all extraction results with pagination"""
        skip = (page - 1) * limit
        
        # Get total count
        total = await artist_model.count_documents()
        
        # Get results
        results = await artist_model.find_all(skip=skip, limit=limit)
        
        # Format response
        formatted_results = []
        for result in results:
            formatted_results.append({
                "id": str(result["_id"]),
                "filename": result["original_filename"],
                "artist_name": result["artist_info"].get("artist_name"),
                "extraction_status": result["extraction_status"],
                "created_at": result["created_at"],
                "created_by": str(result["created_by"])
            })
        
        return PaginatedResponse(
            success=True,
            total=total,
            page=page,
            limit=limit,
            total_pages=(total + limit - 1) // limit,
            data=formatted_results
        )
    
    async def get_result(self, result_id: str, current_user: Dict[str, Any]) -> Dict[str, Any]:
        """Get a specific extraction result"""
        try:
            result = await artist_model.find_by_id(result_id)
            if not result:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, 
                    detail="Result not found"
                )
            
            # Convert ObjectId to string
            result["_id"] = str(result["_id"])
            result["created_by"] = str(result["created_by"])
            
            return {
                "success": True,
                "result": result
            }
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail=f"Invalid result ID: {str(e)}"
            )

# Create global instance
artist_controller = ArtistController()