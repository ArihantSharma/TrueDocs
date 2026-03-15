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
      localStorage.setItem(`wallet_${token?.substring(0,10)}`, address);

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
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Organization <span className="gradient-text">Dashboard</span></h1>
            <p className="text-slate-400 text-lg">Upload official documents to IPFS and issue them directly to the Ethereum Blockchain.</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => window.location.href='/organization/posts'} 
              className="px-6 py-2.5 glass-panel-hover rounded-xl text-white font-medium transition-all duration-300 border border-white/10 hover:border-blue-500/50 shadow-lg flex items-center"
            >
              <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
              Manage Vault
            </button>
            <button 
              onClick={handleLogout} 
              className="px-6 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-medium transition-all duration-300 rounded-xl border border-rose-500/20 hover:border-rose-500/50"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Wallet Connection Banner */}
        <div className={`
          relative overflow-hidden p-6 rounded-2xl mb-8 flex flex-col md:flex-row justify-between items-center gap-6 border transition-all duration-500 shadow-xl
          ${account 
            ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.1)]' 
            : 'bg-amber-500/10 border-amber-500/30'
          }
        `}>
          {networkWarning && (
            <div className="absolute top-0 left-0 right-0 bg-rose-500 text-white text-xs font-bold text-center py-1">
              {networkWarning}
            </div>
          )}
          
          <div className="flex items-center gap-4 z-10 w-full md:w-auto mt-2 md:mt-0">
            <div className={`p-3 rounded-full ${account ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
              </svg>
            </div>
            <div>
              {account ? (
                <>
                  <p className="text-emerald-400 font-bold text-lg mb-1">Wallet Connected Securely</p>
                  <p className="text-emerald-200/70 font-mono text-sm tracking-widest">{account}</p>
                </>
              ) : (
                <>
                  <p className="text-amber-400 font-bold text-lg mb-1">Wallet Connection Required</p>
                  <p className="text-amber-200/70 text-sm">Connect MetaMask to issue documents to the blockchain.</p>
                </>
              )}
            </div>
          </div>

          <div className="z-10 w-full md:w-auto">
             {account ? (
                <button
                  onClick={switchAccount}
                  className="w-full md:w-auto px-6 py-2.5 bg-black/40 hover:bg-black/60 text-slate-300 hover:text-white transition-all duration-300 rounded-xl border border-white/10 font-medium"
                >
                  Switch Account
                </button>
             ) : (
                <button 
                  onClick={connectWallet}
                  className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:shadow-[0_0_30px_rgba(245,158,11,0.6)] hover:scale-[1.02] transition-all duration-300"
                >
                  Connect MetaMask
                </button>
             )}
          </div>
        </div>

        {/* Upload Form */}
        <div className="glass-panel p-8 md:p-10 rounded-3xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-32 -mt-32"></div>

          <form onSubmit={handleUpload} className="relative z-10 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Left Column: Metadata */}
                <div className="space-y-6">
                    <h3 className="text-xl font-bold text-white mb-4 border-b border-white/10 pb-4">Document Metadata</h3>
                    
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300 ml-1">Document Batch Title</label>
                        <input 
                        type="text" 
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g., 2026 Graduating Class Certificates" 
                        required
                        disabled={!account}
                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300 ml-1">Holder Name(s) / Description</label>
                        <textarea 
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Name of the person holding these documents..." 
                        required
                        disabled={!account}
                        rows="3"
                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all font-medium resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300 ml-1">Validity Expiration Date</label>
                        <input 
                        type="date"
                        value={validity}
                        onChange={(e) => setValidity(e.target.value)}
                        required
                        disabled={!account}
                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ colorScheme: 'dark' }}
                        />
                    </div>
                </div>

                {/* Right Column: File Dropzone */}
                <div className="space-y-6 flex flex-col">
                    <h3 className="text-xl font-bold text-white mb-4 border-b border-white/10 pb-4">Upload Payload</h3>
                    
                    <div 
                        {...getRootProps()} 
                        className={`
                            flex-1 min-h-[250px] rounded-2xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center p-6 text-center
                            ${!account ? 'border-white/5 bg-black/20 cursor-not-allowed opacity-50' : 
                              isDragActive ? 'border-emerald-500/50 bg-emerald-500/10 scale-[1.02]' : 
                              'border-white/20 bg-black/30 hover:border-blue-500/50 hover:bg-white/5 cursor-pointer'}
                        `}
                    >
                        <input {...getInputProps()} disabled={!account} />
                        <div className={`p-4 rounded-full mb-4 ${isDragActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-slate-400'}`}>
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                        </div>
                        {isDragActive ? (
                            <p className="text-xl text-emerald-400 font-bold">Release to drop files here!</p>
                        ) : (
                            <div className="space-y-2">
                                <p className="text-lg text-slate-200 font-medium">{account ? "Drag & drop files here" : "Wallet lock active"}</p>
                                <p className="text-sm text-slate-400">{account ? "or click to browse from your computer" : "Connect MetaMask to unlock upload"}</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* Selected Files List */}
            {files.length > 0 && (
              <div className="bg-black/40 rounded-2xl p-6 border border-white/5 animate-in fade-in">
                <h4 className="text-slate-300 font-bold mb-4 flex items-center">
                   <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-sm mr-2">{files.length}</span>
                   Queued for Issuance
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {files.map((file, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-white/5 border border-white/5 rounded-xl group hover:bg-white/10 transition-colors">
                      <div className="flex items-center text-slate-300 overflow-hidden">
                        <svg className="w-5 h-5 mr-3 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                        <span className="truncate text-sm font-medium">{file.name}</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => removeFile(file.name)}
                        className="text-slate-500 hover:text-rose-400 transition-colors p-1.5 rounded-lg hover:bg-rose-500/10 ml-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-4 border-t border-white/10">
                <button 
                type="submit" 
                disabled={uploading || !account || files.length === 0}
                className={`
                    w-full relative group overflow-hidden rounded-xl font-bold text-lg tracking-wider py-4 transition-all duration-300 flex items-center justify-center
                    ${(uploading || !account || files.length === 0)
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border-none' 
                        : 'bg-gradient-to-r from-blue-600 to-emerald-600 text-white hover:shadow-[0_0_40px_rgba(16,185,129,0.3)] hover:scale-[1.01] border-none'
                    }
                `}
                >
                {uploading ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Confirming on Blockchain...
                    </>
                ) : (
                    <>
                        <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                        Sign & Issue to Blockchain
                    </>
                )}
                </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OrgDashboard;