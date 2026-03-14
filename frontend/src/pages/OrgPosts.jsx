import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const OrgPosts = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
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
    const confirmRevoke = window.confirm(`Are you absolutely sure you want to revoke ALL documents in the post "${postTitle}"?\nThis action cannot be undone and will permanently mark them as revoked on the blockchain.`);
    if (!confirmRevoke) return;

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/document/post`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ post_title: postTitle })
      });

      if (!res.ok) throw new Error('Failed to revoke post');
      
      alert(`Post "${postTitle}" has been successfully revoked.`);
      fetchPosts(); // Refresh list
    } catch (err) {
        alert(err.message);
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
                            <span style={{ color: '#dc3545', fontWeight: 'bold' }}>REVOKED</span>
                        ) : (
                            <span style={{ color: '#28a745', fontWeight: 'bold' }}>ACTIVE</span>
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
