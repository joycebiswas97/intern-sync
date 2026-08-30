import apiClient from './client';

/** POST /api/listings */
export const createListing = async (data) => {
  const response = await apiClient.post('/listings', data);
  return response.data;
};

/** GET /api/listings/mine */
export const getMyListings = async () => {
  const response = await apiClient.get('/listings/mine');
  return response.data;
};

/** GET /api/listings/:id */
export const getListing = async (id) => {
  const response = await apiClient.get(`/listings/${id}`);
  return response.data;
};

/** PUT /api/listings/:id */
export const updateListing = async ({ id, data }) => {
  const response = await apiClient.put(`/listings/${id}`, data);
  return response.data;
};

/** DELETE /api/listings/:id */
export const deleteListing = async (id) => {
  const response = await apiClient.delete(`/listings/${id}`);
  return response.data;
};

/** POST /api/listings/:id/close */
export const closeListing = async (id) => {
  const response = await apiClient.post(`/listings/${id}/close`);
  return response.data;
};

// --- Browsing & Saving ---

/** GET /api/listings (with query params for search/filter) */
export const searchListings = async (params) => {
  const response = await apiClient.get('/listings', { params });
  return response.data;
};

/** POST /api/listings/:id/save */
export const saveListing = async (id) => {
  const response = await apiClient.post(`/listings/${id}/save`);
  return response.data;
};

/** DELETE /api/listings/:id/save */
export const unsaveListing = async (id) => {
  const response = await apiClient.delete(`/listings/${id}/save`);
  return response.data;
};

/** GET /api/listings/saved */
export const getSavedListings = async () => {
  const response = await apiClient.get('/listings/saved');
  return response.data;
};
