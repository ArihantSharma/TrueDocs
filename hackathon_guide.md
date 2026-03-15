## 1. Practical MetaMask Setup (Step-by-Step)

Don't worry about the complex Web3 stuff. Just follow these 3 simple steps to get your "Demo Wallet" ready:

### Step A: Install the Tool
1.  Go to the Google Chrome Web Store and search for **MetaMask**.
2.  Click **"Add to Chrome"**.
3.  Follow the prompts to "Create a new wallet". **IMPORTANT**: Write down your "Secret Recovery Phrase" on paper—this is your master key (but for this demo, you can just skip through it).

### Step B: Connect to your Local Blockchain
Initially, MetaMask tries to connect to the "Ethereum Mainnet" (Real money). We need to point it to your computer's local testnet:
1.  Open the MetaMask extension in your browser.
2.  Click the **Network Selector** (top left, looks like a pill).
3.  Click **"Add network"** > **"Add a network manually"**.
4.  Fill it out exactly like this:
    -   **Network Name**: `Hardhat Local`
    -   **RPC URL**: `http://localhost:8545`
    -   **Chain ID**: `31337`
    -   **Currency Symbol**: `ETH`
5.  Click **Save**. You'll see "0 ETH".

### Step C: Get some "Free" Test ETH
1.  Go to the terminal where you ran `npx hardhat node`.
2.  Look for **"Account #0"**. Copy the long string below it labeled **"Private Key"**.
3.  In MetaMask, click the **Circle Icon** (top right) > **"Import account"**.
4.  Paste the Private Key and click **Import**.
5.  **Boom!** You now have 10,000 ETH on your local screen. You are ready to demo.

---

## 2. How we implemented this (The Tech Bridge)

We use a library called **`ethers.js`** inside the React frontend. It acts as the bridge between your website and MetaMask.

### The 3 Code Pillars:
1.  **The Provider (`ethers.BrowserProvider`)**: This is the "Listener". It detects if MetaMask is installed in your browser.
    ```javascript
    const provider = new ethers.BrowserProvider(window.ethereum);
    ```
2.  **The Signer**: This is the "Identity". When the user clicks "Connect", we ask MetaMask for the "Signer"—the specific person who will sign the transaction.
    ```javascript
    const signer = await provider.getSigner(); 
    ```
3.  **The Contract Object**: This is the "Remote Control". We tell `ethers.js` where our Smart Contract is and give it the **ABI** (the list of functions like `issueDocument`).
    ```javascript
    const contract = new ethers.Contract(ADDRESS, ABI, signer);
    ```

**What happens when you click "Upload"?**
The code calls `contract.issueDocument(hash, expiry)`. This triggers the MetaMask popup. When the user clicks "Confirm", MetaMask signs the data with their private key and broadcasts it to the blockchain. We don't touch their keys; MetaMask handles the security!
3. **The Demo Flow**:
   - **Login** as an Org.
   - **Connect Wallet** (MetaMask should pop up).
   - **Issue**: Upload a PDF, set an expiry date. Watch the console to show the transaction mining.
   - **Verify**: Go to the Landing Page (no account needed), drag the same PDF. Show the Green "VALID" badge.
   - **Revoke**: Go back to Org Posts, Revoke.
   - **Re-Verify**: Drag the same PDF again. Show the Red "REVOKED" badge.

---

## 2. Common Judge Questions & Winning Answers

### Q: "What token standard are you using? ERC-20? ERC-721 (NFT)?"
**A:** "We are not using a standard asset token like ERC-20 or ERC-721 because documents aren't meant to be traded. Instead, we've implemented a **Custom Registry Pattern** (similar to **EAS - Ethereum Attestation Service**). We store a cryptographic 'Attestation' of the document's hash. It acts like a **Soulbound Attestation**—it's strictly tied to the issuer's identity and can't be trashed or transferred."

### Q: "How does the automatic expiration work on-chain?"
**A:** "In blockchain, nothing happens 'automatically' without a transaction. Our solution uses **Logic-based Expiration**. When the document is issued, we save its `expiresAt` timestamp on-chain. Our `verifyDocument` view function checks the current `block.timestamp` against that saved value. If the current time is greater, the contract returns 'Expired' instantly. This ensures 'Decentralized Enforcement' without needing expensive recurring cron jobs."

### Q: "Why use Blockchain if you already have a SQL database?"
**A:** "The SQL database is for **Performance and Metadata** (titles, descriptions, organization names). The Blockchain is for **Immutability and Trust**. If an administrator hacks the SQL database and deletes a record, the public Verifier still works because it queries the **Blockchain directly**. We've separated the *Data* (IPFS/SQL) from the *Proof of Validity* (Ethereum)."

### Q: "How do you handle privacy? What if the document has sensitive data?"
**A:** "Great question. We **never** store the document itself on the blockchain. We only store its **SHA-256 Hash**. A hash is an anonymous, one-way fingerprint. It's impossible to reverse the hash to see the document content. This ensures GDPR compliance and user privacy while still proving the document hasn't been tampered with."

---

## 3. The "Elevator Pitch" (Technical Version)
"TrueDocs is an end-to-end trust layer. We use **IPFS** for decentralized storage and **Ethereum Smart Contracts** for immutable verification. By moving the verification logic on-chain, we've removed the 'centralized point of failure'. Even if our servers go down, any user in the world can verify their degree or certificate directly against the Ethereum ledger using their browser and our open-source contract."

---

## 4. Technical Deep Dive: The "Solid" in Solidity

If a judge asks **"What exactly is on-chain?"**, here is your breakdown:

### What are we saving?
We store a `DocumentRecord` struct for every file. This is the **minimum necessary data** to prove authenticity without compromising privacy:
- `address issuer`: The Ethereum address of the organization. This is the **Identity Proof**.
- `uint256 issuedAt`: The timestamp of when it was minted. This is the **Timeline Proof**.
- `uint256 expiresAt`: The future timestamp when it becomes invalid. This is the **Validity Proof**.
- `bool isRevoked`: A simple flag that, if true, overrides everything. This is the **Control Proof**.

### What is the use of Solidity?
- **Immutability**: Once a hash is recorded, nobody (not even your admin) can change the hash or who issued it. It is locked in the blockchain forever.
- **Programmable Trust**: We use code (Solidity) to enforce rules. For example, the `isExpired` check is strictly handled by the math of the smart contract, not a human.
- **Self-Sovereignty**: Organizations use their own wallets (MetaMask) to sign transactions. They "own" their records, not the TrueDocs database.

### The "Valid" Verification Logic:
When a judge asks how you verify, explain this simple 4-step check that happens inside the contract:
1. **Existence**: Does the hash exist? (Issuer ≠ 0)
2. **Integrity**: Is the hash identical to the one provided?
3. **Status**: Is the `isRevoked` flag false?
4. **Time**: Is the current `block.timestamp < expiresAt`?

---

## 5. Security & Cryptography
**Why SHA-256?**
Every document is converted into a **SHA-256 hash** before hitting the blockchain. 
- **Privacy**: No personal data is on the blockchain, only the hash.
- **Tamper-Proof**: If someone modifies even **one comma** in a PDF, the hash changes completely, and the blockchain will reject it as UNVERIFIED.

