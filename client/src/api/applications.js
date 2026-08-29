import apiClient from './client';

/**
 * POST /api/applications
 * @param {Object} data
 * @param {string} data.listingId
 * @param {string} data.coverLetter
 */
export const apply = async ({ listingId, coverLetter }) => {
  const response = await apiClient.post('/applications', { listingId, coverLetter });
  return response.data;
};

/**
 * GET /api/applications/mine
 */
export const getMyApplications = async () => {
  const response = await apiClient.get('/applications/mine');
  return response.data;
};

/**
 * POST /api/applications/:id/withdraw
 * @param {string} id 
 */
export const withdrawApplication = async (id) => {
  const response = await apiClient.post(`/applications/${id}/withdraw`);
  return response.data;
};

/**
 * GET /api/listings/:listingId/applications
 * @param {Object} params
 * @param {string} params.listingId
 * @param {string} [params.status]
 */
export const getListingApplications = async ({ listingId, status }) => {
  const params = {};
  if (status) params.status = status;
  
  const response = await apiClient.get(`/listings/${listingId}/applications`, { params });
  return response.data;
};

/**
 * PUT /api/applications/:id/status
 * @param {Object} data
 * @param {string} data.id
 * @param {string} data.status
 */
export const updateApplicationStatus = async ({ id, status }) => {
  const response = await apiClient.put(`/applications/${id}/status`, { status });
  return response.data;
};

/**
 * GET /api/applications/:id
 * @param {string} id 
 */
export const getApplication = async (id) => {
  const response = await apiClient.get(`/applications/${id}`);
  return response.data;
};
