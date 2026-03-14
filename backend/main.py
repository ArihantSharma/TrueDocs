from fastapi import FastAPI

from db.db import Database
from db.organisations import OrganisationDB
from db.document import DocumentDB
from db.admin import AdminDB
from db.sql_blockchain import SQLBlockchain

from routes.organisation_routes import router as org_router
from routes.document_routes import router as doc_router
from routes.auth_routes import router as auth_router
from routes.admin_routes import router as admin_router
from routes.verifier_routes import router as verifier_router

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import os

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:psqlpw@localhost:5432/")
database = Database(DATABASE_URL)

@app.on_event("startup")
async def startup():
    await database.connect()

    app.state.org_db = OrganisationDB(database)
    app.state.doc_db = DocumentDB(database)
    app.state.admin_db = AdminDB(database)
    app.state.blockchain = SQLBlockchain(database)

    await app.state.org_db.create_table()
    await app.state.doc_db.create_table()
    await app.state.admin_db.create_table()
    await app.state.blockchain.create_tables()

app.include_router(org_router)
app.include_router(doc_router)
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(verifier_router)