#!/usr/bin/env python3
"""
Artist routes - converted from Flask to FastAPI
"""

from fastapi import APIRouter, Depends, File, UploadFile, Query
from typing import Dict, Any, Optional
from ..controllers.artist_controller import artist_controller
from ..utils.auth_utils import get_current_user

router = APIRouter()

@router.post("/extract")
async def extract_artist_info(
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Extract artist information from uploaded file
    Maintains the same accuracy as the original Flask implementation
    """
    return await artist_controller.extract_artist_info(file, current_user)

@router.get("/artists")
async def list_artists(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """List all artists with pagination and search"""
    return await artist_controller.list_artists(page, limit, search, current_user)

@router.get("/artists/{artist_id}")
async def get_artist(
    artist_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get specific artist by ID"""
    try:
        result = await artist_controller.get_artist(artist_id, current_user)
        return result
    except Exception as e:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Artist not found: {str(e)}"
        )

@router.get("/results")
async def list_results(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """List all extraction results with pagination"""
    return await artist_controller.list_results(page, limit, current_user)

@router.get("/results/{result_id}")
async def get_result(
    result_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get a specific extraction result"""
    return await artist_controller.get_result(result_id, current_user)

@router.post("/artists/{artist_id}/enhance")
async def enhance_artist_contact_details(
    artist_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Comprehensively enhance existing artist data by refining, correcting, and improving ALL extracted information
    This endpoint re-processes ALL artist data through AI to refine, correct, and enhance everything - not just missing fields
    """
    return await artist_controller.enhance_artist_contact_details(artist_id, current_user)