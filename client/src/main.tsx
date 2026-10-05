import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { setupApiInterceptor } from './utils/apiInterceptor.ts'

// Kích hoạt định tuyến tự động sang Azure Backend khi chạy trên Production
setupApiInterceptor();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
