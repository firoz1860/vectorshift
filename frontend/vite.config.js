import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In local dev the React app runs on :5173 and the FastAPI backend on :8000.
// Proxy the API paths to the backend so same-origin requests ("/boards") work
// in dev exactly as they do in the Docker/Render deploy where the backend
// serves the built frontend. Override the target with VITE_DEV_API_TARGET.
const API_TARGET = process.env.VITE_DEV_API_TARGET || 'http://localhost:8000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/boards': API_TARGET,
      '/health': API_TARGET,
      '/pipelines': API_TARGET,
    },
  },
  build: { outDir: 'dist' },
});
