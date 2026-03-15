# TrueDocs Project Summary

TrueDocs is a full-stack document verification platform that allows organizations to cryptographically sign, issue, and revoke official documents. Users can then verify the authenticity and validity of these documents without needing an account.

## System Architecture

The project runs on a containerized Docker infrastructure with three main services:

1. **Frontend (`frontend/`)**: 
   - Built with **React.js** (uses `react-router-dom`, `react-dropzone`).
   - Served via **Nginx** in production using a multi-stage Docker build.
   - Runs on port `3000`.

2. **Backend (`backend/`)**:
   - Built with **Python 3.11** and **FastAPI**.
   - Handles JWT authentication, file hashing (SHA-256), and IPFS interaction.
   - Runs via Uvicorn on port `8000`.
   - Uses a `.env` file for secrets (JWT Secret, Database URL, Pinata IPFS keys).
   - Includes an entrypoint script (`start.sh`) that automatically runs `create_admin.py` to seed the database before starting the API.

3. **Database (`db`)**:
   - **PostgreSQL 15** running on port `5432`.
   - Stores users (Admins, Organizations) and document hashes. 
   - Acts as an internal "SQL Blockchain" to track document issuance and revocation transactions.

## Core Features
1. **Admin Portal (`/admin`)**: 
   - Superadmins can log in and register new Organizations (creates an Org UUID and password).
2. **Organization Portal (`/organization`)**: 
   - Logged-in organizations can batch-upload documents.
   - Documents are hashed and optionally uploaded to IPFS (via Pinata).
   - Hashes are logged in the database to prove they were officially issued by that organization.
3. **Organization Post Management (`/organization/posts`)**:
   - Organizations can view all previously uploaded document batches (Posts).
   - Can edit the Batch Title and Description (Holder Name).
   - Can bulk **Revoke** an entire batch of documents at once.
4. **Public Verifier (`/` Landing Page)**: 
   - Public users can drag-and-drop multiple documents at once.
   - The frontend recalculates the file hash and pings the backend.
   - The backend checks the SQL database. If the hash exists and isn't revoked, it returns `VALID` (Green). If revoked, it returns `REVOKED` (Red). If it doesn't exist, it returns `UNVERIFIED` (Yellow).

## Important Implementation Details
*   **Ethereum Smart Contract Integration:** The project now features a fully functional Solidity smart contract (`TrueDocsRegistry.sol`) deployed on a local Hardhat network. It handles issuance, revocation, and automated expiration logic.
*   **Web3 Frontend:** The `OrgDashboard` and `OrgPosts` pages use `ethers.js` and MetaMask for transaction signing. The `LandingPage` queries the blockchain directly for verification.
*   **Dockerized Environment:** All services (React, FastAPI, PostgreSQL) are fully containerized and connected via internal Docker networks. 
*   **IPFS Support:** Files are pinned to IPFS via Pinata, providing a decentralized storage backup for documentary evidence.

## How to Run the Project
1. Ensure Docker Desktop is running.
2. Initialize the Blockchain:
   ```bash
   cd backend/blockchain
   npx hardhat node
   # (In a separate terminal)
   npx hardhat ignition deploy ignition/modules/TrueDocs.js --network localhost
   ```
3. Build and Start the App:
   ```bash
   cd ../..
   docker-compose up --build -d
   ```
4. Access the Frontend at `http://localhost:3000`

## Potential Next Steps
* **Testnet Deployment:** Deploy the contract to Sepolia or Polygon Mumbai.
* **Non-Custodial Org Onboarding:** Allow organizations to register their wallet addresses via the Admin Panel.
* **Email Proofs:** Integration with email services to send verification receipts to holder names.
