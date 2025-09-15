#!/usr/bin/env python3
"""
Artist information extraction service
Maintains the same accuracy as the original Flask implementation
"""

import os
import json
import fitz  # PyMuPDF
import asyncio
from pathlib import Path
from doctr.io import DocumentFile
from doctr.models import ocr_predictor
import google.generativeai as genai
import re
from config import settings

# Configure Gemini API
genai.configure(api_key=settings.GEMINI_API_KEY)

class ExtractionService:
    def __init__(self):
        self.ocr_model = None
        self.gemini_model = None
    
    async def initialize(self):
        """Initialize OCR and Gemini models"""
        try:
            # Initialize OCR model
            self.ocr_model = ocr_predictor(pretrained=True)
            
            # Initialize Gemini model
            self.gemini_model = genai.GenerativeModel("gemini-1.5-flash")
            
            print("✅ Extraction service initialized successfully")
        except Exception as e:
            print(f"❌ Failed to initialize extraction service: {e}")
            raise

    async def extract_text(self, file_path: str, dpi: int = 300) -> str:
        """
        Extract text from PDF, DOCX, or image files
        Maintains the same accuracy as the original Flask implementation
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
        """
        Create a complete prompt for Gemini to extract artist information
        Maintains the same prompt structure for consistency
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

    async def extract_artist_info_with_gemini(self, document_text: str) -> dict:
        """
        Call Gemini API with improved JSON parsing
        Maintains the same accuracy as the original implementation
        """
        try:
            if not self.gemini_model:
                await self.initialize()
            
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

# Create global instance
extraction_service = ExtractionService()