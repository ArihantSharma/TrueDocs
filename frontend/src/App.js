

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Notice there are NO curly braces around the names
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import OrgDashboard from './pages/OrgDashboard';

// ... rest of your App.js code

function App() {
  return (
    <Router>
      <div className="App">
        {/* Navigation Bar can go here later so it shows on all pages */}
        
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />

          {/* Protected Routes (We will add security to these later) */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/organization" element={<OrgDashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;