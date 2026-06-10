import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Dev server port is configurable so it can match the backend's CORS allow-list.
export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.PORT) || 5173,
    host: true,
  },
});
