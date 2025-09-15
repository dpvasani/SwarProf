#!/usr/bin/env python3
"""
Artist model for MongoDB operations
"""

from datetime import datetime
from typing import Optional, Dict, Any, List
from bson import ObjectId
from ..db.dbconnect import get_database

class ArtistModel:
    def __init__(self):
        self.collection_name = "artists"
    
    @property
    def collection(self):
        db = get_database()
        return db[self.collection_name]
    
    async def create_artist(self, artist_data: Dict[str, Any]) -> str:
        """Create a new artist record"""
        artist_data["created_at"] = datetime.utcnow()
        artist_data["updated_at"] = datetime.utcnow()
        
        result = await self.collection.insert_one(artist_data)
        return str(result.inserted_id)
    
    async def find_by_id(self, artist_id: str) -> Optional[Dict[str, Any]]:
        """Find artist by ID"""
        return await self.collection.find_one({"_id": ObjectId(artist_id)})
    
    async def find_all(self, skip: int = 0, limit: int = 10, search: Optional[str] = None) -> List[Dict[str, Any]]:
        """Find all artists with pagination and search"""
        query = {}
        if search:
            query["$or"] = [
                {"artist_info.artist_name": {"$regex": search, "$options": "i"}},
                {"artist_info.guru_name": {"$regex": search, "$options": "i"}},
                {"artist_info.gharana_details.gharana_name": {"$regex": search, "$options": "i"}}
            ]
        
        cursor = self.collection.find(query).skip(skip).limit(limit).sort("created_at", -1)
        return await cursor.to_list(length=limit)
    
    async def count_documents(self, search: Optional[str] = None) -> int:
        """Count total documents"""
        query = {}
        if search:
            query["$or"] = [
                {"artist_info.artist_name": {"$regex": search, "$options": "i"}},
                {"artist_info.guru_name": {"$regex": search, "$options": "i"}},
                {"artist_info.gharana_details.gharana_name": {"$regex": search, "$options": "i"}}
            ]
        
        return await self.collection.count_documents(query)
    
    async def update_artist(self, artist_id: str, update_data: Dict[str, Any]) -> bool:
        """Update artist data"""
        update_data["updated_at"] = datetime.utcnow()
        
        result = await self.collection.update_one(
            {"_id": ObjectId(artist_id)},
            {"$set": update_data}
        )
        return result.modified_count > 0
    
    async def delete_artist(self, artist_id: str) -> bool:
        """Delete artist"""
        result = await self.collection.delete_one({"_id": ObjectId(artist_id)})
        return result.deleted_count > 0
    
    async def find_by_user(self, user_id: str, skip: int = 0, limit: int = 10) -> List[Dict[str, Any]]:
        """Find artists created by specific user"""
        cursor = self.collection.find({"created_by": ObjectId(user_id)}).skip(skip).limit(limit).sort("created_at", -1)
        return await cursor.to_list(length=limit)

# Create global instance
artist_model = ArtistModel()