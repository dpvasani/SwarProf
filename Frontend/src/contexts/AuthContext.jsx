import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          const response = await api.get('/auth/profile');
          // Backend wraps payload under data: { ... }
          const profile = response.data?.data || response.data || null;
          setUser(profile);
          setToken(storedToken);
        } catch (error) {
          console.error('Auth initialization failed:', error);
          localStorage.removeItem('token');
          delete api.defaults.headers.common['Authorization'];
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
  // Backend accepts username_or_email and password
  const response = await api.post('/auth/login', { username_or_email: email, password });
  // The backend returns { success, message, data: { access_token, token_type, user } }
  const respData = response.data?.data || response.data;
  const access_token = respData?.access_token;
  const userData = respData?.user || null;

      if (access_token) {
        localStorage.setItem('token', access_token);
        api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
        setToken(access_token);
        // If backend didn't include user in login response, fetch profile
        if (!userData) {
          try {
            const profileResp = await api.get('/auth/profile');
            const profile = profileResp.data?.data || profileResp.data || null;
            if (profile) setUser(profile);
          } catch (err) {
            console.error('Failed to fetch profile after login:', err);
          }
        } else {
          setUser(userData);
        }
      }
      
  return { success: true, access_token: access_token, user: userData };
    } catch (error) {
      console.error('Login failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Login failed' 
      };
    }
  };

  const register = async (userData) => {
    try {
      // Backend expects: username, email, full_name, password (role optional)
      const payload = {
        username: userData.username || (userData.email ? userData.email.split('@')[0] : ''),
        email: userData.email,
        full_name: userData.full_name,
        password: userData.password,
        role: userData.role || 'user',
      };
      const response = await api.post('/auth/register', payload);
      const respData = response.data?.data || response.data;
      return { success: true, data: respData };
    } catch (error) {
      console.error('Registration failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Registration failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (profileData) => {
    try {
  const response = await api.put('/auth/profile', profileData);
      const respData = response.data?.data || response.data;
      setUser(respData);
      return { success: true, data: respData };
    } catch (error) {
      console.error('Profile update failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Profile update failed' 
      };
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    updateProfile,
    isAuthenticated: !!token && !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};