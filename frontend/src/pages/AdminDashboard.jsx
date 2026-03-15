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
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h2 className="text-4xl font-bold text-white tracking-tight mb-2">Admin <span className="gradient-text">Dashboard</span></h2>
            <p className="text-slate-400 text-lg">Manage registered organizations and API Access.</p>
          </div>
          <div className="flex gap-4">
            <button 
                onClick={() => setShowAddForm(!showAddForm)} 
                className={`
                    px-6 py-2.5 rounded-xl font-medium transition-all duration-300 border flex items-center shadow-lg
                    ${showAddForm 
                        ? 'bg-slate-800 text-slate-300 border-white/10 hover:bg-slate-700' 
                        : 'bg-gradient-to-r from-blue-600 to-emerald-600 text-white hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] border-none'}
                `}
            >
                {showAddForm ? 'Cancel Creation' : '+ Add Organization'}
            </button>
            <button 
              onClick={handleLogout} 
              className="px-6 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-medium transition-all duration-300 rounded-xl border border-rose-500/20 hover:border-rose-500/50"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Add Organization Form (Animated) */}
        {showAddForm && (
            <div className="glass-panel p-8 rounded-3xl mb-8 animate-in slide-in-from-top-4 fade-in duration-300 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-32 -mt-32"></div>
                <h3 className="text-2xl font-bold text-white mb-6 relative z-10">Register New Organization</h3>
                
                <form onSubmit={handleAddOrg} className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-300 ml-1">Organization Name</label>
                        <input 
                            type="text" 
                            placeholder="e.g. MITS Gwalior" 
                            required 
                            value={newOrg.name} 
                            onChange={e => setNewOrg({...newOrg, name: e.target.value})} 
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                        />
                    </div>
                    
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-300 ml-1">Admin Email</label>
                        <input 
                            type="email" 
                            placeholder="admin@org.edu.in" 
                            required 
                            value={newOrg.email} 
                            onChange={e => setNewOrg({...newOrg, email: e.target.value})} 
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-300 ml-1">Initial Password</label>
                        <input 
                            type="password" 
                            placeholder="Set a secure password" 
                            required 
                            value={newOrg.password} 
                            onChange={e => setNewOrg({...newOrg, password: e.target.value})} 
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-300 ml-1">Authorized Wallet Address</label>
                        <input 
                            type="text" 
                            placeholder="0x..." 
                            required 
                            value={newOrg.wallet_address} 
                            onChange={e => setNewOrg({...newOrg, wallet_address: e.target.value})} 
                            className="w-full font-mono text-sm bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                        />
                    </div>

                    <div className="md:col-span-2 mt-2">
                        <button 
                            type="submit" 
                            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-emerald-600 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:scale-[1.01] transition-all duration-300"
                        >
                            Create & Generate API Key
                        </button>
                    </div>
                </form>
            </div>
        )}

        {/* Search Bar */}
        <div className="relative mb-6 group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
            <input 
                type="text" 
                placeholder="Search organizations by name..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-glass border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-xl backdrop-blur-md"
            />
        </div>

        {/* Data Container */}
        <div className="glass-panel rounded-3xl overflow-hidden relative min-h-[400px]">
           {filteredOrgs.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
              </div>
              <p className="text-slate-300 text-xl font-medium mb-2">No Organizations Found</p>
              <p className="text-slate-500">Try adjusting your search criteria or register a new one.</p>
            </div>
           ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead>
                  <tr className="bg-black/40 text-slate-400 text-xs uppercase tracking-widest border-b border-white/10">
                    <th className="px-8 py-5 font-semibold">Name</th>
                    <th className="px-6 py-5 font-semibold">Email Account</th>
                    <th className="px-6 py-5 font-semibold">API Key Prefix</th>
                    <th className="px-6 py-5 font-semibold">Wallet Address</th>
                    <th className="px-8 py-5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredOrgs.map((org) => (
                    <tr key={org.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-8 py-5">
                        <span className="text-white font-medium text-lg flex items-center">
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs mr-3 border border-blue-500/30">
                                {org.name.charAt(0).toUpperCase()}
                            </div>
                            {org.name}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-slate-300">
                        {org.email}
                      </td>
                      <td className="px-6 py-5 font-mono text-xs">
                        <span className="bg-white/10 text-slate-300 px-2 py-1 flex items-center max-w-max rounded border border-white/5">
                            <svg className="w-3 h-3 mr-1 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
                            {org.api_key.substring(0, 10)}...
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-slate-400 font-mono text-sm bg-black/40 px-3 py-1.5 rounded-lg border border-white/5 inline-block">
                            {org.wallet_address.substring(0, 8)}...{org.wallet_address.substring(38)}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right space-x-3">
                         <button 
                             onClick={() => handleRemove(org.id)}
                             className="px-4 py-2 rounded-lg font-medium text-sm transition-all bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white border border-rose-500/20 hover:border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.05)] hover:shadow-[0_0_20px_rgba(244,63,94,0.3)]"
                          >
                             Remove Access
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
    </div>
  );
};

export default AdminDashboard;