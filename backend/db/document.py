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
            blockchain_confirmed BOOLEAN DEFAULT FALSE,
            wallet_address TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        );
        """
        await self.db.execute(query)

        # Safe migrations — add columns/constraints if they don't already exist
        migrations = [
            "ALTER TABLE documents ADD COLUMN IF NOT EXISTS blockchain_confirmed BOOLEAN DEFAULT FALSE",
            "ALTER TABLE documents ADD COLUMN IF NOT EXISTS wallet_address TEXT",
            # This is required for ON CONFLICT (document_hash) DO NOTHING to work
            "ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_document_hash_key",
            "ALTER TABLE documents ADD CONSTRAINT documents_document_hash_key UNIQUE (document_hash)",
        ]
        for migration in migrations:
            await self.db.execute(migration)

    async def add_document(
        self,
        org_id,
        post_title,
        title,
        holder_name,
        validity,
        doc_hash,
        cid,
        tx,
        wallet_address=None
    ):

        query = """
        INSERT INTO documents(
        id,org_id,post_title,title,holder_name,validity,document_hash,
        ipfs_cid,blockchain_tx,wallet_address
        )
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        ON CONFLICT (document_hash) DO NOTHING
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
            tx,
            wallet_address
        )

    async def confirm_blockchain_document(self, doc_hash, tx_hash):
        query = """
        UPDATE documents
        SET blockchain_confirmed=TRUE, blockchain_tx=$1
        WHERE document_hash=$2
        """
        return await self.db.execute(query, tx_hash, doc_hash)

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

    async def get_posts_by_org(self, org_id):
        query = """
        SELECT 
            post_title, 
            MAX(holder_name) as holder_name,
            MAX(validity) as validity,
            COUNT(id) as document_count,
            MIN(created_at) as created_at,
            BOOL_OR(revoked) as any_revoked,
            BOOL_AND(blockchain_confirmed) as all_confirmed,
            MAX(wallet_address) as wallet_address
        FROM documents
        WHERE org_id=$1
        GROUP BY post_title
        ORDER BY MIN(created_at) DESC
        """
        return await self.db.fetch(query, org_id)

    async def get_documents_by_post(self, org_id, post_title):
        query = """
        SELECT * FROM documents
        WHERE org_id=$1 AND post_title=$2
        """
        return await self.db.fetch(query, org_id, post_title)

    async def update_post_details(self, org_id, old_post_title, new_post_title, new_holder_name):
        query = """
        UPDATE documents
        SET post_title=$1, holder_name=$2
        WHERE org_id=$3 AND post_title=$4
        """
        return await self.db.execute(query, new_post_title, new_holder_name, org_id, old_post_title)

    async def revoke_post(self, org_id, post_title):
        query = """
        UPDATE documents
        SET revoked=TRUE
        WHERE org_id=$1 AND post_title=$2
        """
        return await self.db.execute(query, org_id, post_title)