import api from './axios';

export const getMyBalances = async () => {
  const response = await api.get('/api/leaves/balances/');
  return response.data;
};

export const getAllBalances = async () => {
  const response = await api.get('/api/reports/balances/');
  return response.data;
};
