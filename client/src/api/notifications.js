import apiClient from './client';

export const getNotifications = async () => {
  const response = await apiClient.get('/notifications');
  return response.data;
};

export const markAsRead = async (id) => {
  const response = await apiClient.patch(`/notifications/${id}/read`);
  return response.data;
};

export const markAllAsRead = async () => {
  const response = await apiClient.patch('/notifications/mark-all-read');
  return response.data;
};
