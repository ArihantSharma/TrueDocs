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
    <div className="min-h-screen flex items-center justify-center p-4">
      
      {/* The Login Card */}
      <div className="glass-panel w-full max-w-md p-10 rounded-3xl relative overflow-hidden group animate-in zoom-in-95 duration-500">
        
        {/* Subtle glow behind the card content */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold text-white mb-2 tracking-tight">Welcome Back</h2>
            <p className="text-slate-400">Sign in to the TrueDocs platform</p>
          </div>
          
          <form onSubmit={handleLogin} className="flex flex-col space-y-6">
            
            {/* Role Selection Toggle */}
            <div className="flex bg-black/40 p-1 rounded-xl mb-2 backdrop-blur-sm border border-white/5">
              <label className={`flex-1 text-center py-2.5 rounded-lg cursor-pointer transition-all duration-300 text-sm font-semibold tracking-wide ${role === 'organisation' ? 'bg-gradient-to-r from-blue-600 to-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                <input 
                  type="radio" 
                  value="organisation" 
                  checked={role === 'organisation'} 
                  onChange={() => setRole('organisation')} 
                  className="hidden"
                /> Organization
              </label>
              <label className={`flex-1 text-center py-2.5 rounded-lg cursor-pointer transition-all duration-300 text-sm font-semibold tracking-wide ${role === 'admin' ? 'bg-gradient-to-r from-blue-600 to-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                <input 
                  type="radio" 
                  value="admin" 
                  checked={role === 'admin'} 
                  onChange={() => setRole('admin')} 
                  className="hidden"
                /> Admin
              </label>
            </div>

            <div className="space-y-4">
              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300 ml-1">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email" 
                    required
                    className="w-full bg-black/30 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300 ml-1">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password" 
                    required
                    className="w-full bg-black/30 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              className="w-full mt-4 bg-gradient-to-r from-blue-600 to-emerald-600 text-white font-bold py-4 rounded-xl hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:scale-[1.02] transition-all duration-300 tracking-wide text-lg"
            >
              Sign In
            </button>

          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;