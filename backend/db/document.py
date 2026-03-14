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

    async def get_posts_by_org(self, org_id):
        query = """
        SELECT 
            post_title, 
            MAX(holder_name) as holder_name,
            MAX(validity) as validity,
            COUNT(id) as document_count,
            MIN(created_at) as created_at,
            BOOL_OR(revoked) as any_revoked
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