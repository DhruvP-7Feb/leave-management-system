import api from './axios';

export const applyLeave = async (data) => {
  const response = await api.post('/api/leaves/apply/', data);
  return response.data;
};

export const cancelLeave = async (id) => {
  const response = await api.post(`/api/leaves/${id}/cancel/`);
  return response.data;
};

export const getMyLeaves = async () => {
  const response = await api.get('/api/leaves/my-leaves/');
  return response.data;
};

export const getPendingRequests = async () => {
  const response = await api.get('/api/leaves/pending-requests/');
  return response.data;
};

export const approveLeave = async (id) => {
  const response = await api.post(`/api/leaves/${id}/approve/`);
  return response.data;
};

export const rejectLeave = async (id, reason) => {
  const response = await api.post(`/api/leaves/${id}/reject/`, { rejection_reason: reason });
  return response.data;
};

export const getLeaveTypes = async () => {
  const response = await api.get('/api/leaves/leave-types/');
  return response.data;
};

export const createLeaveType = async (data) => {
  const response = await api.post('/api/leaves/leave-types/', data);
  return response.data;
};

export const getHolidays = async () => {
  const response = await api.get('/api/leaves/holidays/');
  return response.data;
};

export const addHoliday = async (data) => {
  const response = await api.post('/api/leaves/holidays/', data);
  return response.data;
};

export const deleteHoliday = async (id) => {
  const response = await api.delete(`/api/leaves/holidays/${id}/delete/`);
  return response.data;
};

export const getDelegations = async () => {
  const response = await api.get('/api/leaves/delegate/');
  return response.data;
};

export const createDelegation = async (data) => {
  const response = await api.post('/api/leaves/delegate/', data);
  return response.data;
};

export const deleteDelegation = async (id) => {
  const response = await api.delete(`/api/leaves/delegate/${id}/delete/`);
  return response.data;
};
