from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List

from db.db import get_org_db
from utils.auth import get_current_admin, get_password_hash
from uuid import uuid4
import secrets

router = APIRouter(prefix="/admin", tags=["admin"])

class CreateOrganisationRequest(BaseModel):
    name: str
    email: str
    password: str
    wallet_address: str

@router.post("/organisations")
async def create_organisation(
    request: CreateOrganisationRequest,
    admin=Depends(get_current_admin),
    org_db=Depends(get_org_db)
):
    hashed_password = get_password_hash(request.password)
    api_key = secrets.token_hex(32)

    try:
        await org_db.add_organisation(
            request.name,
            request.email,
            hashed_password,
            api_key,
            request.wallet_address
        )
        return {"status": "success", "message": "Organisation created successfully", "api_key": api_key}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/organisations")
async def list_organisations(
    admin=Depends(get_current_admin),
    org_db=Depends(get_org_db)
):
    query = "SELECT id, name, email, api_key, wallet_address, created_at FROM organisations"
    orgs = await org_db.db.fetch(query)
    # convert asyncpg records to dict
    return [dict(org) for org in orgs]
    
@router.delete("/organisations/{org_id}")
async def delete_organisation(
    org_id: str,
    admin=Depends(get_current_admin),
    org_db=Depends(get_org_db)
):
    query = "DELETE FROM organisations WHERE id=$1"
    # Note: asyncpg requires a UUID object for UUID column.
    import uuid
    try:
        uid = uuid.UUID(org_id)
        await org_db.db.execute(query, uid)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
