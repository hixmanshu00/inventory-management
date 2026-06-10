import { api } from './client.js';

export const statsApi = {
  get: () => api.get('/stats'),
};
