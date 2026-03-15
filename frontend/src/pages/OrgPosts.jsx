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
    <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2>Manage Document Posts</h2>
        <button 
          onClick={() => navigate('/organization/')}
          style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          Back to Upload
        </button>
      </div>

      {errorMsg && <p style={{ color: 'red' }}>{errorMsg}</p>}

      {/* Wallet Connection Banner */}
      <div style={{ 
        backgroundColor: account ? '#d4edda' : '#fff3cd', 
        padding: '15px', 
        borderRadius: '8px', 
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        border: `1px solid ${account ? '#c3e6cb' : '#ffeeba'}`
      }}>
        {account ? (
          <p style={{ margin: 0, color: '#155724', fontWeight: 'bold' }}>
            ✅ Wallet Connected: {account.substring(0, 6)}...{account.substring(38)}
          </p>
        ) : (
          <>
            <p style={{ margin: 0, color: '#856404' }}>
              ⚠️ You must connect your Web3 Wallet to perform batch revocations.
            </p>
            <button 
              onClick={connectWallet}
              style={{ padding: '8px 15px', backgroundColor: '#f5841f', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Connect MetaMask
            </button>
          </>
        )}
      </div>

      {loading ? (
        <p>Loading posts...</p>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <p style={{ fontSize: '1.2rem', color: '#6c757d' }}>No document posts found.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', backgroundColor: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
            <thead>
                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                <th style={{ padding: '15px' }}>Post Title</th>
                <th style={{ padding: '15px' }}>Holder Name</th>
                <th style={{ padding: '15px' }}>Documents</th>
                <th style={{ padding: '15px' }}>Date Uploaded</th>
                <th style={{ padding: '15px' }}>Status</th>
                <th style={{ padding: '15px', textAlign: 'right' }}>Actions</th>
                </tr>
            </thead>
            <tbody>
                {posts.map((post, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '15px', fontWeight: 'bold' }}>{post.post_title}</td>
                    <td style={{ padding: '15px' }}>{post.holder_name}</td>
                    <td style={{ padding: '15px' }}>{post.document_count} files</td>
                    <td style={{ padding: '15px' }}>{new Date(post.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '15px' }}>
                        {post.any_revoked ? (
                            <span style={{ color: '#dc3545', fontWeight: 'bold' }}>🔴 REVOKED</span>
                        ) : !post.all_confirmed ? (
                            <span style={{ color: '#856404', fontWeight: 'bold', backgroundColor: '#fff3cd', padding: '2px 8px', borderRadius: '4px' }}>⏳ PENDING BLOCKCHAIN</span>
                        ) : (
                            <span style={{ color: '#28a745', fontWeight: 'bold' }}>✅ ACTIVE</span>
                        )}
                    </td>
                    <td style={{ padding: '15px', textAlign: 'right' }}>
                        <button 
                            onClick={() => handleEditClick(post)}
                            disabled={post.any_revoked}
                            style={{ padding: '6px 12px', marginRight: '10px', backgroundColor: post.any_revoked ? '#e9ecef' : '#ffc107', color: post.any_revoked ? '#6c757d' : '#000', border: 'none', borderRadius: '4px', cursor: post.any_revoked ? 'not-allowed' : 'pointer' }}>
                            Edit
                        </button>
                        <button 
                            onClick={() => handleRevoke(post.post_title)}
                            disabled={post.any_revoked}
                            style={{ padding: '6px 12px', backgroundColor: post.any_revoked ? '#e9ecef' : '#dc3545', color: post.any_revoked ? '#6c757d' : 'white', border: 'none', borderRadius: '4px', cursor: post.any_revoked ? 'not-allowed' : 'pointer' }}>
                            Revoke
                        </button>
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
      )}

      {/* Edit Modal */}
      {editingPost && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', width: '400px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Edit Post: {editingPost.post_title}</h3>
            
            <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Batch/Post Title</label>
                <input 
                    type="text" 
                    value={newTitle} 
                    onChange={e => setNewTitle(e.target.value)} 
                    style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                />
            </div>

            <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Holder/Description Name</label>
                <input 
                    type="text" 
                    value={newHolder} 
                    onChange={e => setNewHolder(e.target.value)} 
                    style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button 
                    onClick={() => setEditingPost(null)}
                    style={{ padding: '10px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                    Cancel
                </button>
                <button 
                    onClick={submitEdit}
                    style={{ padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                    Save Changes
                </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default OrgPosts;
