from uuid import uuid4

class SQLBlockchain:
    def __init__(self, db):
        self.db = db

    async def create_tables(self):
        document_ledger_query = """
        CREATE TABLE IF NOT EXISTS document_ledger (
            tx_hash TEXT PRIMARY KEY,
            doc_hash TEXT NOT NULL,
            action TEXT NOT NULL,
            timestamp TIMESTAMP DEFAULT NOW()
        );
        """
        revocation_ledger_query = """
        CREATE TABLE IF NOT EXISTS revocation_ledger (
            tx_hash TEXT PRIMARY KEY,
            doc_hash TEXT NOT NULL,
            action TEXT NOT NULL,
            timestamp TIMESTAMP DEFAULT NOW()
        );
        """
        await self.db.execute(document_ledger_query)
        await self.db.execute(revocation_ledger_query)

    async def store_hash(self, doc_hash: str) -> str:
        tx_hash = f"0xdoc_{doc_hash[:10]}_{uuid4()}"
        query = """
        INSERT INTO document_ledger (tx_hash, doc_hash, action)
        VALUES ($1, $2, 'ISSUE')
        """
        await self.db.execute(query, tx_hash, doc_hash)
        return tx_hash

    async def revoke_hash(self, doc_hash: str) -> str:
        tx_hash = f"0xrev_{doc_hash[:10]}_{uuid4()}"
        query = """
        INSERT INTO revocation_ledger (tx_hash, doc_hash, action)
        VALUES ($1, $2, 'REVOKE')
        """
        await self.db.execute(query, tx_hash, doc_hash)
        return tx_hash

    async def is_issued(self, doc_hash: str) -> bool:
        query = "SELECT * FROM document_ledger WHERE doc_hash=$1"
        row = await self.db.fetchrow(query, doc_hash)
        return row is not None

    async def is_revoked(self, doc_hash: str) -> bool:
        query = "SELECT * FROM revocation_ledger WHERE doc_hash=$1"
        row = await self.db.fetchrow(query, doc_hash)
        return row is not None
