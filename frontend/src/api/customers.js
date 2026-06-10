import { api } from './client.js';

export const customersApi = {
  list: () => api.get('/customers'),
  get: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  remove: (id) => api.del(`/customers/${id}`),
};
