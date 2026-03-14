from fastapi import APIRouter, Depends, HTTPException
from utils.auth import get_current_organisation
from db.db import get_doc_db
import uuid

router = APIRouter(prefix="/organisation", tags=["organisation"])

@router.get("/documents")
async def list_organisation_documents(
    org=Depends(get_current_organisation),
    doc_db=Depends(get_doc_db)
):
    try:
        org_id = uuid.UUID(org["sub"])
        docs = await doc_db.get_by_org(org_id)
        return [dict(doc) for doc in docs]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/profile")
async def get_profile(
    org=Depends(get_current_organisation)
):
    return {
        "org_id": org["sub"],
        "role": org["role"],
        "api_key": org.get("api_key")
    }