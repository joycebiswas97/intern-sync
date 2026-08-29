import apiClient from './client';

// -- Queues --

export const getPendingEmployers = async () => {
  const response = await apiClient.get('/admin/employers/pending');
  return response.data;
};

export const verifyEmployer = async ({ id, status, rejectionReason }) => {
  const response = await apiClient.put(`/admin/employers/${id}/verify`, { status, rejectionReason });
  return response.data;
};

export const getPendingListings = async () => {
  const response = await apiClient.get('/admin/listings/pending');
  return response.data;
};

export const reviewListing = async ({ id, status, rejectionReason }) => {
  const response = await apiClient.put(`/admin/listings/${id}/review`, { status, rejectionReason });
  return response.data;
};

export const getReports = async () => {
  const response = await apiClient.get('/admin/reports');
  return response.data;
};

export const resolveReport = async ({ id, resolution }) => {
  const response = await apiClient.put(`/admin/reports/${id}/resolve`, { resolution });
  return response.data;
};

// -- User Management --

export const getUsers = async (params) => {
  const response = await apiClient.get('/admin/users', { params });
  return response.data;
};

export const banUser = async ({ id, isBanned, reason }) => {
  const response = await apiClient.put(`/admin/users/${id}/ban`, { isBanned, reason });
  return response.data;
};

// -- Analytics --

export const getAnalyticsSummary = async () => {
  const response = await apiClient.get('/admin/analytics/summary');
  return response.data;
};

export const getSignups = async (params) => {
  const response = await apiClient.get('/admin/analytics/signups', { params });
  return response.data;
};

export const getApplicationsByStatus = async () => {
  const response = await apiClient.get('/admin/analytics/applications');
  return response.data;
};

export const getTopListings = async () => {
  const response = await apiClient.get('/admin/analytics/top-listings');
  return response.data;
};
