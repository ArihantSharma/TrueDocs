import asyncio
import sys
import os

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db.db import Database
from db.admin import AdminDB
from utils.auth import get_password_hash

async def setup():
    DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:psqlpw@localhost:5432/")
    db = Database(DATABASE_URL)
    try:
        await db.connect()
    except Exception as e:
        print(f"Failed to connect to db: {e}")
        return

    admin_db = AdminDB(db)
    await admin_db.create_table()
    
    email = "admin@truedocs.com"
    password = "admin"
    hashed = get_password_hash(password)
    
    existing = await admin_db.get_by_email(email)
    if not existing:
        await admin_db.add_admin(email, hashed)
        print("Admin user created successfully: admin@truedocs.com / adminpassword")
    else:
        print("Admin user already exists")
    await db.close()

if __name__ == "__main__":
    asyncio.run(setup())
