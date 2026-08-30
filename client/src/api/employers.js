import apiClient from './client';

// GET /api/employers/me/profile
export const getMyProfile = async () => {
  const { data } = await apiClient.get('/employers/me/profile');
  return data;
};

// PUT /api/employers/me/profile
export const updateMyProfile = async (profileData) => {
  const { data } = await apiClient.put('/employers/me/profile', profileData);
  return data;
};

// POST /api/employers/me/logo
export const uploadLogo = async (file) => {
  const formData = new FormData();
  formData.append('logo', file);
  
  const { data } = await apiClient.post('/employers/me/logo', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
};

// GET /api/employers/me/verification-status
export const getVerificationStatus = async () => {
  const { data } = await apiClient.get('/employers/me/verification-status');
  return data;
};
