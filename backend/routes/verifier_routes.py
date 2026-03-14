from fastapi import APIRouter, UploadFile, Depends, File, HTTPException
from utils.crypto import hash_document
from db.db import get_blockchain, get_doc_db

router = APIRouter(prefix="/verify", tags=["verify"])

@router.post("/document")
async def verify_document(
    file: UploadFile = File(...),
    blockchain=Depends(get_blockchain),
    doc_db=Depends(get_doc_db)
):
    try:
        data = await file.read()
        doc_hash = hash_document(data)

        # 1. Check if document has ever been issued
        is_issued = await blockchain.is_issued(doc_hash)
        
        if not is_issued:
            return {
                "status": "NOT_FOUND",
                "message": "This document does not exist on the blockchain.",
                "hash": doc_hash
            }

        # 2. Check if the document has been revoked
        is_revoked = await blockchain.is_revoked(doc_hash)
        
        if is_revoked:
            return {
                "status": "REVOKED",
                "message": "This document was issued but has been revoked by the issuer.",
                "hash": doc_hash
            }
            
        # 3. If issued and not revoked, get additional details (optional, but requested by user to check originality)
        doc_details = await doc_db.get_by_hash(doc_hash)
        
        return {
            "status": "VALID",
            "message": "This document is fully original and valid.",
            "hash": doc_hash,
            "details": {
                "title": doc_details["title"],
                "holder_name": doc_details["holder_name"],
                "post_title": doc_details["post_title"],
                "validity": doc_details["validity"],
                "issuer_org_id": str(doc_details["org_id"]),
                "issued_at": doc_details["created_at"]
            } if doc_details else None
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
