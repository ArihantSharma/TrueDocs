import hashlib

def hash_document(data: bytes):
    return hashlib.sha256(data).hexdigest()