import axios from 'axios';

// Create axios instance with base URL
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 10000,
});

// Request interceptor to add auth token
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

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token on unauthorized response
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
      // Redirect to login if not already there
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const authAPI = {
  // Backend routes are mounted under /auth
  login: (email, password) => api.post('/auth/login', { username_or_email: email, password }),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
};

export const artistAPI = {
  // Backend artist routes are mounted under the /api prefix
  // POST /api/extract expects a file upload
  extractArtist: (formData) => {
    // Let axios/browser set the multipart Content-Type (including boundary).
    return api.post('/api/extract', formData);
  },
  // Note: don't set Content-Type manually for FormData posts; the browser/axios will set the boundary
  getArtists: (params = {}) => {
    console.log('Fetching artists with params:', params);
    return api.get('/api/artists', { params });
  },
  getArtist: (id) => {
    console.log('Fetching artist with ID:', id);
    if (!id || id === 'undefined') {
      return Promise.reject(new Error('Invalid artist ID'));
    }
    return api.get(`/api/artists/${id}`);
  },
  updateArtist: (id, data) => api.put(`/api/artists/${id}`, data),
  deleteArtist: (id) => api.delete(`/api/artists/${id}`),
  enhanceArtistComprehensive: (id) => api.post(`/api/artists/${id}/enhance-comprehensive`),
};

export const uploadAPI = {
  uploadFile: (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    
    return api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    });
  },
};

export default api;