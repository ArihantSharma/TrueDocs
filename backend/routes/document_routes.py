from fastapi import APIRouter, UploadFile, Depends, Form, File, HTTPException
from pydantic import BaseModel
from typing import List
from utils.crypto import hash_document
from utils.auth import get_current_organisation
from db.db import get_doc_db, get_blockchain
import uuid

router = APIRouter()

@router.post("/document/upload")
async def upload_document(
    files: List[UploadFile] = File(...),
    post_title: str = Form(...),
    holder_name: str = Form(...),
    validity: str = Form(...),
    org=Depends(get_current_organisation),
    doc_db=Depends(get_doc_db),
    blockchain=Depends(get_blockchain)
):
    org_id = org["sub"]
    results = []

    for file in files:
        data = await file.read()
        doc_hash = hash_document(data)
        
        # Upload to IPFS via Pinata (with fallback)
        import os
        import requests
        
        pinata_api_key = os.environ.get("PINATA_API_KEY")
        pinata_secret_key = os.environ.get("PINATA_SECRET_API_KEY")
        
        cid = f"QmSimulatedCID{uuid.uuid4().hex[:10]}"
        
        if pinata_api_key and pinata_secret_key:
            try:
                url = "https://api.pinata.cloud/pinning/pinFileToIPFS"
                headers = {
                    "pinata_api_key": pinata_api_key,
                    "pinata_secret_api_key": pinata_secret_key
                }
                # We need to send the file as multipart/form-data
                # We've already read `data = await file.read()`
                ipfs_files = {
                    'file': (file.filename, data)
                }
                res = requests.post(url, files=ipfs_files, headers=headers)
                if res.status_code == 200:
                    cid = res.json().get("IpfsHash", cid)
                else:
                    print(f"Pinata upload failed: {res.text}")
            except Exception as e:
                print(f"Pinata IPFS error: {e}")
        
        # Store in SQL Blockchain (legacy)
        tx = await blockchain.store_hash(doc_hash)
        
        # Store in Document DB
        import uuid as uuid_lib
        try:
            await doc_db.add_document(
                uuid_lib.UUID(org_id),
                post_title,
                file.filename,
                holder_name,
                validity,
                doc_hash,
                cid,
                tx
            )
            results.append({"filename": file.filename, "hash": doc_hash, "tx": tx, "cid": cid})
        except Exception as e:
            results.append({"filename": file.filename, "error": str(e)})

    return {
        "post_title": post_title,
        "results": results
    }

class ConfirmBlockchainRequest(BaseModel):
    doc_hash: str
    tx_hash: str
    wallet_address: str

@router.post("/document/confirm_blockchain")
async def confirm_blockchain(
    request: ConfirmBlockchainRequest,
    org=Depends(get_current_organisation),
    doc_db=Depends(get_doc_db)
):
    """Called by frontend after tx.wait() succeeds to mark document as blockchain-confirmed."""
    await doc_db.confirm_blockchain_document(request.doc_hash, request.tx_hash)
    # Also save wallet address on confirm
    await doc_db.db.execute(
        "UPDATE documents SET wallet_address=$1 WHERE document_hash=$2",
        request.wallet_address,
        request.doc_hash
    )
    return {"status": "confirmed", "doc_hash": request.doc_hash}


@router.post("/document/revoke")
async def revoke_document(
    doc_hash: str = Form(...),
    org=Depends(get_current_organisation),
    doc_db=Depends(get_doc_db),
    blockchain=Depends(get_blockchain)
):
    # Ensure document belongs to the organization
    doc = await doc_db.get_by_hash(doc_hash)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if str(doc["org_id"]) != org["sub"]:
        raise HTTPException(status_code=403, detail="Not authorized to revoke this document")
        
    if doc["revoked"]:
        raise HTTPException(status_code=400, detail="Document is already revoked")

    # Record revocation on SQL blockchain
    tx = await blockchain.revoke_hash(doc_hash)
    
    # Update relational mapping
    await doc_db.revoke_document(doc_hash)
    
    return {"status": "success", "message": "Document revoked", "tx": tx}

@router.get("/document/posts")
async def get_posts(
    org=Depends(get_current_organisation),
    doc_db=Depends(get_doc_db)
):
    org_id = org["sub"]
    posts = await doc_db.get_posts_by_org(org_id)
    return {"posts": [dict(p) for p in posts]}

from pydantic import BaseModel

class UpdatePostRequest(BaseModel):
    old_post_title: str
    new_post_title: str
    new_holder_name: str

@router.put("/document/post")
async def update_post(
    request: UpdatePostRequest,
    org=Depends(get_current_organisation),
    doc_db=Depends(get_doc_db)
):
    org_id = org["sub"]
    await doc_db.update_post_details(
        org_id, 
        request.old_post_title, 
        request.new_post_title, 
        request.new_holder_name
    )
    return {"status": "success", "message": "Post updated successfully"}

class RevokePostRequest(BaseModel):
    post_title: str

@router.get("/document/post/documents")
async def get_post_documents(
    post_title: str,
    org=Depends(get_current_organisation),
    doc_db=Depends(get_doc_db)
):
    org_id = org["sub"]
    docs = await doc_db.get_documents_by_post(org_id, post_title)
    return {"documents": [dict(d) for d in docs]}

@router.delete("/document/post")
async def revoke_post(
    request: RevokePostRequest,
    org=Depends(get_current_organisation),
    doc_db=Depends(get_doc_db),
    blockchain=Depends(get_blockchain)
):
    org_id = org["sub"]
    
    # Get all documents for this post to revoke on blockchain
    docs = await doc_db.get_documents_by_post(org_id, request.post_title)
    
    if not docs:
        raise HTTPException(status_code=404, detail="Post not found")
        
    # Mark all as revoked in SQL (Relational/Mapping state)
    # The actual blockchain revocation is handled by the frontend via Ethereum
    await doc_db.revoke_post(org_id, request.post_title)
    
    return {
        "status": "success", 
        "message": f"Successfully revoked batch '{request.post_title}' in local database."
    }