#!/usr/bin/env python3
"""
Artist routes - FastAPI implementation
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from typing import Dict, Any, Optional
from ..controllers.artist_controller import artist_controller
from ..utils.auth_utils import get_current_user

router = APIRouter()

@router.post("/extract")
async def extract_artist_info_endpoint(
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Extract artist information from uploaded file"""
    return await artist_controller.extract_artist_info(file, current_user)

@router.get("/artists")
async def list_artists_endpoint(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """List all artists with pagination and search"""
    return await artist_controller.list_artists(page, limit, search, current_user)

@router.get("/artists/{artist_id}")
async def get_artist_endpoint(
    artist_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get specific artist by ID"""
    return await artist_controller.get_artist(artist_id, current_user)

@router.post("/artists/{artist_id}/enhance")
async def enhance_artist_endpoint(
    artist_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Comprehensively enhance existing artist data"""
    return await artist_controller.enhance_artist_contact_details(artist_id, current_user)

@router.get("/results")
async def list_results_endpoint(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """List all extraction results with pagination"""
    return await artist_controller.list_results(page, limit, current_user)

@router.get("/results/{result_id}")
async def get_result_endpoint(
    result_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get a specific extraction result"""
    return await artist_controller.get_result(result_id, current_user)