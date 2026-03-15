import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import TrueDocsRegistryABI from '../contracts/TrueDocsRegistryABI.json';

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

const OrgPosts = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Wallet state
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);

  // Modal state
  const [editingPost, setEditingPost] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [newHolder, setNewHolder] = useState('');
  
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchPosts();
  }, [navigate, token]);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask! Get it at: https://metamask.io/download/");
      return;
    }

    try {
      // Switch to Hardhat FIRST
      const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
      const currentChainId = parseInt(chainIdHex, 16);

      if (currentChainId !== 31337) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x7A69' }],
          });
        } catch (switchError) {
          if (switchError.code === 4902) {
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
      }

      // Verify chain
      const confirmedChainHex = await window.ethereum.request({ method: 'eth_chainId' });
      if (parseInt(confirmedChainHex, 16) !== 31337) {
        alert('❌ Still not on Hardhat Local. Please switch manually in MetaMask (Chain ID 31337).');
        return;
      }

      // Fresh provider AFTER switch
      const freshProvider = new ethers.BrowserProvider(window.ethereum);
      await freshProvider.send("eth_requestAccounts", []);
      const signer = await freshProvider.getSigner();
      const address = await signer.getAddress();
      setAccount(address);

      const loadedContract = new ethers.Contract(CONTRACT_ADDRESS, TrueDocsRegistryABI, signer);
      setContract(loadedContract);
    } catch (error) {
      if (error.code !== 4001) {
        console.error("Wallet connection failed:", error);
        alert(`Wallet connection failed: ${error.message}`);
      }
    }
  };

  const fetchPosts = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/document/posts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch posts');
      const data = await res.json();
      setPosts(data.posts);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (post) => {
    setEditingPost(post);
    setNewTitle(post.post_title);
    setNewHolder(post.holder_name);
  };

  const submitEdit = async () => {
    if (!newTitle.trim() || !newHolder.trim()) {
      alert("Both Title and Holder Name are required");
      return;
    }

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/document/post`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          old_post_title: editingPost.post_title,
          new_post_title: newTitle,
          new_holder_name: newHolder
        })
      });

      if (!res.ok) throw new Error('Failed to update post');
      
      setEditingPost(null);
      fetchPosts(); // Refresh list
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRevoke = async (postTitle) => {
    if (!account || !contract) {
      alert("Please connect your MetaMask wallet first!");
      return;
    }

    const confirmRevoke = window.confirm(`Are you absolutely sure you want to revoke ALL documents in the post "${postTitle}"?\nThis action involves signing transactions on the Ethereum blockchain and cannot be undone.`);
    if (!confirmRevoke) return;

    try {
      setLoading(true);
      // 1. Get all document hashes for this post from backend
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/document/posts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch post details for revocation');
      const data = await res.json();
      
      // Filter documents for this specific batch title if needed, 
      // but the current API returns simplified results. 
      // Let's call a specific endpoint for documents within a post (which we implemented earlier in the backend)
      
      const docRes = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/document/post/documents?post_title=${encodeURIComponent(postTitle)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!docRes.ok) throw new Error('Failed to fetch document hashes for this post');
      const docData = await docRes.json();
      
      // 2. Revoke each on the blockchain
      for (const doc of docData.documents) {
        if (!doc.revoked) {
           console.log(`Revoking hash on blockchain: ${doc.document_hash}`);
           const tx = await contract.revokeDocument(doc.document_hash);
           await tx.wait();
           console.log(`Hash ${doc.document_hash} revoked on blockchain.`);
        }
      }

      // 3. Update backend state (relational mapping)
      const finalRes = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/document/post`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ post_title: postTitle })
      });

      if (!finalRes.ok) throw new Error('Failed to update backend revocation status');
      
      alert(`Post "${postTitle}" has been successfully revoked on both the blockchain and the database.`);
      fetchPosts(); // Refresh list
    } catch (err) {
        console.error(err);
        alert(`Revocation error: ${err.message}`);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h2 className="text-4xl font-bold text-white tracking-tight mb-2">Manage <span className="gradient-text">Vault</span></h2>
            <p className="text-slate-400 text-lg">View, edit, or revoke issued document batches.</p>
          </div>
          <button 
            onClick={() => navigate('/organization/')}
            className="px-6 py-2.5 glass-panel-hover rounded-xl text-white font-medium transition-all duration-300 border border-white/10 flex items-center shadow-lg"
          >
            <svg className="w-5 h-5 mr-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            Back to Issuance
          </button>
        </div>

        {errorMsg && (
          <div className="mb-8 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl font-medium animate-in fade-in">
            {errorMsg}
          </div>
        )}

        {/* Wallet Connection Banner (For Revocation) */}
        <div className={`
          relative overflow-hidden p-6 rounded-2xl mb-10 flex flex-col md:flex-row justify-between items-center gap-6 border transition-all duration-500 shadow-xl
          ${account 
            ? 'bg-emerald-500/10 border-emerald-500/30' 
            : 'bg-amber-500/10 border-amber-500/30'
          }
        `}>
          <div className="flex items-center gap-4 z-10 w-full md:w-auto">
            <div className={`p-3 rounded-full ${account ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
              </svg>
            </div>
            <div>
              {account ? (
                <>
                  <p className="text-emerald-400 font-bold text-lg mb-1">Revocation Authority Active</p>
                  <p className="text-emerald-200/70 font-mono text-sm tracking-widest">{account}</p>
                </>
              ) : (
                <>
                  <p className="text-amber-400 font-bold text-lg mb-1">Wallet Required for Revocation</p>
                  <p className="text-amber-200/70 text-sm">Connect your Web3 Wallet to perform batch revocations.</p>
                </>
              )}
            </div>
          </div>
          
          {!account && (
            <div className="z-10 w-full md:w-auto">
              <button 
                onClick={connectWallet}
                className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:shadow-[0_0_30px_rgba(245,158,11,0.6)] transition-all duration-300"
              >
                Connect MetaMask
              </button>
            </div>
          )}
        </div>

        {/* Data Container */}
        <div className="glass-panel rounded-3xl overflow-hidden relative min-h-[400px]">
           {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <svg className="animate-spin h-10 w-10 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-slate-400 font-medium">Fetching secure vault records...</p>
            </div>
           ) : posts.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
              </div>
              <p className="text-slate-300 text-xl font-medium mb-2">Your vault is empty</p>
              <p className="text-slate-500">You haven't issued any document batches yet.</p>
            </div>
           ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead>
                  <tr className="bg-black/40 text-slate-400 text-xs uppercase tracking-widest border-b border-white/10">
                    <th className="px-8 py-5 font-semibold">Post Title</th>
                    <th className="px-6 py-5 font-semibold">Holder Name</th>
                    <th className="px-6 py-5 font-semibold">Volume</th>
                    <th className="px-6 py-5 font-semibold">Issued Date</th>
                    <th className="px-6 py-5 font-semibold">Status</th>
                    <th className="px-8 py-5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {posts.map((post, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition-colors group">
                      <td className="px-8 py-5">
                        <span className="text-white font-medium text-lg">{post.post_title}</span>
                      </td>
                      <td className="px-6 py-5 text-slate-300">
                        {post.holder_name}
                      </td>
                      <td className="px-6 py-5">
                        <span className="bg-white/10 text-slate-300 px-3 py-1 rounded-full text-xs font-semibold">{post.document_count} files</span>
                      </td>
                      <td className="px-6 py-5 text-slate-400">
                        {new Date(post.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-6 py-5">
                         {post.any_revoked ? (
                             <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.2)]">
                               REVOKED
                             </span>
                         ) : !post.all_confirmed ? (
                             <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
                               PENDING
                             </span>
                         ) : (
                             <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                               ACTIVE
                             </span>
                         )}
                      </td>
                      <td className="px-8 py-5 text-right space-x-3">
                         <button 
                             onClick={() => handleEditClick(post)}
                             disabled={post.any_revoked}
                             className={`
                               px-4 py-2 rounded-lg font-medium text-sm transition-all
                               ${post.any_revoked 
                                 ? 'bg-black/20 text-slate-600 cursor-not-allowed' 
                                 : 'bg-white/10 text-white hover:bg-white/20 border border-white/10 hover:border-white/30'}
                             `}
                          >
                             Edit
                         </button>
                         <button 
                             onClick={() => handleRevoke(post.post_title)}
                             disabled={post.any_revoked}
                             className={`
                               px-4 py-2 rounded-lg font-medium text-sm transition-all
                               ${post.any_revoked 
                                 ? 'bg-black/20 text-slate-600 cursor-not-allowed' 
                                 : 'bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white border border-rose-500/30 hover:border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.1)] hover:shadow-[0_0_20px_rgba(244,63,94,0.4)]'}
                             `}
                          >
                             Revoke Batch
                         </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
           )}
        </div>
      </div>

      {/* Edit Modal (Glass UI) */}
      {editingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 p-8 rounded-3xl shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300">
            
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mt-10 -mr-10 pointer-events-none"></div>

            <div className="relative z-10">
              <h3 className="text-2xl font-bold text-white mb-6">Edit Meta: <span className="text-blue-400">{editingPost.post_title}</span></h3>
              
              <div className="space-y-5">
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-300 ml-1">Batch / Post Title</label>
                    <input 
                        type="text" 
                        value={newTitle} 
                        onChange={e => setNewTitle(e.target.value)} 
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all font-medium"
                    />
                </div>

                <div className="space-y-1.5 mb-8">
                    <label className="text-sm font-medium text-slate-300 ml-1">Holder / Description Name</label>
                    <input 
                        type="text" 
                        value={newHolder} 
                        onChange={e => setNewHolder(e.target.value)} 
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all font-medium"
                    />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                    <button 
                        onClick={() => setEditingPost(null)}
                        className="px-5 py-2.5 rounded-xl font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={submitEdit}
                        className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-emerald-600 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] text-white font-semibold rounded-xl transition-all"
                    >
                        Save Changes
                    </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default OrgPosts;
