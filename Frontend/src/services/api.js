import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 30000, // 30 seconds timeout for file uploads
  headers: {
    'Content-Type': 'application/json',
  },
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

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  getProfile: () => api.get('/auth/profile'),
};

// Artist API
export const artistAPI = {
  // Extract artist information from uploaded file
  extractArtist: (formData) => {
    return api.post('/api/extract', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // 60 seconds for file processing
    });
  },

  // Get all artists with pagination and search
  getArtists: (params = {}) => {
    const { page = 1, limit = 10, search = '' } = params;
    return api.get('/api/artists', {
      params: { page, limit, search },
    });
  },

  // Get specific artist by ID
  getArtist: (id) => api.get(`/api/artists/${id}`),

  // Enhance artist with comprehensive AI enhancement
  enhanceArtistComprehensive: (id) => {
    return api.post(`/api/artists/${id}/enhance`, {}, {
      timeout: 60000, // 60 seconds for AI processing
    });
  },

  // Get extraction results
  getResults: (params = {}) => {
    const { page = 1, limit = 10 } = params;
    return api.get('/api/results', {
      params: { page, limit },
    });
  },

  // Get specific result by ID
  getResult: (id) => api.get(`/api/results/${id}`),
};

export { api };
export default api;