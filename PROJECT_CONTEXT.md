# PROJECT CONTEXT: TrueDocs (Ethereum-Enabled Document Verification)

This document serves as a full context injection for an AI coding assistant to understand the TrueDocs codebase, architecture, and current state. 

---

## 1. Project Mission
**TrueDocs** is a decentralized document verification platform. It allows Organizations (Orgs) to issue tamper-proof digital documents. Validity and authenticity are verified directly against the **Ethereum Blockchain**, removing the need for a centralized "Trust Authority."

---

## 2. Technical Stack
- **Frontend**: React.js, Vanilla CSS (Premium styling), `ethers.js` (Web3 integration).
- **Backend**: FastAPI (Python), SQLAlchemy, PostgreSQL, `web3.py` (legacy/background), `uvicorn`.
- **Blockchain**: Solidity (0.8.24), Hardhat (Development testnet), MetaMask (User Wallet).
- **Storage**: IPFS (via Pinata) for decentralized file availability.
- **Infrastructure**: Docker & Docker Compose (3 services: `backend`, `frontend`, `db`).

---

## 3. Core Architecture & Workflow

### A. Issuance (Organization Side)
1. **Auth**: Org logs in via JWT.
2. **Batch Upload**: Org selects multiple files.
3. **Hashing**: Files are hashed using **SHA-256** (Backend).
4. **Metadata**: Hash, CID (IPFS), Title, and Expiration are stored in PostgreSQL (`db`).
5. **On-Chain Minting**: The Frontend triggers a MetaMask transaction calling `issueDocument(hash, expiresAt)` on the smart contract.
6. **Result**: The document is now "Officially Issued" by the Org's wallet address on-chain.

### B. Verification (Public Side)
1. **Zero-Trust**: No login required. 
2. **Local Hashing**: Frontend hashes the dropped file in the browser (`crypto.subtle`).
3. **On-Chain Query**: Frontend calls `verifyDocument(hash)` using an RPC provider (Hardhat).
4. **Result**: The contract returns a status tuple: `(boolean isValid, boolean isRevoked, boolean isExpired)`.
5. **Enforcement**: Expiration is calculated **on-chain** by comparing the current `block.timestamp` to the stored `expiresAt`.

### C. Revocation
Orgs can manually "Kill" a document. This requires a MetaMask transaction calling `revokeDocument(hash)`. Once revoked on-chain, it can never be un-revoked.

---

## 4. Database Schema (PostgreSQL)
- **Users Table**: `user_id`, `username`, `password_hash`, `role` (ADMIN, ORGANISATION).
- **Documents Table**: 
  - `id` (UUID), `org_id` (FK), `post_title`, `title`, `holder_name`, `validity` (String), `document_hash` (Unique Index), `ipfs_cid`, `revoked` (Boolean).

---

## 5. Blockchain Layer Details
- **Contract Address**: `0x5FbDB2315678afecb367f032d93F642f64180aa3` (Local Hardhat).
- **ABI Location**: `frontend/src/contracts/TrueDocsRegistryABI.json`.
- **Logic**: A mapping `string (hash) => DocumentRecord`. The mapping key is the file hash.

---

## 6. Current Operational State
- **Status**: Stable / Feature Complete for Hackathon.
- **Network**: Hardhat Local Node (Chain ID 31337).
- **Environment**: All services are running in Docker. Backend auto-creates an admin user (`admin` / `admin123`) on startup.
- **Key Files for Reference**:
  - `backend/blockchain/contracts/TrueDocsRegistry.sol`
  - `frontend/src/pages/LandingPage.jsx` (Verification Logic)
  - `frontend/src/pages/OrgDashboard.jsx` (Issuance Logic)
  - `backend/routes/document_routes.py` (API Layer)

---

## 7. Instructions for Future Agents
- **Local Testing**: You must run `npx hardhat node` inside `backend/blockchain` to see the blockchain interactions.
- **MetaMask**: Point MetaMask to `http://localhost:8545` if you need to simulate user transactions.
- **Security**: Always ensure file hashing in the Verifier matches the Backend hashing (`SHA-256`).
