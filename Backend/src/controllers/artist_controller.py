#!/usr/bin/env python3
"""
Artist controller - FastAPI implementation with working Flask workflow
Converted from Flask to FastAPI while maintaining exact same functionality
Includes filename-based fallback to guarantee artist_name is never null
"""

import os
import json
import fitz  # PyMuPDF
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List
from fastapi import HTTPException, UploadFile, status
from bson import ObjectId
from doctr.io import DocumentFile
from doctr.models import ocr_predictor
# Make Gemini optional so server can start without SDK
try:
    import google.generativeai as genai
except Exception:
    genai = None
    print("Warning: google.generativeai SDK not installed; Gemini features will be disabled in ArtistController.")
import re

from ..schemas.artist_schemas import ArtistInfo
from ..models.artist_model import artist_model
from ..config import settings
from ..utils.file_utils import save_uploaded_file, cleanup_temp_file, is_allowed_file
from ..utils.response_utils import handle_validation_error, handle_not_found_error
from werkzeug.utils import secure_filename

# Configure Gemini API (only if SDK is available and key provided)
if genai is not None and settings.GEMINI_API_KEY:
    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
    except Exception as e:
        print(f"Warning: failed to configure Gemini SDK in ArtistController: {e}")
else:
    if genai is None:
        print("Gemini SDK not available in ArtistController; skipping configuration.")
    else:
        print("GEMINI_API_KEY not set; Gemini features disabled in ArtistController.")

class ArtistController:
    
    def __init__(self):
        self.ocr_model = None
        self.gemini_model = None
    
    async def initialize(self):
        """Initialize OCR and Gemini models"""
        try:
            print("🚀 Initializing ArtistController...")
            
            # Initialize OCR model  
            print("📖 Loading OCR model...")
            self.ocr_model = ocr_predictor(pretrained=True)
            print("✅ OCR model loaded successfully")
            
            # Initialize Gemini model (if available)
            if genai is not None and settings.GEMINI_API_KEY:
                try:
                    self.gemini_model = genai.GenerativeModel('gemini-1.5-flash')
                    print("✅ Gemini model initialized successfully")
                except Exception as e:
                    print(f"⚠️ Gemini model initialization failed: {e}")
                    self.gemini_model = None
            else:
                self.gemini_model = None
                print("⚠️ Gemini model not available")
            
            print("✅ ArtistController initialized successfully")
            
        except Exception as e:
            print(f"❌ ArtistController initialization failed: {e}")
    
    def extract_artist_name_from_filename(self, filename: str) -> str:
        """
        Extract artist name from filename as fallback
        This ensures artist_name is never null
        """
        try:
            print(f"🔄 Extracting artist name from filename '{filename}'")
            
            # Remove file extension
            name = Path(filename).stem
            
            # Remove timestamp prefix if present (format: YYYYMMDD_HHMMSS_)
            name = re.sub(r'^\d{8}_\d{6}_', '', name)
            
            # Replace underscores and hyphens with spaces
            name = name.replace('_', ' ').replace('-', ' ')
            
            # Remove common file prefixes/suffixes
            name = re.sub(r'^(copy|scan|img|image|doc|document)(\s+of)?\s*', '', name, flags=re.IGNORECASE)
            name = re.sub(r'\s+(copy|scan|img|image|doc|document)$', '', name, flags=re.IGNORECASE)
            
            # Remove numbers at the start/end that might be page numbers
            name = re.sub(r'^\d+\s*', '', name)
            name = re.sub(r'\s*\d+$', '', name)
            
            # Title case the name
            name = name.title()
            
            # Clean up extra spaces
            name = ' '.join(name.split())
            
            # Ensure we have a valid name
            if not name or len(name.strip()) < 2:
                name = "Unknown Artist"
            
            print(f"✅ Artist name extracted from filename: '{name}'")
            return name
            
        except Exception as e:
            print(f"❌ Error extracting artist name from filename: {e}")
            return "Unknown Artist"
    
    async def extract_text(self, file_path: str, dpi: int = 300) -> str:
        """
        Extract text from PDF, DOCX, or image files
        Based on the working code from the Flask implementation
        """
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
            if self.ocr_model is None:
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
        """
        Create a complete prompt for Gemini to extract artist information
        Based on the working prompt from the Flask implementation
        """
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
    
    async def extract_artist_info_with_gemini_improved(self, document_text: str) -> dict:
        """
        Call Gemini API with better JSON parsing that handles markdown code blocks
        Based on the working function from the Flask implementation
        """
        try:
            if self.gemini_model is None:
                if genai is not None and settings.GEMINI_API_KEY:
                    self.gemini_model = genai.GenerativeModel("gemini-1.5-flash")
                else:
                    print("⚠️ Gemini model not available, using fallback extraction")
                    return self.fallback_extraction(document_text)
            
            prompt = self.create_gemini_prompt(document_text)
            response = self.gemini_model.generate_content(prompt)
            content = response.text.strip()
            
            # Handle markdown code blocks
            if "```json" in content:
                # Extract JSON from markdown code blocks
                json_match = re.search(r'```json\s*\n(.*?)\n```', content, re.DOTALL)
                if json_match:
                    json_str = json_match.group(1)
                else:
                    # Fallback: find JSON between { and }
                    start = content.find('{')
                    end = content.rfind('}') + 1
                    json_str = content[start:end] if start != -1 and end > start else content
            else:
                # Try to find JSON directly
                start = content.find('{')
                end = content.rfind('}') + 1
                json_str = content[start:end] if start != -1 and end > start else content
            
            # Parse the cleaned JSON
            data = json.loads(json_str)
            print("✅ Successfully extracted and parsed artist information!")
            return data
            
        except json.JSONDecodeError as e:
            print(f"⚠️ JSON parsing error: {e}")
            print("But we got a response from Gemini. Saving raw response...")
            return {"raw_response": response.text, "parsing_error": str(e)}
        except Exception as e:
            print(f"❌ Unexpected error: {e}")
            return {"error": str(e), "raw_response": response.text if 'response' in locals() else None}
    
    def fallback_extraction(self, document_text: str) -> dict:
        """Fallback extraction using simple text processing when Gemini fails"""
        print("🔄 Using fallback extraction method")
        
        # Simple text analysis to extract basic information
        lines = document_text.split('\n')
        text_lower = document_text.lower()
        
        # Try to find artist name (usually in first few lines or all caps)
        artist_name = None
        for line in lines[:5]:
            if line.strip() and len(line.strip()) > 2:
                if line.isupper() or any(word.istitle() for word in line.split()):
                    artist_name = line.strip()
                    break
        
        # Create basic structure
        return {
            "artist_name": artist_name,
            "guru_name": None,
            "gharana_details": {
                "gharana_name": None,
                "style": None,
                "tradition": None
            },
            "biography": {
                "early_life": None,
                "background": None,
                "education": None,
                "career_highlights": None
            },
            "achievements": [],
            "contact_details": {
                "social_media": {
                    "instagram": None,
                    "facebook": None,
                    "twitter": None,
                    "youtube": None,
                    "other": None
                },
                "contact_info": {
                    "phone": None,
                    "email": None,
                    "website": None
                },
                "address": {
                    "full_address": None,
                    "city": None,
                    "state": None,
                    "country": None
                }
            },
            "summary": f"Basic extraction from document (Gemini unavailable). Text length: {len(document_text)} characters.",
            "extraction_confidence": "low",
            "additional_notes": "Fallback extraction method used"
        }
    
    async def extract_artist_info(self, file: UploadFile, current_user: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main extraction workflow - FastAPI version of working Flask implementation
        Includes filename-based fallback to guarantee artist_name is never null
        """
        print("🚀 Starting Artist Information Extraction Workflow (FastAPI + Flask logic)")
        
        # Validate file
        if not is_allowed_file(file.filename):
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
            # Initialize if needed
            if self.ocr_model is None:
                await self.initialize()
            
            # Save uploaded file using utility
            try:
                content = await file.read()
                file_path = save_uploaded_file(content, file.filename)
                filename = file.filename
                saved_filename = os.path.basename(file_path)
                print(f"📁 File saved: {filename} → {saved_filename}")
            except Exception as e:
                print(f"❌ Error saving file: {e}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Error processing file: {str(e)}"
                )
            
            # Extract artist name from filename as fallback (GUARANTEE never null)
            filename_artist_name = self.extract_artist_name_from_filename(filename)
            print(f"🎯 FALLBACK Artist Name: '{filename_artist_name}' (from filename)")
            
            # Extract text from document (using working Flask logic)
            extracted_text = await self.extract_text(file_path)
            
            if not extracted_text or len(extracted_text.strip()) < 10:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Could not extract meaningful text from the document"
                )
            
            print(f"✅ Text extraction completed - {len(extracted_text)} characters")
            
            # Get artist information using Gemini (using working Flask logic)
            artist_info = await self.extract_artist_info_with_gemini_improved(extracted_text)
            
            # IMPORTANT: Ensure artist_name is never null using filename fallback
            if not artist_info.get("artist_name"):
                print(f"⚠️ artist_name was null, using filename fallback: '{filename_artist_name}'")
                artist_info["artist_name"] = filename_artist_name
            
            # Add processing metadata
            artist_info["_metadata"] = {
                "filename_artist_name": filename_artist_name,
                "extracted_text_length": len(extracted_text),
                "processing_timestamp": datetime.now().isoformat(),
                "workflow_version": "flask_to_fastapi_v1.0"
            }
            
            # Convert to Pydantic model for validation
            try:
                artist_info_obj = ArtistInfo(**artist_info)
                print("✅ Data validation successful")
            except Exception as e:
                print(f"⚠️ Validation error: {e}")
                # If validation fails, create minimal valid object with guaranteed artist name
                artist_info_obj = ArtistInfo(
                    artist_name=filename_artist_name,  # GUARANTEED from filename
                    summary=f"Artist information extracted from '{filename}'. Raw data available."
                )
                print(f"✅ Fallback validation successful with artist_name='{filename_artist_name}'")
            
            # Save to MongoDB
            print("🔄 Saving to MongoDB...")
            artist_doc = {
                "artist_info": artist_info_obj.dict(),
                "original_filename": filename,
                "saved_filename": saved_filename,
                "extracted_text": extracted_text,
                "extraction_status": "completed",
                "created_by": ObjectId(current_user["_id"]),
            }
            
            # FINAL GUARANTEE: Ensure artist_name is never null before saving
            if not artist_doc["artist_info"].get("artist_name"):
                artist_doc["artist_info"]["artist_name"] = filename_artist_name
                print(f"🛡️ FINAL SAFETY: Set artist_name to '{filename_artist_name}' before saving!")
            
            artist_id = await artist_model.create_artist(artist_doc)
            print(f"✅ Results saved to MongoDB with ID: {artist_id}")
            
            # Clean up temporary file
            cleanup_temp_file(file_path)
            
            print("🎉 Extraction Workflow Completed Successfully!")
            print(f"🎯 Artist Name GUARANTEED: '{artist_info_obj.artist_name}' (never null)")
            
            return {
                "success": True,
                "artist_id": artist_id,
                "filename": filename,
                "filename_artist_name": filename_artist_name,
                "extracted_text_length": len(extracted_text),
                "extracted_text_preview": extracted_text[:200] + "..." if len(extracted_text) > 200 else extracted_text,
                "artist_info": artist_info_obj.dict(),
                "workflow_version": "flask_to_fastapi_v1.0",
                "guarantee": f"artist_name='{artist_info_obj.artist_name}' is GUARANTEED to never be null",
                "message": "Artist information extracted and saved successfully using Flask workflow in FastAPI"
            }
            
        except HTTPException:
            raise
        except Exception as e:
            print(f"❌ Error in extraction workflow: {str(e)}")
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
                raise handle_not_found_error("Artist")
            
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
                raise handle_not_found_error("Result")
            
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