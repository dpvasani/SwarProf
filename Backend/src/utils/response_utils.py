#!/usr/bin/env python3
"""
Response utilities for consistent API responses
"""

from typing import Any, Dict, List, Optional
from ..schemas.artist_schemas import StandardResponse, PaginatedResponse

def create_success_response(
    message: str = "Success",
    data: Optional[Dict[str, Any]] = None
) -> StandardResponse:
    """Create a standard success response"""
    return StandardResponse(
        success=True,
        message=message,
        data=data
    )

def create_error_response(
    message: str = "Error occurred",
    data: Optional[Dict[str, Any]] = None
) -> StandardResponse:
    """Create a standard error response"""
    return StandardResponse(
        success=False,
        message=message,
        data=data
    )

def create_paginated_response(
    data: List[Dict[str, Any]],
    total: int,
    page: int,
    limit: int
) -> PaginatedResponse:
    """Create a paginated response"""
    return PaginatedResponse(
        success=True,
        total=total,
        page=page,
        limit=limit,
        total_pages=(total + limit - 1) // limit,
        data=data
    )

def format_object_ids(data: Dict[str, Any]) -> Dict[str, Any]:
    """Convert ObjectId fields to strings"""
    if "_id" in data:
        data["_id"] = str(data["_id"])
    if "created_by" in data:
        data["created_by"] = str(data["created_by"])
    return data