

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Notice there are NO curly braces around the names
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import OrgDashboard from './pages/OrgDashboard';
import OrgPosts from './pages/OrgPosts';

// ... rest of your App.js code

const PrivateRoute = ({ children, allowedRole }) => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token) {
    return <Navigate to="/login" />;
  }
  
  if (allowedRole && role !== allowedRole) {
    // If they are logged in but wrong role, push them to their correct dash
    return <Navigate to={role === 'admin' ? '/admin' : '/organization'} />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <div className="App min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden font-sans">
        {/* Ambient Background Glows */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-600/20 blur-[120px] pointer-events-none" />
        
        {/* Main Content Area */}
        <div className="relative z-10 min-h-screen">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />

            {/* Protected Routes */}
            <Route 
              path="/admin" 
              element={
                <PrivateRoute allowedRole="admin">
                  <AdminDashboard />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/organization" 
              element={
                <PrivateRoute allowedRole="organisation">
                  <OrgDashboard />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/organization/posts" 
              element={
                <PrivateRoute allowedRole="organisation">
                  <OrgPosts />
                </PrivateRoute>
              } 
            />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;