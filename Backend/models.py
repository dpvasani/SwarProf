#!/usr/bin/env python3
"""
Pydantic models for request/response validation
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from bson import ObjectId

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

# User Models
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., regex=r'^[\w\.-]+@[\w\.-]+\.\w+$')
    full_name: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=6)
    role: str = Field(default="user", regex=r'^(user|admin)$')

    @validator('username')
    def username_alphanumeric(cls, v):
        assert v.replace('_', '').replace('-', '').isalnum(), 'Username must be alphanumeric (with _ and - allowed)'
        return v.lower()

    @validator('email')
    def email_lowercase(cls, v):
        return v.lower()

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

# Artist Information Models
class SocialMedia(BaseModel):
    instagram: Optional[str] = None
    facebook: Optional[str] = None
    twitter: Optional[str] = None
    youtube: Optional[str] = None
    other: Optional[str] = None

class ContactInfo(BaseModel):
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None

class Address(BaseModel):
    full_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None

class ContactDetails(BaseModel):
    social_media: Optional[SocialMedia] = None
    contact_info: Optional[ContactInfo] = None
    address: Optional[Address] = None

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
    saved_filename: Optional[str] = None
    extracted_text: str
    extraction_status: str = Field(default="completed")
    created_by: PyObjectId
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

# Response Models
class StandardResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None

class PaginatedResponse(BaseModel):
    success: bool
    total: int
    page: int
    limit: int
    total_pages: int
    data: List[Dict[str, Any]]

class ExtractionResponse(BaseModel):
    success: bool
    artist_id: str
    filename: str
    extracted_text_length: int
    extracted_text_preview: str
    artist_info: ArtistInfo
    message: str