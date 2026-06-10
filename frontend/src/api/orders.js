import { api } from './client.js';

export const ordersApi = {
  list: () => api.get('/orders'),
  get: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  remove: (id) => api.del(`/orders/${id}`),
};
