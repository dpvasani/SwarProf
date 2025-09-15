#!/usr/bin/env python3
"""
User model for MongoDB operations
"""

from datetime import datetime
from typing import Optional, Dict, Any
from bson import ObjectId
from ..db.dbconnect import get_database

class UserModel:
    def __init__(self):
        self.collection_name = "users"
    
    @property
    def collection(self):
        db = get_database()
        return db[self.collection_name]
    
    async def create_user(self, user_data: Dict[str, Any]) -> str:
        """Create a new user"""
        user_data["created_at"] = datetime.utcnow()
        user_data["updated_at"] = datetime.utcnow()
        
        result = await self.collection.insert_one(user_data)
        return str(result.inserted_id)
    
    async def find_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Find user by username"""
        return await self.collection.find_one({"username": username})
    
    async def find_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Find user by email"""
        return await self.collection.find_one({"email": email})
    
    async def find_by_username_or_email(self, identifier: str) -> Optional[Dict[str, Any]]:
        """Find user by username or email"""
        return await self.collection.find_one({
            "$or": [
                {"username": identifier},
                {"email": identifier}
            ]
        })
    
    async def find_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Find user by ID"""
        return await self.collection.find_one({"_id": ObjectId(user_id)})
    
    async def update_user(self, user_id: str, update_data: Dict[str, Any]) -> bool:
        """Update user data"""
        update_data["updated_at"] = datetime.utcnow()
        
        result = await self.collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )
        return result.modified_count > 0
    
    async def delete_user(self, user_id: str) -> bool:
        """Delete user"""
        result = await self.collection.delete_one({"_id": ObjectId(user_id)})
        return result.deleted_count > 0

# Create global instance
user_model = UserModel()