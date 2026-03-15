// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract TrueDocsRegistry {
    
    struct DocumentRecord {
        address issuer;
        uint256 issuedAt;
        uint256 expiresAt; // 0 means no expiration
        bool isRevoked;
    }

    // Mapping from document hash to record
    mapping(string => DocumentRecord) public documents;

    event DocumentIssued(string docHash, address indexed issuer, uint256 expiresAt);
    event DocumentRevoked(string docHash, address indexed issuer);


    /**
     * @dev Register a document hash on the blockchain
     * @param docHash The SHA-256 hash of the document file
     * @param expiresAt Unix timestamp when the document expires (0 for never)
     */
    function issueDocument(string memory docHash, uint256 expiresAt) public {
        require(documents[docHash].issuer == address(0), "Document already issued");
        
        documents[docHash] = DocumentRecord({
            issuer: msg.sender,
            issuedAt: block.timestamp,
            expiresAt: expiresAt,
            isRevoked: false
        });

        emit DocumentIssued(docHash, msg.sender, expiresAt);
    }

    /**
     * @dev Revoke a previously issued document
     * @param docHash The hash of the document to revoke
     */
    function revokeDocument(string memory docHash) public {
        require(documents[docHash].issuer == msg.sender, "Only the issuer can revoke this document");
        require(!documents[docHash].isRevoked, "Document is already revoked");

        documents[docHash].isRevoked = true;
        emit DocumentRevoked(docHash, msg.sender);
    }

    /**
     * @dev Check the current validity of a document
     * @param docHash The hash of the document to check
     * @return isValid True if the document exists, is not revoked, and not expired
     * @return isRevoked True if manually revoked
     * @return isExpired True if past the expiration date
     */
    function verifyDocument(string memory docHash) public view returns (bool isValid, bool isRevoked, bool isExpired) {
        DocumentRecord memory record = documents[docHash];
        
        // If issuer is address 0, document doesn't exist
        if (record.issuer == address(0)) {
            return (false, false, false); 
        }

        isRevoked = record.isRevoked;
        
        // Check expiration (if expiresAt > 0 and current time >= expiresAt)
        if (record.expiresAt > 0 && block.timestamp >= record.expiresAt) {
            isExpired = true;
        } else {
            isExpired = false;
        }

        isValid = !isRevoked && !isExpired;
        
        return (isValid, isRevoked, isExpired);
    }
}
