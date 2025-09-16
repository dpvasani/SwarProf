#!/usr/bin/env python3
"""
FastAPI Artist Information Extraction API
Converted from Flask with enhanced functionality and MongoDB integration
"""

import os
from dotenv import load_dotenv
import json
import fitz  # PyMuPDF
import asyncio
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from doctr.io import DocumentFile
from doctr.models import ocr_predictor
# Make Gemini / google.generativeai optional so server can start without the SDK
try:
    import google.generativeai as genai
except Exception:
    genai = None
    print("Warning: google.generativeai SDK not installed; Gemini features will be disabled.")
import re
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from bson import ObjectId
import bcrypt
import jwt
from werkzeug.utils import secure_filename

# Initialize FastAPI app
app = FastAPI(
    title="Artist Information Extraction API",
    description="Advanced API for extracting artist information from documents using AI",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
UPLOAD_FOLDER = 'uploads'
RESULTS_FOLDER = 'results'
ALLOWED_EXTENSIONS = {'pdf', 'docx', 'jpg', 'jpeg', 'png', 'bmp', 'tiff'}
MAX_FILE_SIZE = 16 * 1024 * 1024  # 16MB

# Create directories
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULTS_FOLDER, exist_ok=True)

# Load environment variables from .ev file
print("Loading .ev file:", os.path.abspath('.ev'))
load_dotenv('.ev')
print("Loaded MONGODB_URL:", os.getenv('MONGODB_URL'))

# Environment variables
MONGODB_URL = os.getenv('MONGODB_URL', 'mongodb://localhost:27017')
DATABASE_NAME = os.getenv('DATABASE_NAME', 'artist_extraction_db')
JWT_SECRET = os.getenv('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = os.getenv('JWT_ALGORITHM', 'HS256')
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', 'AIzaSyAVTP0198Qm3HSrwZn9jEle7ZcWPBBOMK8')

# Configure Gemini API (only if SDK is available)
if genai is not None and GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
    except Exception as e:
        print(f"Warning: failed to configure Gemini SDK: {e}")
else:
    if genai is None:
        print("Gemini SDK not available; skipping Gemini configuration.")
    else:
        print("GEMINI_API_KEY not set; Gemini features disabled.")

# MongoDB connection
client = AsyncIOMotorClient(MONGODB_URL)
database = client[DATABASE_NAME]
users_collection = database.users
artists_collection = database.artists

# Security
security = HTTPBearer()

# Pydantic Models
class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

    @classmethod
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., regex=r'^[\w\.-]+@[\w\.-]+\.\w+$')
    full_name: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=6)
    role: str = Field(default="user", regex=r'^(user|admin)$')

class UserLogin(BaseModel):
    username_or_email: str
    password: str

class UserResponse(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    username: str
    email: str
    full_name: str
    role: str
    created_at: datetime
    updated_at: datetime

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class ContactDetails(BaseModel):
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    instagram: Optional[str] = None
    facebook: Optional[str] = None
    twitter: Optional[str] = None
    youtube: Optional[str] = None
    full_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None

class Achievement(BaseModel):
    type: Optional[str] = None
    title: Optional[str] = None
    year: Optional[str] = None
    details: Optional[str] = None

class GharanaDetails(BaseModel):
    gharana_name: Optional[str] = None
    style: Optional[str] = None
    tradition: Optional[str] = None

class Biography(BaseModel):
    early_life: Optional[str] = None
    background: Optional[str] = None
    education: Optional[str] = None
    career_highlights: Optional[str] = None

class ArtistInfo(BaseModel):
    artist_name: Optional[str] = None
    guru_name: Optional[str] = None
    gharana_details: Optional[GharanaDetails] = None
    biography: Optional[Biography] = None
    achievements: Optional[List[Achievement]] = []
    contact_details: Optional[ContactDetails] = None
    summary: Optional[str] = None
    extraction_confidence: Optional[str] = None
    additional_notes: Optional[str] = None

class ArtistDocument(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    artist_info: ArtistInfo
    original_filename: str
    extracted_text: str
    extraction_status: str = Field(default="completed")
    created_by: PyObjectId
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

# Utility Functions
def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict) -> str:
    """Create JWT access token"""
    return jwt.encode(data, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token: str) -> dict:
    """Verify JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current authenticated user"""
    token = credentials.credentials
    payload = verify_token(token)
    user_id = payload.get("user_id")
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

def allowed_file(filename: str) -> bool:
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

async def extract_text(file_path: str, dpi: int = 300) -> str:
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
        model = ocr_predictor(pretrained=True)
        doc = DocumentFile.from_images(file_path)
        result = model(doc)
        
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

def create_gemini_prompt(document_text: str) -> str:
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

async def extract_artist_info_with_gemini(document_text: str) -> dict:
    """
    Call Gemini API with improved JSON parsing
    Maintains the same accuracy as the original implementation
    """
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        prompt = create_gemini_prompt(document_text)
        
        response = model.generate_content(prompt)
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

# API Routes

@app.get("/")
async def root():
    """API documentation endpoint"""
    return {
        "message": "Artist Information Extraction API - FastAPI Version",
        "version": "2.0.0",
        "endpoints": {
            "/": "This documentation",
            "/health": "Health check",
            "/auth/register": "POST - Register new user",
            "/auth/login": "POST - User login",
            "/extract": "POST - Extract artist information from uploaded file",
            "/artists": "GET - List all artists (paginated)",
            "/artists/{artist_id}": "GET - Get specific artist",
            "/results": "GET - List all saved extraction results",
            "/results/{result_id}": "GET - Retrieve a specific saved result"
        },
        "supported_formats": list(ALLOWED_EXTENSIONS),
        "max_file_size": f"{MAX_FILE_SIZE // (1024*1024)}MB",
        "features": [
            "User authentication and authorization",
            "MongoDB integration for data persistence",
            "Advanced AI-powered information extraction",
            "Comprehensive artist database management"
        ]
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Test MongoDB connection
        await database.command("ping")
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return {
        "status": "healthy",
        "message": "Artist Extraction API is running",
        "database": db_status,
        "gemini_configured": bool(GEMINI_API_KEY),
        "timestamp": datetime.utcnow().isoformat()
    }

@app.post("/auth/register")
async def register_user(user_data: UserCreate):
    """Register a new user"""
    # Check if user already exists
    existing_user = await users_collection.find_one({
        "$or": [
            {"username": user_data.username},
            {"email": user_data.email}
        ]
    })
    
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="User with this username or email already exists"
        )
    
    # Hash password and create user
    hashed_password = hash_password(user_data.password)
    
    user_doc = {
        "username": user_data.username,
        "email": user_data.email,
        "full_name": user_data.full_name,
        "password": hashed_password,
        "role": user_data.role,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await users_collection.insert_one(user_doc)
    
    # Create access token
    token_data = {
        "user_id": str(result.inserted_id),
        "username": user_data.username,
        "role": user_data.role
    }
    access_token = create_access_token(token_data)
    
    return {
        "message": "User registered successfully",
        "access_token": access_token,
        "user_id": str(result.inserted_id)
    }

@app.post("/auth/login")
async def login_user(login_data: UserLogin):
    """User login"""
    # Find user by username or email
    user = await users_collection.find_one({
        "$or": [
            {"username": login_data.username_or_email},
            {"email": login_data.username_or_email}
        ]
    })
    
    if not user or not verify_password(login_data.password, user["password"]):
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials"
        )
    
    # Create access token
    token_data = {
        "user_id": str(user["_id"]),
        "username": user["username"],
        "role": user["role"]
    }
    access_token = create_access_token(token_data)
    
    return {
        "message": "Login successful",
        "access_token": access_token,
        "user": {
            "id": str(user["_id"]),
            "username": user["username"],
            "email": user["email"],
            "full_name": user["full_name"],
            "role": user["role"]
        }
    }

@app.post("/extract")
async def extract_artist_info_endpoint(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Extract artist information from uploaded file
    Maintains the same accuracy as the original Flask implementation
    """
    # Validate file
    if not allowed_file(file.filename):
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Supported formats: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    if file.size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB"
        )
    
    try:
        # Save uploaded file using utility (ensures upload folder exists and unique names)
        filename = secure_filename(file.filename)
        content = await file.read()
        file_path = save_uploaded_file(content, filename)
        saved_filename = os.path.basename(file_path)
        
        print(f"Processing file: {filename} (saved as: {saved_filename})")
        
        # Extract text from document
        extracted_text = await extract_text(file_path)
        
        if not extracted_text or len(extracted_text.strip()) < 10:
            raise HTTPException(
                status_code=400,
                detail="Could not extract meaningful text from the document"
            )
        
        # Get artist information using Gemini
        artist_info_raw = await extract_artist_info_with_gemini(extracted_text)
        
        # Convert to Pydantic model for validation
        try:
            artist_info = ArtistInfo(**artist_info_raw)
        except Exception as e:
            print(f"Validation error: {e}")
            # If validation fails, store raw data
            artist_info = ArtistInfo(
                summary=f"Raw extraction data (validation failed): {json.dumps(artist_info_raw, indent=2)}"
            )
        
        # Save to MongoDB
        artist_doc = {
            "artist_info": artist_info.dict(),
            "original_filename": filename,
            "saved_filename": saved_filename,
            "extracted_text": extracted_text,
            "extraction_status": "completed",
            "created_by": ObjectId(current_user["_id"]),
            "created_at": datetime.now(__import__('datetime').timezone.utc),
            "updated_at": datetime.now(__import__('datetime').timezone.utc)
        }
        
        result = await artists_collection.insert_one(artist_doc)
        
        print(f"✅ Results saved to MongoDB with ID: {result.inserted_id}")
        
        # Clean up temporary file
        try:
            os.remove(file_path)
        except Exception as cleanup_error:
            print(f"Warning: Could not clean up temporary file: {cleanup_error}")
        
        return {
            "success": True,
            "artist_id": str(result.inserted_id),
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
            status_code=500,
            detail=f"Error processing file: {str(e)}"
        )

@app.get("/artists")
async def list_artists(
    page: int = 1,
    limit: int = 10,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """List all artists with pagination and search"""
    skip = (page - 1) * limit
    
    # Build query
    query = {}
    if search:
        query["$or"] = [
            {"artist_info.artist_name": {"$regex": search, "$options": "i"}},
            {"artist_info.guru_name": {"$regex": search, "$options": "i"}},
            {"artist_info.gharana_details.gharana_name": {"$regex": search, "$options": "i"}}
        ]
    
    # Get total count
    total = await artists_collection.count_documents(query)
    
    # Get artists
    cursor = artists_collection.find(query).skip(skip).limit(limit).sort("created_at", -1)
    artists = await cursor.to_list(length=limit)
    
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

@app.get("/artists/{artist_id}")
async def get_artist(
    artist_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get specific artist by ID"""
    try:
        artist = await artists_collection.find_one({"_id": ObjectId(artist_id)})
        if not artist:
            raise HTTPException(status_code=404, detail="Artist not found")
        
        # Convert ObjectId to string
        artist["_id"] = str(artist["_id"])
        artist["created_by"] = str(artist["created_by"])
        
        return {
            "success": True,
            "artist": artist
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid artist ID: {str(e)}")

@app.get("/results")
async def list_results(
    page: int = 1,
    limit: int = 10,
    current_user: dict = Depends(get_current_user)
):
    """List all extraction results with pagination"""
    skip = (page - 1) * limit
    
    # Get total count
    total = await artists_collection.count_documents({})
    
    # Get results
    cursor = artists_collection.find({}).skip(skip).limit(limit).sort("created_at", -1)
    results = await cursor.to_list(length=limit)
    
    # Convert ObjectId to string and format response
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

@app.get("/results/{result_id}")
async def get_result(
    result_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific extraction result"""
    try:
        result = await artists_collection.find_one({"_id": ObjectId(result_id)})
        if not result:
            raise HTTPException(status_code=404, detail="Result not found")
        
        # Convert ObjectId to string
        result["_id"] = str(result["_id"])
        result["created_by"] = str(result["created_by"])
        
        return {
            "success": True,
            "result": result
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid result ID: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Artist Information Extraction API (FastAPI)...")
    print(f"📁 Upload folder: {UPLOAD_FOLDER}")
    print(f"🔑 Gemini API configured: {'Yes' if GEMINI_API_KEY else 'No'}")
    print(f"🗄️ MongoDB URL: {MONGODB_URL}")
    print(f"📄 Supported formats: {', '.join(ALLOWED_EXTENSIONS)}")
    print("🌐 API will be available at: http://localhost:8000")
    print("📖 Documentation at: http://localhost:8000/docs")
    
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)