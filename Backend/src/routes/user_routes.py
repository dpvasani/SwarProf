#!/usr/bin/env python3
"""
User routes - converted from Flask to FastAPI
"""

from fastapi import APIRouter, Depends, HTTPException
from ..schemas.user_schemas import UserCreate, UserLogin, TokenResponse
from ..controllers.user_controller import user_controller
from ..utils.auth_utils import get_current_user
from typing import Dict, Any

router = APIRouter()

@router.post("/register")
async def register_user(user_data: UserCreate):
    """Register a new user"""
    return await user_controller.register_user(user_data)

@router.post("/login")
async def login_user(login_data: UserLogin):
    """User login"""
    return await user_controller.login_user(login_data)

@router.get("/profile")
async def get_user_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get current user profile"""
    return await user_controller.get_current_user_profile(current_user)