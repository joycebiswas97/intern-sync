import apiClient from './client';

export const register = async (data) => {
  const response = await apiClient.post('/auth/register', data);
  return response.data;
};

export const verifyEmail = async (token) => {
  const response = await apiClient.post('/auth/verify-email', { token });
  return response.data;
};

export const login = async (email, password) => {
  const response = await apiClient.post('/auth/login', { email, password });
  return response.data;
};

export const refreshToken = async () => {
  const response = await apiClient.post('/auth/refresh');
  return response.data;
};

export const logout = async () => {
  const response = await apiClient.post('/auth/logout');
  return response.data;
};

export const forgotPassword = async (email) => {
  const response = await apiClient.post('/auth/forgot-password', { email });
  return response.data;
};

export const resetPassword = async (token, newPassword) => {
  const response = await apiClient.post('/auth/reset-password', { token, newPassword });
  return response.data;
};

export const getMe = async () => {
  const response = await apiClient.get('/auth/me');
  return response.data;
};
