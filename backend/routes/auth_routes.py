from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from utils.auth import verify_password, create_access_token
from db.db import get_org_db, get_admin_db

router = APIRouter(prefix="/auth", tags=["auth"])

class LoginRequest(BaseModel):
    email: str
    password: str
    role: str # "admin" or "organisation"

@router.post("/login")
async def login(
    request: LoginRequest,
    org_db=Depends(get_org_db),
    admin_db=Depends(get_admin_db)
):
    if request.role == "admin":
        user = await admin_db.get_by_email(request.email)
        if not user or not verify_password(request.password, user["password"]):
            raise HTTPException(status_code=401, detail="Invalid admin credentials")
        
        token = create_access_token({"sub": str(user["id"]), "role": "admin"})
        return {"access_token": token, "token_type": "bearer", "role": "admin", "admin_id": str(user["id"])}
        
    elif request.role == "organisation":
        # We need a get_by_email in organisation DB, let's use a query if it doesn't exist yet
        # Actually, organizations DB currently has get_by_api, let's assume it gets fixed or has it
        query = "SELECT * FROM organisations WHERE email=$1"
        user = await org_db.db.fetchrow(query, request.email)
        
        if not user or not verify_password(request.password, user["password"]):
            raise HTTPException(status_code=401, detail="Invalid organisation credentials")
            
        token = create_access_token({
            "sub": str(user["id"]), 
            "role": "organisation", 
            "api_key": user["api_key"]
        })
        return {
            "access_token": token, 
            "token_type": "bearer", 
            "role": "organisation", 
            "org_id": str(user["id"]),
            "api_key": user["api_key"]
        }
        
    else:
        raise HTTPException(status_code=400, detail="Invalid role specified")
