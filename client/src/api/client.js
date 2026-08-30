import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  // withCredentials: true, // Typically needed for httpOnly cookies like refresh token
});

// Request interceptor to attach access token
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401s and refresh tokens
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // const originalRequest = error.config;
    // TODO: Implement refresh token logic here in Step 2.
    // e.g., if error.response.status === 401 && !originalRequest._retry
    
    return Promise.reject(error);
  }
);

export default apiClient;
