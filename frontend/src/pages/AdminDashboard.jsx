import React, { useState } from 'react';

const AdminDashboard = () => {
  // Dummy data simulating what your Node.js backend will eventually send
  const [organizations, setOrganizations] = useState([
    { id: 1, name: 'Delhi University', publicKey: '0x123...abc', status: 'Active' },
    { id: 2, name: 'CBSE Board', publicKey: '0x456...def', status: 'Active' },
    { id: 3, name: 'TechCorp Inc.', publicKey: '0x789...ghi', status: 'Suspended' },
  ]);

  // State to hold whatever the user types into the search bar
  const [searchTerm, setSearchTerm] = useState('');

  // Filter the table instantly as the admin types
  const filteredOrgs = organizations.filter(org => 
    org.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Header & Add Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Admin Dashboard</h1>
        <button style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
          + Add New Organization
        </button>
      </div>

      {/* Search Bar */}
      <input 
        type="text" 
        placeholder="Search organizations..." 
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '5px', border: '1px solid #ccc', fontSize: '16px' }}
      />

      {/* The Organization Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <thead>
          <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
            <th style={{ padding: '15px' }}>ID</th>
            <th style={{ padding: '15px' }}>Organization Name</th>
            <th style={{ padding: '15px' }}>Public Key (Identity)</th>
            <th style={{ padding: '15px' }}>Status</th>
            <th style={{ padding: '15px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredOrgs.map((org) => (
            <tr key={org.id} style={{ borderBottom: '1px solid #dee2e6' }}>
              <td style={{ padding: '15px' }}>{org.id}</td>
              <td style={{ padding: '15px', fontWeight: 'bold' }}>{org.name}</td>
              <td style={{ padding: '15px', fontFamily: 'monospace', color: '#6c757d' }}>{org.publicKey}</td>
              <td style={{ padding: '15px' }}>
                <span style={{ 
                  backgroundColor: org.status === 'Active' ? '#e9fce9' : '#fce9e9',
                  color: org.status === 'Active' ? '#28a745' : '#dc3545',
                  padding: '5px 10px', borderRadius: '15px', fontSize: '14px', fontWeight: 'bold'
                }}>
                  {org.status}
                </span>
              </td>
              <td style={{ padding: '15px' }}>
                <button style={{ marginRight: '10px', padding: '6px 12px', cursor: 'pointer', border: '1px solid #007bff', backgroundColor: 'transparent', color: '#007bff', borderRadius: '4px' }}>Edit</button>
                <button style={{ padding: '6px 12px', cursor: 'pointer', border: '1px solid #dc3545', backgroundColor: 'transparent', color: '#dc3545', borderRadius: '4px' }}>Remove</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Fallback if search has no results */}
      {filteredOrgs.length === 0 && (
        <p style={{ textAlign: 'center', marginTop: '30px', color: '#6c757d' }}>No organizations match your search.</p>
      )}
    </div>
  );
};

export default AdminDashboard;