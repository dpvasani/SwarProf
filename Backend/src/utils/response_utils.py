#!/usr/bin/env python3
"""
Response utilities for consistent API responses
"""

from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status

def create_success_response(
    message: str = "Success",
    data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Create a standard success response"""
    return {
        "success": True,
        "message": message,
        "data": data or {}
    }

def create_error_response(
    message: str = "Error occurred",
    data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Create a standard error response"""
    return {
        "success": False,
        "message": message,
        "data": data or {}
    }

def create_paginated_response(
    data: List[Dict[str, Any]],
    total: int,
    page: int,
    limit: int
) -> Dict[str, Any]:
    """Create a paginated response"""
    return {
        "success": True,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit,
        "data": data
    }

def format_object_ids(data: Dict[str, Any]) -> Dict[str, Any]:
    """Convert ObjectId fields to strings"""
    if "_id" in data:
        data["_id"] = str(data["_id"])
    if "created_by" in data:
        data["created_by"] = str(data["created_by"])
    return data

def handle_validation_error(error: Exception) -> HTTPException:
    """Handle validation errors consistently"""
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail=f"Validation error: {str(error)}"
    )

def handle_not_found_error(resource: str = "Resource") -> HTTPException:
    """Handle not found errors consistently"""
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"{resource} not found"
    )

def handle_unauthorized_error(message: str = "Unauthorized") -> HTTPException:
    """Handle unauthorized errors consistently"""
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=message,
        headers={"WWW-Authenticate": "Bearer"}
    )