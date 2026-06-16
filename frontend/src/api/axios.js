import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:8000' });

let _token = null;
export const setToken = (t) => { _token = t; };
export const clearToken = () => { _token = null; };

api.interceptors.request.use(config => {
  const token = window.__authToken || _token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      clearToken();
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }
    return Promise.reject(err);
  }
);

export default api;
