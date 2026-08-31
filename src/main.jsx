import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './fonts.css'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// ลงทะเบียน service worker เฉพาะตอน build จริง เพื่อให้ติดตั้งเป็นแอปได้
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .catch(() => {
        /* ติดตั้งไม่ได้ก็ไม่เป็นไร แอปยังใช้งานได้ปกติ */
      })
  })
}
