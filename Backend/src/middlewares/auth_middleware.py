#!/usr/bin/env python3
"""
Authentication middleware for FastAPI
"""

from fastapi import Request, HTTPException, status
from fastapi.security.utils import get_authorization_scheme_param
from ..utils.auth_utils import verify_token
from ..models.user_model import user_model

async def auth_middleware(request: Request, call_next):
    """Authentication middleware"""
    # Skip auth for public endpoints
    public_paths = ["/", "/health", "/docs", "/redoc", "/openapi.json"]
    
    if request.url.path in public_paths:
        response = await call_next(request)
        return response
    
    # Check for authorization header
    authorization = request.headers.get("Authorization")
    scheme, token = get_authorization_scheme_param(authorization)
    
    if not authorization or scheme.lower() != "bearer":
        if request.url.path.startswith("/auth/"):
            # Allow auth endpoints without token
            response = await call_next(request)
            return response
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
                headers={"WWW-Authenticate": "Bearer"},
            )
    
    try:
        # Verify token
        payload = verify_token(token)
        user_id = payload.get("user_id")
        
        if user_id:
            user = await user_model.find_by_id(user_id)
            if user:
                # Add user to request state
                request.state.user = user
    except HTTPException:
        if not request.url.path.startswith("/auth/"):
            raise
    
    response = await call_next(request)
    return response