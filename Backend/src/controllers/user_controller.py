#!/usr/bin/env python3
"""
User controller - converted from Flask to FastAPI
"""

from fastapi import HTTPException, status
from ..schemas.user_schemas import UserCreate, UserLogin, UserResponse
from ..models.user_model import user_model
from ..utils.auth_utils import hash_password, verify_password, create_access_token
from ..utils.response_utils import create_success_response, handle_validation_error
from typing import Dict, Any

class UserController:
    
    async def register_user(self, user_data: UserCreate) -> Dict[str, Any]:
        """Register a new user"""
        # Check if user already exists
        existing_user = await user_model.find_by_username_or_email(user_data.username)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this username already exists"
            )
        
        existing_email = await user_model.find_by_email(user_data.email)
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )
        
        # Hash password and create user
        hashed_password = hash_password(user_data.password)
        
        user_doc = {
            "username": user_data.username,
            "email": user_data.email,
            "full_name": user_data.full_name,
            "password": hashed_password,
            "role": user_data.role,
        }
        
        user_id = await user_model.create_user(user_doc)
        
        # Get created user
        created_user = await user_model.find_by_id(user_id)
        
        # Create access token
        token_data = {
            "user_id": str(created_user["_id"]),
            "username": created_user["username"],
            "role": created_user["role"]
        }
        access_token = create_access_token(token_data)
        
        # Convert to response format
        user_response = UserResponse(
            _id=created_user["_id"],
            username=created_user["username"],
            email=created_user["email"],
            full_name=created_user["full_name"],
            role=created_user["role"],
            created_at=created_user["created_at"],
            updated_at=created_user["updated_at"]
        )
        
        return create_success_response(
            message="User registered successfully",
            data={
                "access_token": access_token,
                "token_type": "bearer",
                "user": user_response.dict()
            }
        )
    
    async def login_user(self, login_data: UserLogin) -> Dict[str, Any]:
        """User login"""
        # Find user by username or email
        user = await user_model.find_by_username_or_email(login_data.username_or_email)
        
        if not user or not verify_password(login_data.password, user["password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # Create access token
        token_data = {
            "user_id": str(user["_id"]),
            "username": user["username"],
            "role": user["role"]
        }
        access_token = create_access_token(token_data)
        
        user_response = UserResponse(
            _id=user["_id"],
            username=user["username"],
            email=user["email"],
            full_name=user["full_name"],
            role=user["role"],
            created_at=user["created_at"],
            updated_at=user["updated_at"]
        )
        
        return create_success_response(
            message="Login successful",
            data={
                "access_token": access_token,
                "token_type": "bearer",
                "user": user_response.dict()
            }
        )
    
    async def get_current_user_profile(self, user: Dict[str, Any]) -> Dict[str, Any]:
        """Get current user profile"""
        user_response = UserResponse(
            _id=user["_id"],
            username=user["username"],
            email=user["email"],
            full_name=user["full_name"],
            role=user["role"],
            created_at=user["created_at"],
            updated_at=user["updated_at"]
        )
        return create_success_response(
            message="User profile retrieved successfully",
            data=user_response.dict()
        )

# Create global instance
user_controller = UserController()