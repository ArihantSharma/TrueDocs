from uuid import uuid4


class DocumentDB:

    def __init__(self, db):
        self.db = db

    async def create_table(self):

        query = """
        CREATE TABLE IF NOT EXISTS documents (
            id UUID PRIMARY KEY,
            org_id UUID,
            post_title TEXT,
            title TEXT,
            holder_name TEXT,
            validity TEXT,
            document_hash TEXT,
            ipfs_cid TEXT,
            blockchain_tx TEXT,
            revoked BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW()
        );
        """

        await self.db.execute(query)

    async def add_document(
        self,
        org_id,
        post_title,
        title,
        holder_name,
        validity,
        doc_hash,
        cid,
        tx
    ):

        query = """
        INSERT INTO documents(
        id,org_id,post_title,title,holder_name,validity,document_hash,
        ipfs_cid,blockchain_tx
        )
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
        """

        return await self.db.execute(
            query,
            uuid4(),
            org_id,
            post_title,
            title,
            holder_name,
            validity,
            doc_hash,
            cid,
            tx
        )

    async def get_by_hash(self, doc_hash):

        query = """
        SELECT * FROM documents
        WHERE document_hash=$1
        """

        return await self.db.fetchrow(query, doc_hash)

    async def get_by_org(self, org_id):
        query = """
        SELECT * FROM documents
        WHERE org_id=$1
        ORDER BY created_at DESC
        """
        return await self.db.fetch(query, org_id)

    async def revoke_document(self, doc_hash):

        query = """
        UPDATE documents
        SET revoked=TRUE
        WHERE document_hash=$1
        """

        return await self.db.execute(query, doc_hash)