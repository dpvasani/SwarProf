#!/usr/bin/env python3
"""
Artist-related Pydantic schemas for request/response validation
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from bson import ObjectId

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
    id: str = Field(alias="_id")
    artist_info: ArtistInfo
    original_filename: str
    saved_filename: Optional[str] = None
    extracted_text: str
    extraction_status: str = Field(default="completed")
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
