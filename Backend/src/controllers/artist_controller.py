#!/usr/bin/env python3
"""
Artist controller - converted from Flask to FastAPI
Maintains the same accuracy as the original Flask implementation
"""

import os
import json
import fitz  # PyMuPDF
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List
from fastapi import HTTPException, UploadFile, status
from werkzeug.utils import secure_filename
from bson import ObjectId
from doctr.io import DocumentFile
from doctr.models import ocr_predictor
import google.generativeai as genai
import re

from ..schemas.artist_schemas import ArtistInfo
from ..models.artist_model import artist_model
from ..config import settings

# Configure Gemini API
genai.configure(api_key=settings.GEMINI_API_KEY)

class ArtistController:
    
    def __init__(self):
        # Create upload directory if it doesn't exist
        os.makedirs(settings.UPLOAD_FOLDER, exist_ok=True)
        self.ocr_model = None
        self.gemini_model = None
    
    async def initialize(self):
        """Initialize OCR and Gemini models"""
        try:
            self.ocr_model = ocr_predictor(pretrained=True)
            self.gemini_model = genai.GenerativeModel("gemini-1.5-flash")
            print("✅ Artist controller initialized successfully")
        except Exception as e:
            print(f"❌ Failed to initialize models: {e}")
            raise
    
    def _allowed_file(self, filename: str) -> bool:
        """Check if file extension is allowed"""
        return '.' in filename and filename.rsplit('.', 1)[1].lower() in settings.ALLOWED_EXTENSIONS
    
    async def extract_text(self, file_path: str, dpi: int = 300) -> str:
        """Extract text from PDF, DOCX, or image files - same as original"""
        print(f"Attempting to open: {file_path}")
        
        ext = Path(file_path).suffix.lower()
        print("File extension:", ext)

        if ext in [".pdf", ".docx"]:
            doc = fitz.open(file_path)
            print(f"Successfully opened document with {len(doc)} pages")
            all_text = []
            
            for i, page in enumerate(doc):
                print(f"Processing page {i+1}")
                text = page.get_text()
                all_text.append(text)
                print(f"Page {i+1} text length: {len(text)}")
            
            doc.close()
            result = "\n".join(all_text)
            print(f"Total extracted text length: {len(result)}")
            return result

        elif ext in [".jpeg", ".jpg", ".png", ".bmp", ".tiff"]:
            if not self.ocr_model:
                await self.initialize()
            
            doc = DocumentFile.from_images(file_path)
            result = self.ocr_model(doc)
            
            extracted_text = ""
            for page in result.pages:
                for block in page.blocks:
                    for line in block.lines:
                        for word in line.words:
                            extracted_text += word.value + " "
                        extracted_text += "\n"
            
            print(f"✅ Extracted text length: {len(extracted_text)}")
            return extracted_text.strip()

        else:
            raise ValueError(f"Unsupported file type: {ext}")
    
    def create_gemini_prompt(self, document_text: str) -> str:
        """Create Gemini prompt - same as original"""
        prompt_template = """
# Artist Information Extraction Task

You are an expert information extraction specialist. Please extract detailed information about artists/performers from the provided document text and format it as JSON.

## Required Information to Extract:

1. **Artist Name** - Full name of the artist/performer
2. **Guru Name** - Teacher/mentor/guru name (if mentioned)
3. **Gharana Details** - Musical/dance tradition, school, style
4. **Biography** - Background, early life, education details
5. **Achievements** - Awards, recognitions, performances, accomplishments
6. **Contact Details** - Phone, email, social media, address
7. **Summary** - Comprehensive summary based on extracted information

## Output Format (JSON):

```json
{{
  "artist_name": "Full name or null",
  "guru_name": "Guru name or null",
  "gharana_details": {{
    "gharana_name": "Gharana name or null",
    "style": "Style/tradition or null",
    "tradition": "Cultural tradition or null"
  }},
  "biography": {{
    "early_life": "Early life details or null",
    "background": "Background info or null", 
    "education": "Education details or null",
    "career_highlights": "Career highlights or null"
  }},
  "achievements": [
    {{
      "type": "award/performance/recognition",
      "title": "Achievement title",
      "year": "Year or null",
      "details": "Additional details or null"
    }}
  ],
  "contact_details": {{
    "social_media": {{
      "instagram": "Instagram handle/URL or null",
      "facebook": "Facebook profile or null", 
      "twitter": "Twitter handle or null",
      "youtube": "YouTube channel or null",
      "other": "Other social media or null"
    }},
    "contact_info": {{
      "phone": "Phone number or null",
      "email": "Email address or null",
      "website": "Website or null"
    }},
    "address": {{
      "full_address": "Complete address or null",
      "city": "City or null",
      "state": "State or null",
      "country": "Country or null"
    }}
  }},
  "summary": "AI-generated comprehensive summary",
  "extraction_confidence": "high/medium/low",
  "additional_notes": "Any other relevant information"
}}
```

## Guidelines:
- Only extract explicitly mentioned information
- Use null for missing information
- Handle OCR errors intelligently
- Focus on accuracy over completeness
- Generate a factual summary based only on extracted data

## Document Text to Analyze:

{document_text}

Please analyze the above text and provide the extracted information in the exact JSON format specified.
"""
        return prompt_template.format(document_text=document_text)
    
    async def extract_artist_info_with_gemini(self, document_text: str) -> dict:
        """Call Gemini API - same logic as original"""
        try:
            if not self.gemini_model:
                await self.initialize()
            
            prompt = self.create_gemini_prompt(document_text)
            
            response = self.gemini_model.generate_content(prompt)
            content = response.text.strip()
            
            # Handle markdown code blocks - same as original
            if "```json" in content:
                json_match = re.search(r'```json\s*\n(.*?)\n```', content, re.DOTALL)
                if json_match:
                    json_str = json_match.group(1)
                else:
                    start = content.find('{')
                    end = content.rfind('}') + 1
                    json_str = content[start:end] if start != -1 and end > start else content
            else:
                start = content.find('{')
                end = content.rfind('}') + 1
                json_str = content[start:end] if start != -1 and end > start else content
            
            data = json.loads(json_str)
            print("✅ Successfully extracted and parsed artist information!")
            return data
            
        except json.JSONDecodeError as e:
            print(f"⚠️ JSON parsing error: {e}")
            return {"raw_response": response.text, "parsing_error": str(e)}
        except Exception as e:
            print(f"❌ Unexpected error: {e}")
            return {"error": str(e), "raw_response": response.text if 'response' in locals() else None}
    
    async def extract_artist_info(self, file: UploadFile, current_user: Dict[str, Any]) -> Dict[str, Any]:
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
            extracted_text = await self.extract_text(file_path)
            
            if not extracted_text or len(extracted_text.strip()) < 10:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Could not extract meaningful text from the document"
                )
            
            # Get artist information using Gemini
            artist_info_raw = await self.extract_artist_info_with_gemini(extracted_text)
            
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
            
            return {
                "success": True,
                "artist_id": artist_id,
                "filename": filename,
                "extracted_text_length": len(extracted_text),
                "extracted_text_preview": extracted_text[:200] + "..." if len(extracted_text) > 200 else extracted_text,
                "artist_info": artist_info.dict(),
                "message": "Artist information extracted and saved successfully"
            }
            
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
    ) -> Dict[str, Any]:
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
        
        return {
            "success": True,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit,
            "artists": artists
        }
    
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
    ) -> Dict[str, Any]:
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
        
        return {
            "success": True,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit,
            "results": formatted_results
        }
    
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