#!/usr/bin/env python3
"""
Artist controller - FastAPI implementation with guaranteed artist name extraction
Fixed workflow that ensures artist_name is NEVER null and AI enhancement works
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
        print("✅ Gemini API configured successfully")
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
        Extract artist name from filename - GUARANTEED to return a valid name
        """
        try:
            print(f"🎯 STEP 1: Extracting artist name from filename: '{filename}'")
            
            # Remove file extension
            name = Path(filename).stem
            print(f"   After removing extension: '{name}'")
            
            # Remove timestamp prefix if present (format: YYYYMMDD_HHMMSS_)
            name = re.sub(r'^\d{8}_\d{6}_', '', name)
            print(f"   After removing timestamp: '{name}'")
            
            # Replace underscores and hyphens with spaces
            name = name.replace('_', ' ').replace('-', ' ')
            print(f"   After replacing separators: '{name}'")
            
            # Title case the name
            name = name.title()
            print(f"   After title case: '{name}'")
            
            # Clean up extra spaces
            name = ' '.join(name.split())
            print(f"   After cleaning spaces: '{name}'")
            
            # Ensure we have a valid name
            if not name or len(name.strip()) < 2:
                name = "Unknown Artist"
                print(f"   Fallback to: '{name}'")
            
            print(f"✅ GUARANTEED Artist Name: '{name}'")
            return name
            
        except Exception as e:
            print(f"❌ Error extracting artist name from filename: {e}")
            return "Unknown Artist"
    
    async def extract_text(self, file_path: str, dpi: int = 300) -> str:
        """Extract text from PDF, DOCX, or image files"""
        print(f"📖 STEP 2: Extracting text from: {file_path}")
        
        ext = Path(file_path).suffix.lower()
        print(f"   File extension: {ext}")

        if ext in [".pdf", ".docx"]:
            doc = fitz.open(file_path)
            print(f"   Successfully opened document with {len(doc)} pages")
            all_text = []
            
            for i, page in enumerate(doc):
                text = page.get_text()
                all_text.append(text)
                print(f"   Page {i+1} text length: {len(text)}")
            
            doc.close()
            result = "\n".join(all_text)
            print(f"✅ Total extracted text length: {len(result)}")
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
            
            print(f"✅ OCR extracted text length: {len(extracted_text)}")
            return extracted_text.strip()

        else:
            raise ValueError(f"Unsupported file type: {ext}")
    
    def create_enhancement_prompt(self, artist_name: str, document_text: str) -> str:
        """Create prompt for AI enhancement with guaranteed artist name"""
        prompt_template = """
# Artist Information Extraction and Enhancement Task

You are an expert information extraction specialist. Please extract comprehensive artist information from the provided document text. The artist name is: "{artist_name}"

## Document Text:
{document_text}

## Required Information to Extract:

Please extract and format the following information as JSON:

1. **Artist Name**: Use "{artist_name}" (confirmed from filename)
2. **Guru/Teacher Names**: Any mentioned teachers, gurus, or mentors
3. **Gharana Details**: Musical/dance tradition, school, style
4. **Biography**: Background, early life, education, career details
5. **Achievements**: Awards, recognitions, performances, accomplishments
6. **Contact Details**: Phone, email, social media, address if mentioned
7. **Summary**: Comprehensive summary of the artist's profile

## Output Format (JSON):

```json
{{
  "artist_name": "{artist_name}",
  "guru_name": "Primary guru/teacher name or null",
  "gharana_details": {{
    "gharana_name": "Gharana name or null",
    "style": "Musical/dance style or null",
    "tradition": "Cultural tradition or null"
  }},
  "biography": {{
    "early_life": "Early life details or null",
    "background": "Background information or null",
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
      "facebook": "Facebook profile/URL or null",
      "twitter": "Twitter handle/URL or null",
      "youtube": "YouTube channel/URL or null",
      "linkedin": "LinkedIn profile/URL or null",
      "spotify": "Spotify artist profile/URL or null",
      "tiktok": "TikTok handle/URL or null",
      "snapchat": "Snapchat handle or null",
      "discord": "Discord handle or null",
      "other": "Any other social media links or null"
    }},
    "contact_info": {{
      "phone_numbers": ["Phone number 1", "Phone number 2"] or null,
      "emails": ["email1@example.com", "email2@example.com"] or null,
      "website": "Website URL or null",
      "phone": "Primary phone number or null",
      "email": "Primary email address or null"
    }},
    "address": {{
      "full_address": "Complete postal address or null",
      "city": "City or null",
      "state": "State/Province or null",
      "country": "Country or null"
    }}
  }},
  "summary": "Comprehensive summary of the artist based on the document",
  "extraction_confidence": "high/medium/low",
  "additional_notes": "Any other relevant information"
}}
```

## Guidelines:
- ALWAYS use "{artist_name}" as the artist_name
- Extract information ONLY from the provided document text
- Use null for information not found in the document
- Be accurate and factual
- Generate a comprehensive summary based on available information
- For contact details: Extract all phone numbers, email addresses, social media handles, websites
- For social media: Look for Instagram, Facebook, Twitter, YouTube, LinkedIn, Spotify, TikTok handles or URLs
- For addresses: Extract any postal addresses, cities, states, countries mentioned
- If contact information is not found in the document, set the corresponding field to null
- When enhancing artist data, try to find missing contact details from reliable online sources
- If information still cannot be found after enhancement, keep fields as null

Please analyze the document and provide the extracted information in the exact JSON format specified.
"""
        return prompt_template.format(artist_name=artist_name, document_text=document_text)
    
    def create_comprehensive_enhancement_prompt(self, artist_name: str, existing_data: dict, document_text: str = "") -> str:
        """Create prompt for comprehensive AI enhancement that refines ALL extracted data"""
        prompt_template = """# Comprehensive Artist Information Enhancement and Refinement Task

You are an expert information analyst and enhancement specialist. Take the following extracted data as raw input. The extraction may contain missing fields, inaccurate values, fragmented text, grammar mistakes, and poor formatting.

Your task is to comprehensively refine, correct, and enhance ALL of the extracted information. Specifically:

1. **Use all extracted details as context** – do not limit enhancement to only missing (null) fields
2. **Fix inaccuracies or inconsistencies** caused by poor extraction
3. **Repair broken or fragmented text**, ensuring proper grammar, spelling, sentence structure, and readability
4. **Improve formatting** – make the output clean, professional, and human-readable
5. **Enrich and polish** the biography/details so that the final version is complete, accurate, and coherent
6. **Ensure the final response** looks like a carefully edited and enhanced version of the extracted input

## Artist Name: {artist_name}

## Raw Extracted Data (may contain errors, fragments, formatting issues):
```json
{existing_data}
```

## Original Document Text (for additional context):
{document_text}

## Example of Enhancement Quality Expected:

**Input (raw extraction):**
Biography: "SHUBHODEEP SINHA  is a 15 year Indian national brought up In Shanghai.  Studying in grade 10 in Livingston American School.   SHUBHO as we fondly call him  is a  musical prodigy who has developed immense interest in Indian Classical Music at a very young age."

**Output (enhanced):**
Biography: "Shubhodeep Sinha is a 15-year-old Indian national who was brought up in Shanghai. He is currently studying in Grade 10 at Livingston American School. Fondly called 'Shubho,' he is a musical prodigy with a deep passion for Indian Classical Music, which he began exploring at a very young age."

## Output Requirements:

Produce a completely refined and enhanced JSON response. Fix ALL text formatting, grammar, and presentation issues:

```json
{{
  "artist_name": "{artist_name}",
  "guru_name": "Enhanced and corrected guru/teacher name with proper formatting or null",
  "gharana_details": {{
    "gharana_name": "Refined gharana name with proper formatting or null",
    "style": "Enhanced musical/dance style description with proper grammar or null",
    "tradition": "Improved cultural tradition description with clean formatting or null"
  }},
  "biography": {{
    "early_life": "Refined and enhanced early life details with proper grammar and formatting or null",
    "background": "Improved background information with perfect grammar, proper sentence structure, and professional presentation or null",
    "education": "Enhanced education details with corrections and proper formatting or null",
    "career_highlights": "Refined career highlights with better presentation and clean language or null"
  }},
  "achievements": [
    {{
      "type": "Refined achievement type with proper formatting",
      "title": "Enhanced and corrected achievement title with proper grammar",
      "year": "Validated year or null",
      "details": "Improved achievement details with better description and clean formatting or null"
    }}
  ],
  "contact_details": {{
    "social_media": {{
      "instagram": "Validated and properly formatted Instagram handle/URL or null",
      "facebook": "Enhanced and properly formatted Facebook profile/URL or null",
      "twitter": "Corrected and properly formatted Twitter handle/URL or null",
      "youtube": "Refined and properly formatted YouTube channel/URL or null",
      "linkedin": "Enhanced and properly formatted LinkedIn profile/URL or null",
      "spotify": "Corrected and properly formatted Spotify artist profile/URL or null",
      "tiktok": "Validated and properly formatted TikTok handle/URL or null",
      "snapchat": "Enhanced and properly formatted Snapchat handle or null",
      "discord": "Corrected and properly formatted Discord handle or null",
      "other": "Any other validated social media links or null"
    }},
    "contact_info": {{
      "phone_numbers": ["Validated and properly formatted phone numbers"] or null,
      "emails": ["Corrected and properly formatted email addresses"] or null,
      "website": "Enhanced and properly formatted website URL or null",
      "phone": "Primary validated and properly formatted phone number or null",
      "email": "Primary validated and properly formatted email address or null"
    }},
    "address": {{
      "full_address": "Enhanced and properly formatted complete address with correct grammar or null",
      "city": "Corrected and properly formatted city name or null",
      "state": "Enhanced and properly formatted state/province name or null",
      "country": "Validated and properly formatted country name or null"
    }}
  }},
  "summary": "Completely rewritten, comprehensive, and well-structured summary with perfect grammar, proper sentence structure, and professional presentation that presents the artist's profile in an engaging manner",
  "extraction_confidence": "Updated confidence level based on enhancement quality (high/medium/low)",
  "additional_notes": "Enhanced notes with proper formatting including information about corrections made, data quality improvements, grammar fixes, formatting improvements, and any important observations about the comprehensive enhancement process"
}}
```

## CRITICAL ENHANCEMENT GUIDELINES:

1. **Fix ALL Text Issues**: Correct grammar, spelling, punctuation, capitalization, and sentence structure
2. **Improve Formatting**: Remove extra spaces, fix capitalization, ensure proper punctuation
3. **Enhance Readability**: Rewrite fragmented text into smooth, natural language
4. **Professional Presentation**: Make all text sound polished and professional
5. **Comprehensive Enhancement**: Improve ALL existing data, not just missing fields
6. **Maintain Accuracy**: Only enhance with information supported by the source document
7. **Document Changes**: Note significant improvements in the additional_notes field

Always output the final enhanced version of the data with perfect formatting and grammar.
"""
        return prompt_template.format(
            artist_name=artist_name,
            existing_data=json.dumps(existing_data, indent=2),
            document_text=document_text[:2000] + "..." if len(document_text) > 2000 else document_text
        )

    async def extract_with_gemini(self, artist_name: str, document_text: str) -> dict:
        """Extract artist information using Gemini AI with guaranteed artist name"""
        try:
            print(f"🤖 STEP 3: Sending to Gemini AI for enhancement...")
            print(f"   Artist Name: '{artist_name}'")
            print(f"   Document Text Length: {len(document_text)}")
            
            if self.gemini_model is None:
                if genai is not None and settings.GEMINI_API_KEY:
                    self.gemini_model = genai.GenerativeModel("gemini-1.5-flash")
                else:
                    print("⚠️ Gemini not available, using fallback")
                    return self.create_fallback_data(artist_name, document_text)
            
            prompt = self.create_enhancement_prompt(artist_name, document_text)
            response = self.gemini_model.generate_content(prompt)
            content = response.text.strip()
            
            print(f"   Gemini response length: {len(content)}")
            
            # Parse JSON from response
            json_str = content
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
            
            # GUARANTEE artist name is set
            data["artist_name"] = artist_name
            
            print("✅ Gemini extraction successful!")
            print(f"   Artist Name: {data.get('artist_name')}")
            print(f"   Guru Name: {data.get('guru_name')}")
            print(f"   Summary Length: {len(data.get('summary', ''))}")
            
            return data
            
        except json.JSONDecodeError as e:
            print(f"⚠️ JSON parsing error: {e}")
            print("Using fallback data creation...")
            return self.create_fallback_data(artist_name, document_text)
        except Exception as e:
            print(f"❌ Gemini extraction error: {e}")
            return self.create_fallback_data(artist_name, document_text)
    
    async def comprehensive_enhance_with_gemini(self, artist_name: str, existing_data: dict, document_text: str = "") -> dict:
        """Comprehensively enhance and refine ALL artist data using Gemini AI"""
        try:
            print(f"🔍 COMPREHENSIVE AI ENHANCEMENT for: '{artist_name}'")
            print(f"   Existing Data Fields: {len(existing_data)}")
            print(f"   Document Text Length: {len(document_text)}")
            
            if self.gemini_model is None:
                if genai is not None and settings.GEMINI_API_KEY:
                    self.gemini_model = genai.GenerativeModel("gemini-1.5-flash")
                else:
                    print("⚠️ Gemini not available for comprehensive enhancement")
                    return existing_data
            # Parse JSON from response
            prompt = self.create_comprehensive_enhancement_prompt(artist_name, existing_data, document_text)
            response = self.gemini_model.generate_content(prompt)
            content = response.text.strip()
            
            print(f"   Gemini enhancement response length: {len(content)}")
            
            json_str = content
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
            
            enhanced_data = json.loads(json_str)
            
            # GUARANTEE artist name is preserved
            enhanced_data["artist_name"] = artist_name
            
            print("✅ Comprehensive AI enhancement successful!")
            print(f"   Enhanced Artist Name: {enhanced_data.get('artist_name')}")
            print(f"   Enhanced Summary Length: {len(enhanced_data.get('summary', ''))}")
            print(f"   Enhancement Notes: {enhanced_data.get('additional_notes', 'None')[:100]}...")
            
            return enhanced_data
            
        except json.JSONDecodeError as e:
            print(f"⚠️ JSON parsing error during comprehensive enhancement: {e}")
            print("Returning original data with enhancement note...")
            existing_data["additional_notes"] = f"Comprehensive enhancement failed due to parsing error: {str(e)}"
            return existing_data
        except Exception as e:
            print(f"❌ Comprehensive enhancement error: {e}")
            existing_data["additional_notes"] = f"Comprehensive enhancement failed: {str(e)}"
            return existing_data
    def create_fallback_data(self, artist_name: str, document_text: str) -> dict:
        """Create fallback data when AI fails - now with enhanced contact extraction"""
        print(f"🔄 Creating fallback data for: '{artist_name}'")
        
        # Simple text analysis
        text_lower = document_text.lower()
        lines = document_text.split('\n')
        
        # Extract contact information using pattern matching
        contact_details = self._extract_contact_details_from_text(document_text)
        
        # Extract guru names
        guru_name = self._extract_guru_name(lines)
        
        # Extract gharana
        gharana_name = self._extract_gharana_name(lines, text_lower)
        
        # Extract achievements
        achievements = self._extract_achievements(lines)
        
        # Create summary from first few sentences
        sentences = document_text.replace('\n', ' ').split('.')
        summary = '. '.join(sentences[:3]).strip() + '.' if sentences else f"Information about {artist_name}"
        
        # Determine style and tradition
        style = "Indian Classical" if "classical" in text_lower else None
        tradition = "Indian Classical Music" if "classical" in text_lower else None
        
        return {
            "artist_name": artist_name,  # GUARANTEED
            "guru_name": guru_name,
            "gharana_details": {
                "gharana_name": gharana_name,
                "style": style,
                "tradition": tradition
            } if gharana_name else None,
            "biography": {
                "early_life": None,
                "background": summary,
                "education": None,
                "career_highlights": None
            },
            "achievements": achievements,
            "contact_details": contact_details,
            "summary": summary,
            "extraction_confidence": "medium",
            "additional_notes": "Extracted using fallback method with pattern matching"
        }
    
    def _extract_contact_details_from_text(self, text: str) -> dict:
        """Extract contact details using pattern matching"""
        import re
        
        # Phone number patterns
        phone_patterns = [
            r'(?:\+?91[-.\s]?)?[6-9]\d{9}',  # Indian mobile
            r'(?:\+?1[-.\s]?)?[2-9]\d{2}[-.\s]?\d{3}[-.\s]?\d{4}',  # US phone
            r'(?:\+?\d{1,3}[-.\s]?)?\(?\d{3,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}'  # General
        ]
        
        # Email patterns
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        
        # Social media patterns
        social_patterns = {
            'instagram': r'(?:instagram\.com/|@)([a-zA-Z0-9_.]+)',
            'facebook': r'facebook\.com/([a-zA-Z0-9.]+)',
            'twitter': r'(?:twitter\.com/|@)([a-zA-Z0-9_]+)',
            'youtube': r'youtube\.com/(?:channel/|user/|c/)?([a-zA-Z0-9_-]+)',
            'linkedin': r'linkedin\.com/in/([a-zA-Z0-9-]+)',
            'spotify': r'spotify\.com/artist/([a-zA-Z0-9]+)',
            'tiktok': r'tiktok\.com/@([a-zA-Z0-9_.]+)'
        }
        
        # Website patterns
        website_pattern = r'(?:https?://)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:/[^\s]*)?)'
        
        # Extract phone numbers
        phone_numbers = []
        for pattern in phone_patterns:
            matches = re.findall(pattern, text)
            phone_numbers.extend(matches)
        
        # Extract emails
        emails = re.findall(email_pattern, text)
        
        # Extract social media
        social_media = {}
        for platform, pattern in social_patterns.items():
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                social_media[platform] = matches[0]
            else:
                social_media[platform] = None
        
        # Extract websites (exclude social media URLs)
        websites = re.findall(website_pattern, text, re.IGNORECASE)
        website = None
        if websites:
            # Filter out social media websites
            social_domains = ['instagram.com', 'facebook.com', 'twitter.com', 'youtube.com', 'linkedin.com', 'spotify.com', 'tiktok.com']
            for site in websites:
                if not any(domain in site.lower() for domain in social_domains):
                    website = site if site.startswith('http') else f"https://{site}"
                    break
        
        # Extract address information
        address_keywords = ['address', 'located at', 'based in', 'residing in']
        address_info = None
        for line in text.split('\n'):
            line_lower = line.lower()
            for keyword in address_keywords:
                if keyword in line_lower:
                    address_info = line.strip()
                    break
            if address_info:
                break
        
        return {
            "social_media": social_media,
            "contact_info": {
                "phone_numbers": phone_numbers if phone_numbers else None,
                "emails": emails if emails else None,
                "website": website,
                "phone": phone_numbers[0] if phone_numbers else None,
                "email": emails[0] if emails else None
            },
            "address": {
                "full_address": address_info,
                "city": None,
                "state": None,
                "country": None
            } if address_info else None
        }
    
    def _extract_guru_name(self, lines: list) -> str:
        """Extract guru name from text lines"""
        guru_name = None
        guru_keywords = ['guru', 'teacher', 'ustad', 'pandit', 'under', 'trained with', 'student of']
        for line in lines:
            line_lower = line.lower()
            for keyword in guru_keywords:
                if keyword in line_lower:
                    # Try to extract name after keyword
                    words = line.split()
                    for i, word in enumerate(words):
                        if keyword in word.lower() and i < len(words) - 2:
                            potential_guru = ' '.join(words[i+1:i+3])
                            if potential_guru and not guru_name:
                                guru_name = potential_guru.strip('.,')
                                break
                    if guru_name:
                        break
            if guru_name:
                break
        return guru_name
    
    def _extract_gharana_name(self, lines: list, text_lower: str) -> str:
        """Extract gharana name from text"""
        gharana_name = None
        if 'gharana' in text_lower:
            for line in lines:
                if 'gharana' in line.lower():
                    words = line.split()
                    for i, word in enumerate(words):
                        if 'gharana' in word.lower() and i > 0:
                            gharana_name = words[i-1]
                            break
                    break
        return gharana_name
    
    def _extract_achievements(self, lines: list) -> list:
        """Extract achievements from text lines"""
        achievements = []
        achievement_keywords = ['award', 'conferred', 'recognition', 'performed', 'festival', 'honor', 'prize', 'achievement']
        for line in lines:
            line_lower = line.lower()
            for keyword in achievement_keywords:
                if keyword in line_lower:
                    achievements.append({
                        "type": "recognition",
                        "title": line.strip(),
                        "year": None,
                        "details": None
                    })
                    break
        return achievements
    
    async def extract_artist_info(self, file: UploadFile, current_user: Dict[str, Any]) -> Dict[str, Any]:
        """
        MAIN EXTRACTION WORKFLOW - GUARANTEED ARTIST NAME
        """
        print("🚀 STARTING GUARANTEED ARTIST EXTRACTION WORKFLOW")
        print("=" * 60)
        
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
            
            # STEP 1: EXTRACT ARTIST NAME FROM FILENAME FIRST (GUARANTEED)
            filename_artist_name = self.extract_artist_name_from_filename(file.filename)
            print(f"🎯 GUARANTEED ARTIST NAME: '{filename_artist_name}'")
            
            # Save uploaded file
            content = await file.read()
            file_path = save_uploaded_file(content, file.filename)
            saved_filename = os.path.basename(file_path)
            print(f"📁 File saved: {file.filename} → {saved_filename}")
            
            # STEP 2: EXTRACT TEXT
            extracted_text = await self.extract_text(file_path)
            
            if not extracted_text or len(extracted_text.strip()) < 10:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Could not extract meaningful text from the document"
                )
            
            print(f"📖 Text extracted: {len(extracted_text)} characters")
            
            # STEP 3: AI ENHANCEMENT WITH GUARANTEED ARTIST NAME
            print("🤖 STEP 3: Basic AI extraction...")
            artist_info_raw = await self.extract_with_gemini(filename_artist_name, extracted_text)
            
            # STEP 4: COMPREHENSIVE AI ENHANCEMENT - Refine and improve ALL extracted data
            print("🔄 STEP 4: COMPREHENSIVE AI ENHANCEMENT")
            try:
            
            # STEP 4: FINAL GUARANTEE - ENSURE ARTIST NAME IS SET
            if not enhanced_artist_info_raw.get("artist_name"):
                enhanced_artist_info_raw["artist_name"] = filename_artist_name
                print(f"🛡️ FINAL SAFETY: Set artist_name to '{filename_artist_name}'")
            
            print(f"✅ FINAL ENHANCED ARTIST NAME: '{enhanced_artist_info_raw['artist_name']}'")
            
            # Log enhancement details
            if enhanced_artist_info_raw.get("summary"):
                print(f"📝 Enhanced Summary Preview: {enhanced_artist_info_raw['summary'][:100]}...")
            if enhanced_artist_info_raw.get("additional_notes"):
                print(f"📋 Enhancement Notes: {enhanced_artist_info_raw['additional_notes'][:100]}...")
            
            # STEP 5: VALIDATE AND CREATE PYDANTIC MODEL
            try:
                artist_info_obj = ArtistInfo(**enhanced_artist_info_raw)
                print("✅ Enhanced data validation successful")
            except Exception as e:
                print(f"⚠️ Enhanced data validation error: {e}")
                # Create minimal valid object with guaranteed artist name
                artist_info_obj = ArtistInfo(
                    artist_name=filename_artist_name,
                    summary=f"Enhanced artist information for {filename_artist_name}",
                    additional_notes="Comprehensive enhancement applied but validation failed"
                )
                print(f"✅ Fallback validation with artist_name='{filename_artist_name}'")
            
            # STEP 6: SAVE TO MONGODB
            print("💾 Saving to MongoDB...")
            artist_doc = {
                "artist_info": artist_info_obj.dict(),
                "original_filename": file.filename,
                "saved_filename": saved_filename,
                "extracted_text": extracted_text,
                "extraction_status": "completed",
                "created_by": ObjectId(current_user["_id"]),
            }
            
            # FINAL SAFETY CHECK
            if not artist_doc["artist_info"].get("artist_name"):
                artist_doc["artist_info"]["artist_name"] = filename_artist_name
                print(f"🛡️ MONGODB SAFETY: Set artist_name to '{filename_artist_name}'")
            
            artist_id = await artist_model.create_artist(artist_doc)
            print(f"✅ Saved to MongoDB with ID: {artist_id}")
            
            # Clean up
            cleanup_temp_file(file_path)
            
            print("🎉 COMPREHENSIVE EXTRACTION & ENHANCEMENT COMPLETED SUCCESSFULLY!")
            print(f"🎯 ARTIST NAME GUARANTEED: '{artist_info_obj.artist_name}'")
            print(f"🔍 COMPREHENSIVE ENHANCEMENT: Applied to all extracted data")
            print("=" * 60)
            
            return {
                "success": True,
                "artist_id": artist_id,
                "filename": file.filename,
                "guaranteed_artist_name": filename_artist_name,
                "extracted_text_length": len(extracted_text),
                "extracted_text_preview": extracted_text[:200] + "...\" if len(extracted_text) > 200 else extracted_text,
                "artist_info": artist_info_obj.dict(),
                "message": "Artist information extracted and comprehensively enhanced with GUARANTEED artist name"
            }
            
        except HTTPException:
            raise
        except Exception as e:
            print(f"❌ CRITICAL ERROR: {str(e)}")
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


    async def enhance_artist_contact_details(self, artist_id: str, current_user: Dict[str, Any]) -> Dict[str, Any]:
        """
        Comprehensively enhance existing artist data by refining, correcting, and improving ALL extracted information
        """
        try:
            print(f"🔍 STARTING COMPREHENSIVE ARTIST ENHANCEMENT for ID: {artist_id}")
            print("=" * 60)
            
            # Get existing artist data
            artist_doc = await artist_model.find_by_id(artist_id)
            if not artist_doc:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Artist not found"
                )
            
            # Extract existing data
            existing_artist_info = artist_doc.get("artist_info", {})
            artist_name = existing_artist_info.get("artist_name", "Unknown Artist")
            original_text = artist_doc.get("extracted_text", "")
            
            print(f"🎯 Artist: {artist_name}")
            print(f"📝 Original text length: {len(original_text)}")
            print(f"📊 Existing data fields: {len(existing_artist_info)}")
            
            # Initialize Gemini if needed
            if self.gemini_model is None:
                await self.initialize()
            
            # Check if Gemini is available after initialization
            if self.gemini_model is None:
                print("❌ Gemini model not available")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="AI comprehensive enhancement service not available - Gemini API not configured"
                )
            
            print("✅ Gemini model available, proceeding with comprehensive enhancement...")
            
            # Perform comprehensive enhancement
            enhanced_data = await self.comprehensive_enhance_with_gemini(
                artist_name, 
                existing_artist_info, 
                original_text
            )
            
            print(f"🔍 Enhancement completed, validating data...")
            
            # Validate enhanced data with Pydantic
            try:
                enhanced_artist_info = ArtistInfo(**enhanced_data)
                print("✅ Comprehensive enhanced data validation successful")
            except Exception as e:
                print(f"⚠️ Comprehensive enhanced data validation error: {e}")
                # Keep original data if validation fails
                enhanced_artist_info = ArtistInfo(**existing_artist_info)
                enhanced_artist_info.additional_notes = f"Comprehensive enhancement failed validation: {str(e)}"
            
            # Update the artist document
            update_data = {
                "artist_info": enhanced_artist_info.dict(),
                "enhancement_status": "comprehensively_enhanced",
                "enhanced_at": datetime.utcnow(),
                "enhancement_type": "comprehensive_refinement"
            }
            
            success = await artist_model.update_artist(artist_id, update_data)
            
            if success:
                print("✅ Artist data comprehensively enhanced and saved successfully!")
                print("🎉 COMPREHENSIVE ENHANCEMENT COMPLETED!")
                print("=" * 60)
                
                return {
                    "success": True,
                    "artist_id": artist_id,
                    "artist_name": artist_name,
                    "enhanced_data": enhanced_artist_info.dict(),
                    "enhancement_type": "comprehensive_refinement",
                    "message": "Artist information comprehensively enhanced - all data refined, corrected, and improved"
                }
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to save comprehensively enhanced data"
                )
                
        except HTTPException:
            raise
        except Exception as e:
            print(f"❌ Comprehensive enhancement error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error comprehensively enhancing artist data: {str(e)}"
            )

# Create global instance
artist_controller = ArtistController()