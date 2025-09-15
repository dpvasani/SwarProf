#!/usr/bin/env python3
"""
Database connection and utilities for MongoDB
"""

from motor.motor_asyncio import AsyncIOMotorClient
from ..config import settings
import logging

logger = logging.getLogger(__name__)

class Database:
    client: AsyncIOMotorClient = None
    database = None

# Database instance
db = Database()

async def connect_to_mongo():
    """Create database connection"""
    try:
        db.client = AsyncIOMotorClient(settings.MONGODB_URL)
        db.database = db.client[settings.DATABASE_NAME]
        
        # Test the connection
        await db.client.admin.command('ping')
        logger.info(f"Connected to MongoDB at {settings.MONGODB_URL}")
        
        # Create indexes for better performance
        await create_indexes()
        
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise

async def close_mongo_connection():
    """Close database connection"""
    if db.client:
        db.client.close()
        logger.info("Disconnected from MongoDB")

async def create_indexes():
    """Create database indexes for better performance"""
    try:
        # Users collection indexes
        users_collection = db.database.users
        await users_collection.create_index("username", unique=True)
        await users_collection.create_index("email", unique=True)
        
        # Artists collection indexes
        artists_collection = db.database.artists
        await artists_collection.create_index("created_by")
        await artists_collection.create_index("created_at")
        await artists_collection.create_index([
            ("artist_info.artist_name", "text"),
            ("artist_info.guru_name", "text"),
            ("artist_info.gharana_details.gharana_name", "text")
        ])
        
        logger.info("Database indexes created successfully")
        
    except Exception as e:
        logger.warning(f"Failed to create indexes: {e}")

def get_database():
    """Get database instance"""
    return db.database