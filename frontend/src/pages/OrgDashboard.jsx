import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { ethers } from 'ethers';
import TrueDocsRegistryABI from '../contracts/TrueDocsRegistryABI.json';

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

const OrgDashboard = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [validity, setValidity] = useState('');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  
  // Wallet state
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [networkWarning, setNetworkWarning] = useState('');

  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  useEffect(() => {
    if (role !== "organisation") {
      window.location.href = "/login";
    }
    // Auto-reconnect wallet if previously connected for this org
    const savedWallet = localStorage.getItem(`wallet_${token?.substring(0,10)}`);
    if (savedWallet && window.ethereum) {
      window.ethereum.request({ method: 'eth_chainId' }).then(hex => {
        if (parseInt(hex, 16) === 31337) {
          const provider = new ethers.BrowserProvider(window.ethereum);
          provider.getSigner().then(signer => {
            signer.getAddress().then(address => {
              if (address.toLowerCase() === savedWallet.toLowerCase()) {
                setAccount(address);
                setContract(new ethers.Contract(CONTRACT_ADDRESS, TrueDocsRegistryABI, signer));
              }
            });
          }).catch(() => {});
        }
      }).catch(() => {});
    }
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask! Get it at: https://metamask.io/download/");
      return;
    }

    try {
      // Step 1: Switch to Hardhat FIRST before requesting accounts
      const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
      const currentChainId = parseInt(chainIdHex, 16);

      if (currentChainId !== 31337) {
        setNetworkWarning('⚠️ Switching MetaMask to Hardhat Local network...');
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x7A69' }],
          });
        } catch (switchError) {
          if (switchError.code === 4902) {
            // Network not in MetaMask yet — add it
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x7A69',
                chainName: 'Hardhat Local',
                rpcUrls: ['http://127.0.0.1:8545'],
                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
              }],
            });
          } else {
            throw switchError;
          }
        }
        setNetworkWarning('');
      }

      // Step 2: Verify we are now on the right chain
      const confirmedChainHex = await window.ethereum.request({ method: 'eth_chainId' });
      const confirmedChainId = parseInt(confirmedChainHex, 16);
      if (confirmedChainId !== 31337) {
        alert('❌ Still not on Hardhat Local. Please switch manually in MetaMask to "Hardhat Local" (Chain ID 31337) and try again.');
        return;
      }

      // Step 3: Create a FRESH provider AFTER the chain switch - this is the key fix!
      const freshProvider = new ethers.BrowserProvider(window.ethereum);
      await freshProvider.send("eth_requestAccounts", []);

      const signer = await freshProvider.getSigner();
      const address = await signer.getAddress();
      setAccount(address);
      setNetworkWarning('');

      // Step 4: Create contract on the fresh, correctly-networked signer
      const loadedContract = new ethers.Contract(CONTRACT_ADDRESS, TrueDocsRegistryABI, signer);
      setContract(loadedContract);
    } catch (error) {
      if (error.code !== 4001) {
        console.error("Wallet connection failed:", error);
        alert(`Wallet error: ${error.message}`);
      }
    }
  };

  // Fix Switch Account: use wallet_requestPermissions which shows the full account picker
  const switchAccount = async () => {
    if (!window.ethereum) return;
    try {
      // This is the ONLY call that always shows the account picker
      await window.ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }],
      });
      setAccount(null);
      setContract(null);
      await connectWallet();
    } catch (e) {
      if (e.code !== 4001) alert('Could not switch account: ' + e.message);
    }
  };

  const onDrop = useCallback(acceptedFiles => {
    setFiles(prevFiles => [...prevFiles, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const removeFile = (fileToRemoveName) => {
    setFiles(files.filter(file => file.name !== fileToRemoveName));
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      alert("Please add at least one file to upload.");
      return;
    }
    
    if (!account || !contract) {
      alert("Please connect your MetaMask wallet first!");
      return;
    }

    setUploading(true);
    
    try {
      // 1. Upload files to backend to get IPFS CIDs and Hashes
      const formData = new FormData();
      formData.append("post_title", title);
      formData.append("holder_name", description); 
      formData.append("validity", validity);
      
      files.forEach(file => {
          formData.append("files", file);
      });

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/document/upload`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error("Backend IPFS upload failed");
      }

      const backendData = await response.json();
      console.log("Backend Upload Success:", backendData);

      // 2. Sign transactions on the blockchain + confirm to backend
      const expiryTimestamp = Math.floor(new Date(validity).getTime() / 1000);
      let mintedCount = 0;
      
      for (const result of backendData.results) {
        if (result.hash) {
          try {
            console.log(`Issuing document hash: ${result.hash} expiring at ${expiryTimestamp}`);
            const tx = await contract.issueDocument(result.hash, expiryTimestamp);
            const receipt = await tx.wait(); // Wait for mining
            console.log(`✅ Minted on blockchain! Tx: ${receipt.hash}`);
            mintedCount++;

            // Confirm to backend that blockchain issuance succeeded
            await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/document/confirm_blockchain`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ doc_hash: result.hash, tx_hash: receipt.hash, wallet_address: account })
            });
          } catch (txErr) {
            // Surface the FULL error so we can see what's actually failing
            console.error(`❌ Blockchain tx failed for ${result.hash}:`, txErr);
            const errMsg = txErr?.reason || txErr?.message || String(txErr);
            alert(`❌ Blockchain transaction failed for "${result.filename}":\n\n${errMsg}\n\n(File was saved to IPFS/DB but NOT written to blockchain)`);
          }
        } else {
          // Backend returned an error - show it clearly
          console.error('❌ Backend returned no hash for:', result);
          alert(`❌ Backend failed for "${result.filename}":\n\n${result.error || 'Unknown backend error'}\n\nCheck backend logs.`);
        }

      }

      // Save wallet address for this session
      localStorage.setItem(`wallet_${token?.substring(0,10)}`, account);

      if (mintedCount === 0) {
        alert(`⚠️ Files were saved to IPFS but NO documents were written to the blockchain. Check the error above.`);
      } else {
        alert(`✅ ${mintedCount} of ${files.length} document(s) minted on the Ethereum blockchain!`);
      }
      
      setTitle('');
      setDescription('');
      setValidity('');
      setFiles([]);
    } catch (err) {
      console.error(err);
      alert(`Error during issuance process: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Organization Dashboard</h1>
        <div>
          <button onClick={() => window.location.href='/organization/posts'} style={{ padding: '10px 20px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', marginRight: '10px' }}>
            Manage Posts
          </button>
          <button onClick={handleLogout} style={{ padding: '10px 20px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
            Logout
          </button>
        </div>
      </div>
      <p style={{ color: '#555', marginBottom: '30px' }}>Upload official documents to IPFS and issue them directly to the Ethereum Blockchain.</p>

      {/* Wallet Connection Banner */}
      <div style={{ 
        backgroundColor: account ? '#d4edda' : '#fff3cd', 
        padding: '15px', 
        borderRadius: '8px', 
        marginBottom: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        border: `1px solid ${account ? '#c3e6cb' : '#ffeeba'}`
      }}>
        {networkWarning && (
          <p style={{ margin: 0, color: '#721c24', fontWeight: 'bold', backgroundColor: '#f8d7da', padding: '8px', borderRadius: '4px' }}>
            {networkWarning}
          </p>
        )}
        {account ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ margin: 0, color: '#155724', fontWeight: 'bold' }}>
              ✅ Wallet Connected: {account.substring(0, 6)}...{account.substring(38)}
            </p>
            <button
              onClick={connectWallet}
              style={{ padding: '5px 12px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              Switch Account
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, color: '#856404', fontWeight: 'bold' }}>
                ⚠️ Connect your MetaMask wallet to issue documents.
              </p>
              <p style={{ margin: '4px 0 0 0', color: '#856404', fontSize: '0.85rem' }}>
                Make sure you imported the Hardhat test account (see logs: <code>docker-compose logs hardhat</code>)
              </p>
            </div>
            <button 
              onClick={connectWallet}
              style={{ padding: '8px 15px', backgroundColor: '#f5841f', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap', marginLeft: '10px' }}
            >
              Connect MetaMask
            </button>
          </div>
        )}
      </div>

      <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <form onSubmit={handleUpload}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Document Batch Title</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., 2026 Graduating Class Certificates" 
              required
              disabled={!account}
              style={{ width: '100%', padding: '12px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px', backgroundColor: !account ? '#e9ecef' : '#fff' }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Holder Name(s) / Description</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Name of the person holding these documents..." 
              required
              disabled={!account}
              rows="2"
              style={{ width: '100%', padding: '12px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px', resize: 'vertical', backgroundColor: !account ? '#e9ecef' : '#fff' }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Validity Expiration Date</label>
            <input 
              type="date"
              value={validity}
              onChange={(e) => setValidity(e.target.value)}
              required
              disabled={!account}
              style={{ width: '100%', padding: '12px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px', backgroundColor: !account ? '#e9ecef' : '#fff' }}
            />
          </div>

          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Files</label>
          <div 
            {...getRootProps()} 
            style={{
              border: isDragActive ? '2px dashed #007bff' : '2px dashed #ccc',
              backgroundColor: isDragActive ? '#e9f2fc' : (!account ? '#e9ecef' : '#fafafa'),
              padding: '40px 20px',
              borderRadius: '8px',
              textAlign: 'center',
              cursor: account ? 'pointer' : 'not-allowed',
              marginBottom: '20px',
              transition: 'all 0.2s ease'
            }}
          >
            <input {...getInputProps()} disabled={!account} />
            {isDragActive ? (
              <p style={{ color: '#007bff', margin: 0 }}>Drop the files here!</p>
            ) : (
              <p style={{ color: '#666', margin: 0 }}>
                {account ? "Drag 'n' drop multiple files here, or click to select files" : "Connect wallet to upload files"}
              </p>
            )}
          </div>

          {files.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ marginBottom: '10px' }}>Files to Upload:</h4>
              <ul style={{ listStyleType: 'none', padding: 0 }}>
                {files.map((file, index) => (
                  <li key={index} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', backgroundColor: '#f4f7f6', marginBottom: '5px', borderRadius: '4px' }}>
                    <span>📄 {file.name}</span>
                    <button 
                      type="button" 
                      onClick={() => removeFile(file.name)}
                      style={{ color: '#dc3545', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      X
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button 
            type="submit" 
            disabled={uploading || !account}
            style={{ width: '100%', padding: '15px', backgroundColor: (uploading || !account) ? '#6c757d' : '#28a745', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '18px', cursor: (uploading || !account) ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
          >
            {uploading ? 'Confirming on Blockchain...' : 'Sign & Upload to IPFS'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default OrgDashboard;