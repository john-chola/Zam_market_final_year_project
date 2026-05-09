import axios from 'axios';

const api = axios.create({
  // Use relative URL — Vite proxy forwards /api/* to http://localhost:5000
  // This avoids the service worker intercepting cross-origin requests
  baseURL: '/api',
  timeout: 10000,
});

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('zammarket_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally — clear storage and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('zammarket_token');
      localStorage.removeItem('zammarket_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;