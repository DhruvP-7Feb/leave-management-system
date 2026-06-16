import api from './axios';

export const getHRDashboardSummary = async () => {
  const response = await api.get('/api/reports/dashboard/');
  return response.data;
};

export const getHRLeaveReport = async (params = {}) => {
  const response = await api.get('/api/reports/leaves/', { params });
  return response.data;
};

export const exportLeaveReportCSV = async (params = {}) => {
  const response = await api.get('/api/reports/leaves/export-csv/', {
    params,
    responseType: 'blob',
  });
  return response;
};
