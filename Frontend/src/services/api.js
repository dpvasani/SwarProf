import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle token expiration
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      
      // Only redirect if not already on auth pages
      if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
        // Clear stored auth data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete api.defaults.headers.common['Authorization'];
        
        // Redirect to login
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/profile'),
};

export const artistAPI = {
  extract: (formData) => api.post('/api/extract', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  getArtists: (params) => api.get('/api/artists', { params }),
  getArtist: (id) => api.get(`/api/artists/${id}`),
  getResults: (params) => api.get('/api/results', { params }),
  getResult: (id) => api.get(`/api/results/${id}`),
};

export const systemAPI = {
  health: () => api.get('/health'),
  getInfo: () => api.get('/'),
};