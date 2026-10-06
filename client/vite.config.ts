import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl = env.VITE_BACKEND_URL || 'https://localhost:7184'
  const notebookUrl = env.VITE_OPEN_NOTEBOOK_API_URL || 'http://localhost:5055'

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    server: {
      port: 5174,
      allowedHosts: true,
      proxy: {
        // Proxy Backend .NET API (Local Dev)
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
        // Proxy Static Files (Audio/Video - Local Dev)
        '/Audios': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
        '/Videos': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
        // Proxy Open Notebook AI Container
        // Dev: localhost:5055, Prod: Azure Container App
        '/notebook-api': {
          target: notebookUrl,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/notebook-api/, '/api'),
        },
      },
    },
  }
})
