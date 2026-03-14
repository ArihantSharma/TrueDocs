import React, { useState, useEffect } from 'react';

const Login = () => {
  useEffect(() => {
    const token = localStorage.getItem("token");
    const existingRole = localStorage.getItem("role");
    
    if (token && existingRole === "admin") {
        window.location.href = "/admin";
    } else if (token && existingRole === "organisation") {
        window.location.href = "/organization";
    }
  }, []);
  
  // State to store the user's inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('organisation'); // Defaults to organisation

  // Function to handle the form submission
  const handleLogin = async (e) => {
    e.preventDefault(); // Prevents the page from refreshing
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, role }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Login failed");
      }

      const data = await response.json();
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("role", data.role);
      
      if (data.role === "admin") {
        window.location.href = "/admin";
      } else {
        window.location.href = "/organization";
      }
    } catch (err) {
      alert(`Login failed: ${err.message}`);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f4f7f6', fontFamily: 'sans-serif' }}>
      
      {/* The Login Card */}
      <div style={{ backgroundColor: '#fff', padding: '40px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#333' }}>TrueDocs Login</h2>
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column' }}>
          
          {/* Role Selection Toggle */}
          <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-around', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
            <label style={{ cursor: 'pointer', fontWeight: role === 'organisation' ? 'bold' : 'normal' }}>
              <input 
                type="radio" 
                value="organisation" 
                checked={role === 'organisation'} 
                onChange={() => setRole('organisation')} 
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