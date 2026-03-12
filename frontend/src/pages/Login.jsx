import React, { useState } from 'react';

const Login = () => {
  // State to store the user's inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('organization'); // Defaults to organization

  // Function to handle the form submission
  const handleLogin = (e) => {
    e.preventDefault(); // Prevents the page from refreshing
    
    // Later, your backend developer will connect this to Node.js/Database
    console.log("Attempting to log in with:", { email, password, role });
    alert(`Login request sent for ${role}! Check console for details.`);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f4f7f6', fontFamily: 'sans-serif' }}>
      
      {/* The Login Card */}
      <div style={{ backgroundColor: '#fff', padding: '40px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#333' }}>TrueDocs Login</h2>
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column' }}>
          
          {/* Role Selection Toggle */}
          <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-around', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
            <label style={{ cursor: 'pointer', fontWeight: role === 'organization' ? 'bold' : 'normal' }}>
              <input 
                type="radio" 
                value="organization" 
                checked={role === 'organization'} 
                onChange={() => setRole('organization')} 
                style={{ marginRight: '5px' }}
              /> Organization
            </label>
            <label style={{ cursor: 'pointer', fontWeight: role === 'admin' ? 'bold' : 'normal' }}>
              <input 
                type="radio" 
                value="admin" 
                checked={role === 'admin'} 
                onChange={() => setRole('admin')} 
                style={{ marginRight: '5px' }}
              /> Admin
            </label>
          </div>

          {/* Email Input */}
          <label style={{ marginBottom: '5px', fontWeight: 'bold', fontSize: '14px', color: '#555' }}>Email</label>
          <input 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email" 
            required
            style={{ padding: '12px', marginBottom: '15px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px' }}
          />

          {/* Password Input */}
          <label style={{ marginBottom: '5px', fontWeight: 'bold', fontSize: '14px', color: '#555' }}>Password</label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password" 
            required
            style={{ padding: '12px', marginBottom: '25px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px' }}
          />

          {/* Submit Button */}
          <button 
            type="submit" 
            style={{ padding: '14px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold', transition: 'background-color 0.2s' }}
          >
            Sign In
          </button>

        </form>
      </div>
    </div>
  );
};

export default Login;