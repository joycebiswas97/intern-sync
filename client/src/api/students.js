import apiClient from './client';

/** GET /api/students/me/profile */
export const getMyProfile = async () => {
  const { data } = await apiClient.get('/students/me/profile');
  return data;
};

/** PUT /api/students/me/profile */
export const updateMyProfile = async (profileData) => {
  const { data } = await apiClient.put('/students/me/profile', profileData);
  return data;
};

/** POST /api/students/me/resume */
export const uploadResume = async (file) => {
  const formData = new FormData();
  formData.append('resume', file);
  
  const { data } = await apiClient.post('/students/me/resume', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
};

/** GET /api/students/:id/profile */
export const getPublicProfile = async (id) => {
  const { data } = await apiClient.get(`/students/${id}/profile`);
  return data;
};
