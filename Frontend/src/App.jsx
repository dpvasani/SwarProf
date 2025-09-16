import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import FloatingOrbs from './components/FloatingOrbs';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ExtractArtist from './pages/ExtractArtist';
import Artists from './pages/Artists';
import ArtistDetail from './pages/ArtistDetail';
import Profile from './pages/Profile';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen relative overflow-hidden">
          {/* Floating Background Orbs */}
          <FloatingOrbs />
          
          {/* Navigation */}
          <Navbar />
          
          {/* Main Content */}
          <main className="relative z-10 pt-20">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Protected Routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/extract" element={
                <ProtectedRoute>
                  <ExtractArtist />
                </ProtectedRoute>
              } />
              <Route path="/artists" element={
                <ProtectedRoute>
                  <Artists />
                </ProtectedRoute>
              } />
              <Route path="/artists/:id" element={
                <ProtectedRoute>
                  <ArtistDetail />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />
              
              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
