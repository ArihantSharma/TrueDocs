import asyncpg

class Database:

    def __init__(self, dsn: str):
        self.dsn = dsn
        self.pool = None

    async def connect(self):
        self.pool = await asyncpg.create_pool(self.dsn)

    async def close(self):
        await self.pool.close()

    async def execute(self, query: str, *args):
        async with self.pool.acquire() as conn:
            return await conn.execute(query, *args)

    async def fetch(self, query: str, *args):
        async with self.pool.acquire() as conn:
            return await conn.fetch(query, *args)

    async def fetchrow(self, query: str, *args):
        async with self.pool.acquire() as conn:
            return await conn.fetchrow(query, *args)

from fastapi import Request

def get_org_db(request: Request):
    return request.app.state.org_db

def get_doc_db(request: Request):
    return request.app.state.doc_db

def get_admin_db(request: Request):
    return request.app.state.admin_db

def get_blockchain(request: Request):
    return request.app.state.blockchain