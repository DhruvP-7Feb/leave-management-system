import api from './axios';

// Auth endpoints
export const login = async (email, password) => {
  const response = await api.post('/api/accounts/login/', { email, password });
  return response.data;
};

export const googleLogin = async (credential) => {
  const response = await api.post('/api/accounts/google/', { credential });
  return response.data;
};

export const logout = async (refreshToken) => {
  const response = await api.post('/api/accounts/logout/', { refresh: refreshToken });
  return response.data;
};

export const refreshAccessToken = async (refreshToken) => {
  const response = await api.post('/api/accounts/token/refresh/', { refresh: refreshToken });
  return response.data;
};

export const getProfile = async () => {
  const response = await api.get('/api/accounts/profile/');
  return response.data;
};

// Employee CRUD endpoints
export const getEmployees = async () => {
  const response = await api.get('/api/accounts/employees/');
  return response.data;
};

export const getPublicEmployees = async () => {
  const response = await api.get('/api/accounts/employees/public/');
  return response.data;
};

export const createEmployee = async (data) => {
  const response = await api.post('/api/accounts/employees/create/', data);
  return response.data;
};

export const deactivateEmployee = async (userId) => {
  const response = await api.patch(`/api/accounts/employees/${userId}/deactivate/`);
  return response.data;
};

export const reactivateEmployee = async (userId) => {
  const response = await api.patch(`/api/accounts/employees/${userId}/reactivate/`);
  return response.data;
};

// Department endpoints
export const getDepartments = async () => {
  const response = await api.get('/api/departments/');
  return response.data;
};

export const createDepartment = async (data) => {
  const response = await api.post('/api/departments/', data);
  return response.data;
};

export const assignManager = async (departmentId, managerId) => {
  const response = await api.patch(`/api/departments/${departmentId}/assign-manager/`, {
    manager: managerId ? parseInt(managerId) : null
  });
  return response.data;
};
