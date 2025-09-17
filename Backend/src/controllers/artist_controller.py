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
            # Initialize OCR model
            if not self.ocr_model:
                try:
                    self.ocr_model = ocr_predictor(pretrained=True)
                except Exception as e:
                    print(f"Warning: failed to initialize OCR model: {e}")
                    self.ocr_model = None

            # Initialize Gemini model only if SDK and API key are available
            if genai is not None and settings.GEMINI_API_KEY:
                try:
                    self.gemini_model = genai.GenerativeModel("gemini-1.5-flash")
                except Exception as e:
                    print(f"Warning: failed to initialize Gemini model: {e}")
                    self.gemini_model = None
            else:
                self.gemini_model = None

            print("✅ Artist controller initialized (partial models may be unavailable)")
        except Exception as e:
            # Do not raise — we want the API to start even if models fail to initialize
            print(f"❌ Failed to initialize models: {e}")
            self.ocr_model = None
            self.gemini_model = None
    
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

IMPORTANT: You must return valid JSON. Do not include any markdown formatting or code blocks.

## Required Information to Extract:

1. **Artist Name** - Full name of the artist/performer
2. **Guru Name** - Teacher/mentor/guru name (if mentioned)
3. **Gharana Details** - Musical/dance tradition, school, style
4. **Biography** - Background, early life, education details
5. **Achievements** - Awards, recognitions, performances, accomplishments
6. **Contact Details** - Phone, email, social media, address
7. **Summary** - Comprehensive summary based on extracted information

## Output Format - Return ONLY this JSON structure with no additional text:

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

## Guidelines:
- Only extract explicitly mentioned information
- Use null for missing information
- Handle OCR errors intelligently
- Focus on accuracy over completeness
- Generate a factual summary based only on extracted data
- Return ONLY the JSON object, no additional text or formatting

## Document Text to Analyze:

{document_text}

Analyze the text and return ONLY the JSON object:
"""
        return prompt_template.format(document_text=document_text)
    
    async def extract_artist_info_with_gemini(self, document_text: str) -> dict:
        """Call Gemini API - same logic as original"""
        try:
            if not self.gemini_model:
                await self.initialize()

            if not self.gemini_model:
                # Gemini not available — return helpful error instead of raising
                print("⚠️ Gemini not available, using fallback extraction")
                return self.fallback_extraction(document_text)

            prompt = self.create_gemini_prompt(document_text)
            print(f"📝 Sending prompt to Gemini (text length: {len(document_text)})")

            response = self.gemini_model.generate_content(prompt)
            if not response or not response.text:
                print("❌ Empty response from Gemini")
                return self.fallback_extraction(document_text)
                
            content = response.text.strip()
            print(f"📥 Received response from Gemini (length: {len(content)})")
            
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
            
            print(f"🔍 Extracted JSON string: {json_str[:200]}...")
            data = json.loads(json_str)
            print("✅ Successfully extracted and parsed artist information!")
            
            # Validate that we got meaningful data
            if not data.get('artist_name') and not data.get('summary'):
                print("⚠️ Gemini returned empty data, using fallback")
                return self.fallback_extraction(document_text)
                
            return data
            
        except json.JSONDecodeError as e:
            print("Using fallback extraction due to JSON parsing error")
            return self.fallback_extraction(document_text)
        except Exception as e:
            print(f"❌ Unexpected error: {e}")
            print("Using fallback extraction due to unexpected error")
            return self.fallback_extraction(document_text)
    
    def fallback_extraction(self, document_text: str) -> dict:
        """Fallback extraction using simple text processing when Gemini fails"""
        print("🔄 Using fallback extraction method")
        
        # Simple text analysis to extract basic information
        lines = document_text.split('\n')
        text_lower = document_text.lower()
        
        # Try to find artist name (usually in first few lines or all caps)
        artist_name = None
        for line in lines[:5]:  # Check first 5 lines
            line = line.strip()
            if line and (line.isupper() or len(line.split()) <= 4):
                # Likely a name if it's short and/or all caps
                artist_name = line.title()
                break
        
        # Extract key information using keyword matching
        guru_name = None
        gharana = None
        achievements = []
        
        # Look for guru/teacher mentions
        guru_keywords = ['guru', 'teacher', 'disciple of', 'student of', 'learned from', 'ustad', 'pandit']
        for keyword in guru_keywords:
            if keyword in text_lower:
                # Find the line containing the keyword
                for line in lines:
                    if keyword in line.lower():
                        # Extract potential guru name
                        words = line.split()
                        for i, word in enumerate(words):
                            if keyword.lower() in word.lower() and i < len(words) - 1:
                                # Take next few words as potential guru name
                                potential_guru = ' '.join(words[i+1:i+4])
                                if potential_guru and not guru_name:
                                    guru_name = potential_guru.strip('.,')
                                break
                        break
        
        # Look for gharana mentions
        if 'gharana' in text_lower:
            for line in lines:
                if 'gharana' in line.lower():
                    words = line.split()
                    for i, word in enumerate(words):
                        if 'gharana' in word.lower() and i > 0:
                            gharana = words[i-1]
                            break
                    break
        
        # Look for achievements/performances
        achievement_keywords = ['performed', 'concert', 'award', 'recognition', 'festival', 'competition']
        for keyword in achievement_keywords:
            if keyword in text_lower:
                for line in lines:
                    if keyword in line.lower():
                        achievements.append({
                            "type": "performance",
                            "title": line.strip(),
                            "year": None,
                            "details": None
                        })
                        break
        
        # Create summary from first paragraph or first few sentences
        summary = None
        if document_text:
            sentences = document_text.replace('\n', ' ').split('.')
            if len(sentences) > 0:
                summary = '. '.join(sentences[:3]).strip() + '.'
        
        return {
            "artist_name": artist_name,
            "guru_name": guru_name,
            "gharana_details": {
                "gharana_name": gharana,
                "style": None,
                "tradition": "Indian Classical" if "classical" in text_lower else None
            } if gharana else None,
            "biography": {
                "early_life": None,
                "background": summary,
                "education": None,
                "career_highlights": None
            },
            "achievements": achievements,
            "contact_details": None,
            "summary": summary,
            "extraction_confidence": "medium",
            "additional_notes": "Extracted using fallback method due to AI processing issues"
        }
    
    def extract_artist_name_from_filename(self, filename: str) -> str:
        """Extract artist name from filename"""
        try:
            # Remove file extension
            name = Path(filename).stem
            
            # Remove timestamp prefix if present (format: YYYYMMDD_HHMMSS_)
            import re
            name = re.sub(r'^\d{8}_\d{6}_', '', name)
            
            # Replace underscores and hyphens with spaces
            name = name.replace('_', ' ').replace('-', ' ')
            
            # Title case the name
            name = name.title()
            
            # Clean up extra spaces
            name = ' '.join(name.split())
            
            print(f"📝 Extracted artist name from filename '{filename}': '{name}'")
            return name
            
        except Exception as e:
            print(f"❌ Error extracting name from filename: {e}")
            return "Unknown Artist"
    
    def create_enhancement_prompt(self, extracted_data: dict, artist_name: str, document_text: str) -> str:
        """Create prompt for enhancing extracted data with filename-derived artist name"""
        prompt_template = """
# Artist Information Enhancement Task

You are an expert information extraction specialist. I have partially extracted artist information that contains some null values. Please enhance and complete this information using the provided document text and the artist name derived from the filename.

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
            
            enhanced_data = json.loads(json_str)
            print("✅ Successfully enhanced artist information with Gemini!")
            
            # Ensure artist name is set
            enhanced_data["artist_name"] = artist_name
            return enhanced_data
            
        except json.JSONDecodeError as e:
            print(f"⚠️ JSON parsing error during enhancement: {e}")
            extracted_data["artist_name"] = artist_name
            extracted_data["additional_notes"] = "Enhanced with filename-derived artist name (JSON parsing failed)"
            return extracted_data
        except Exception as e:
            print(f"❌ Unexpected error during enhancement: {e}")
            extracted_data["artist_name"] = artist_name
            extracted_data["additional_notes"] = "Enhanced with filename-derived artist name (enhancement failed)"
            return extracted_data
    
    
    async def extract_artist_info(self, file: UploadFile, current_user: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract artist information from uploaded file
        Maintains the same accuracy as the original Flask implementation
        """
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
            # Save uploaded file using utility
            try:
                content = await file.read()
                file_path = save_uploaded_file(content, file.filename)
                filename = file.filename
                saved_filename = os.path.basename(file_path)
                print(f"Processing file: {filename} (saved as: {saved_filename})")
            except Exception as e:
                print(f"Error while saving uploaded file: {e}")
                # Surface a meaningful error to the client
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Error processing file: {str(e)}"
                )
            
            # Extract text from document
            extracted_text = await self.extract_text(file_path)
            
            if not extracted_text or len(extracted_text.strip()) < 10:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Could not extract meaningful text from the document"
                )
            
            # Extract artist name from filename as fallback
            filename_artist_name = self.extract_artist_name_from_filename(filename)
            print(f"📝 Artist name from filename: {filename_artist_name}")
            
            # Step 1: Extract artist name from filename
            filename_artist_name = self.extract_artist_name_from_filename(filename)
            print(f"🎯 Artist name from filename: {filename_artist_name}")
            
            # Step 2: Get initial artist information using Gemini
            artist_info_raw = await self.extract_artist_info_with_gemini(extracted_text)
            
            # Step 3: Check if artist_name is null and enhance with filename
            if not artist_info_raw.get("artist_name") or artist_info_raw.get("artist_name") in [None, "", "null"]:
                print(f"🔄 Artist name is null, using filename: {filename_artist_name}")
                print("🚀 Enhancing extracted data with Gemini using filename-derived artist name...")
                
                # Enhance the data with filename-derived artist name
                artist_info_raw = await self.enhance_artist_info_with_gemini(
                    artist_info_raw, 
                    filename_artist_name, 
                    extracted_text
                )
            else:
                print(f"✅ Artist name found in extraction: {artist_info_raw.get('artist_name')}")
            
            # Check if artist_name is null and use filename fallback + enhancement
            if not artist_info_raw.get('artist_name') or artist_info_raw.get('artist_name') in [None, '', 'null']:
                print(f"🔄 Artist name is null, using filename fallback: {filename_artist_name}")
                artist_info_raw['artist_name'] = filename_artist_name
                
                # Enhance the data with Gemini using filename artist name
                enhanced_info = await self.enhance_artist_info_with_gemini(
                    artist_info_raw, filename_artist_name, extracted_text
                )
                if enhanced_info:
                    artist_info_raw = enhanced_info
                    print("✅ Artist info enhanced with Gemini using filename artist name")
            
            # Convert to Pydantic model for validation
            try:
                artist_info = ArtistInfo(**artist_info_raw)
            except Exception as e:
                print(f"Validation error: {e}")
                # If validation fails, store raw data
                artist_info = ArtistInfo(
                    artist_name=filename_artist_name,  # Ensure we have at least the filename
                    artist_name=filename_artist_name,  # Ensure we at least have the filename artist name
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
            cleanup_temp_file(file_path)
            
            return {
                "success": True,
                "artist_id": artist_id,
                "filename": filename,
                "filename_artist_name": filename_artist_name,
                "extracted_text_length": len(extracted_text),
                "extracted_text_preview": extracted_text[:200] + "..." if len(extracted_text) > 200 else extracted_text,
                "extracted_text": extracted_text,
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