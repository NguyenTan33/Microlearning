import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5174,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'https://localhost:7184',
        changeOrigin: true,
        secure: false,
      },
      '/Audios': {
        target: 'https://localhost:7184',
        changeOrigin: true,
        secure: false,
      },
      '/Videos': {
        target: 'https://localhost:7184',
        changeOrigin: true,
        secure: false,
      },
      '/notebook-api': {
        target: 'http://localhost:5055',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/notebook-api/, '/api'),
      },
    },
  },
})
