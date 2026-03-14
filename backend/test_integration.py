import requests

BASE_URL = "http://localhost:8000"

# 1. Test Admin Login
print("Testing Admin Login...")
res = requests.post(f"{BASE_URL}/auth/login", json={
    "email": "admin@truedocs.com",
    "password": "adminpassword",
    "role": "admin"
})
assert res.status_code == 200, f"Admin login failed: {res.text}"
admin_token = res.json()["access_token"]
print("Admin login successful.")

# 2. Test Org Creation
print("Testing Organisation Creation...")
res = requests.post(f"{BASE_URL}/admin/organisations", json={
    "name": "Test Org",
    "email": "org@truedocs.com",
    "password": "orgpassword",
    "wallet_address": "0x12345"
}, headers={"Authorization": f"Bearer {admin_token}"})
if res.status_code == 400 and "duplicate key value" in res.text:
    print("Org already exists, proceeding...")
else:
    assert res.status_code == 200, f"Org creation failed: {res.text}"
    print("Org creation successful.")

# Get Orgs list
res = requests.get(f"{BASE_URL}/admin/organisations", headers={"Authorization": f"Bearer {admin_token}"})
orgs = res.json()
print(f"Total orgs: {len(orgs)}")

# 3. Test Org Login
print("Testing Organisation Login...")
res = requests.post(f"{BASE_URL}/auth/login", json={
    "email": "org@truedocs.com",
    "password": "orgpassword",
    "role": "organisation"
})
assert res.status_code == 200, f"Org login failed: {res.text}"
org_token = res.json()["access_token"]
print("Org login successful.")

# 4. Test Document Upload
print("Testing Document Upload...")
with open("test_doc.txt", "w") as f:
    f.write("This is a test document.")

with open("test_doc2.txt", "w") as f:
    f.write("This is another test document.")

files = [
    ('files', ('test_doc.txt', open('test_doc.txt', 'rb'), 'text/plain')),
    ('files', ('test_doc2.txt', open('test_doc2.txt', 'rb'), 'text/plain'))
]
data = {
    "post_title": "Batch 1 Docs",
    "holder_name": "John Doe",
    "validity": "2026-12-31"
}
res = requests.post(f"{BASE_URL}/document/upload", files=files, data=data, headers={"Authorization": f"Bearer {org_token}"})
assert res.status_code == 200, f"Document upload failed: {res.text}"
doc_results = res.json()["results"]
doc_hash_1 = doc_results[0]["hash"]
print(f"Document upload successful. Hashed: {doc_hash_1}")

# 5. Test Verify Document
print("Testing Document Verification (Valid)...")
with open("test_doc.txt", "rb") as f:
    res = requests.post(f"{BASE_URL}/verify/document", files={"file": f})
assert res.status_code == 200
verify_res = res.json()
assert verify_res["status"] == "VALID", f"Expected VALID, got {verify_res['status']}"
print("Document verification (VALID) successful.")

# 6. Test Document Revocation
print("Testing Document Revocation...")
res = requests.post(f"{BASE_URL}/document/revoke", data={"doc_hash": doc_hash_1}, headers={"Authorization": f"Bearer {org_token}"})
assert res.status_code == 200, f"Revocation failed: {res.text}"
print("Document revocation successful.")

# 7. Test Verify Document Again (Revoked)
print("Testing Document Verification (Revoked)...")
with open("test_doc.txt", "rb") as f:
    res = requests.post(f"{BASE_URL}/verify/document", files={"file": f})
assert res.status_code == 200
verify_res = res.json()
assert verify_res["status"] == "REVOKED", f"Expected REVOKED, got {verify_res['status']}"
print("Document verification (REVOKED) successful.")

print("All tests passed successfully!")
