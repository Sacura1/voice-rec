import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const port = process.env.PORT ? parseInt(process.env.PORT) : 10000;

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port
  },
  preview: {
    host: '0.0.0.0',
    port,
    allowedHosts: true,
  }
});