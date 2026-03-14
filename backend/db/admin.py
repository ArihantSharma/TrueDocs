from uuid import uuid4

class AdminDB:
    def __init__(self, db):
        self.db = db

    async def create_table(self):
        query = """
        CREATE TABLE IF NOT EXISTS admins (
            id UUID PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        );
        """
        await self.db.execute(query)

    async def add_admin(self, email, password):
        query = """
        INSERT INTO admins(id, email, password)
        VALUES($1, $2, $3)
        """
        return await self.db.execute(query, uuid4(), email, password)

    async def get_by_email(self, email):
        query = """
        SELECT * FROM admins
        WHERE email=$1
        """
        return await self.db.fetchrow(query, email)
