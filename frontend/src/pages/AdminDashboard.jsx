import React, { useState, useEffect } from 'react';

const AdminDashboard = () => {
  const [organizations, setOrganizations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newOrg, setNewOrg] = useState({ name: '', email: '', password: '', wallet_address: '' });

  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  useEffect(() => {
    if (role !== "admin") {
      window.location.href = "/login";
    } else {
      fetchOrganizations();
    }
  }, []);

  const fetchOrganizations = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/admin/organisations`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Failed to fetch organizations");
      const data = await response.json();
      setOrganizations(data);
    } catch (err) {
      console.error(err);
      alert("Error fetching organizations");
    }
  };

  const handleAddOrg = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/admin/organisations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(newOrg)
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Failed to create organization");
      }
      
      const data = await response.json();
      alert(`Organization created successfully! API Key: ${data.api_key}`);
      setShowAddForm(false);
      setNewOrg({ name: '', email: '', password: '', wallet_address: '' });
      fetchOrganizations();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleRemove = async (orgId) => {
    if (!window.confirm("Are you sure you want to delete this organization?")) return;
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/admin/organisations/${orgId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Failed to delete organization");
      fetchOrganizations();
    } catch (err) {
      alert(`Error deleting organization: ${err.message}`);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  const filteredOrgs = organizations.filter(org => 
    org.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Admin Dashboard</h1>
        <div>
          <button onClick={() => setShowAddForm(!showAddForm)} style={{ marginRight: '10px', padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
            {showAddForm ? 'Cancel' : '+ Add New Organization'}
          </button>
          <button onClick={handleLogout} style={{ padding: '10px 20px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
            Logout
          </button>
        </div>
      </div>

      {showAddForm && (
        <React.Fragment> {/* Wrapping in a Fragment to avoid nesting issues if changed later */}
        <form onSubmit={handleAddOrg} style={{ marginBottom: '20px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '5px', border: '1px solid #dee2e6' }}>
          <h3>Create New Organization</h3>
          <input type="text" placeholder="Name" required value={newOrg.name} onChange={e => setNewOrg({...newOrg, name: e.target.value})} style={{ display: 'block', width: '100%', padding: '8px', marginBottom: '10px' }} />
          <input type="email" placeholder="Email" required value={newOrg.email} onChange={e => setNewOrg({...newOrg, email: e.target.value})} style={{ display: 'block', width: '100%', padding: '8px', marginBottom: '10px' }} />
          <input type="password" placeholder="Password" required value={newOrg.password} onChange={e => setNewOrg({...newOrg, password: e.target.value})} style={{ display: 'block', width: '100%', padding: '8px', marginBottom: '10px' }} />
          <input type="text" placeholder="Wallet Address" required value={newOrg.wallet_address} onChange={e => setNewOrg({...newOrg, wallet_address: e.target.value})} style={{ display: 'block', width: '100%', padding: '8px', marginBottom: '10px' }} />
          <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Submit</button>
        </form>
        </React.Fragment>
      )}

      <input 
        type="text" 
        placeholder="Search organizations..." 
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '5px', border: '1px solid #ccc', fontSize: '16px' }}
      />

      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <thead>
          <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
            <th style={{ padding: '15px' }}>Name</th>
            <th style={{ padding: '15px' }}>Email</th>
            <th style={{ padding: '15px' }}>API Key</th>
            <th style={{ padding: '15px' }}>Wallet Address</th>
            <th style={{ padding: '15px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredOrgs.map((org) => (
            <tr key={org.id} style={{ borderBottom: '1px solid #dee2e6' }}>
              <td style={{ padding: '15px', fontWeight: 'bold' }}>{org.name}</td>
              <td style={{ padding: '15px' }}>{org.email}</td>
              <td style={{ padding: '15px', fontFamily: 'monospace', color: '#6c757d' }}>{org.api_key.substring(0, 10)}...</td>
              <td style={{ padding: '15px', fontFamily: 'monospace', color: '#6c757d' }}>{org.wallet_address}</td>
              <td style={{ padding: '15px' }}>
                <button onClick={() => handleRemove(org.id)} style={{ padding: '6px 12px', cursor: 'pointer', border: '1px solid #dc3545', backgroundColor: 'transparent', color: '#dc3545', borderRadius: '4px' }}>Remove</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {filteredOrgs.length === 0 && (
        <p style={{ textAlign: 'center', marginTop: '30px', color: '#6c757d' }}>No organizations found.</p>
      )}
    </div>
  );
};

export default AdminDashboard;