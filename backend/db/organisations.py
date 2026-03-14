from uuid import uuid4


class OrganisationDB:

    def __init__(self, db):
        self.db = db

    async def create_table(self):

        query = """
        CREATE TABLE IF NOT EXISTS organisations (
            id UUID PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE,
            password TEXT NOT NULL,
            api_key TEXT UNIQUE,
            wallet_address TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        );
        """

        await self.db.execute(query)

    async def add_organisation(self, name, email, password, api_key, wallet):

        query = """
        INSERT INTO organisations(id, name, email, password, api_key, wallet_address)
        VALUES($1,$2,$3,$4,$5,$6)
        """

        return await self.db.execute(
            query,
            uuid4(),
            name,
            email,
            password,
            api_key,
            wallet
        )

    async def get_by_api(self, api_key):

        query = """
        SELECT * FROM organisations
        WHERE api_key=$1
        """

        return await self.db.fetchrow(query, api_key)