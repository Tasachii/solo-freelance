import { useEffect, useState } from 'react'

/** HashRouter เล็กๆ — GitHub Pages ไม่มี SPA fallback ถ้าใช้ path จริงจะ 404
    รูปแบบ: #/app/billing → { route: '/app', tab: 'billing' } เพื่อให้แชร์ลิงก์และกด back ได้ */
const clean = (hash) => {
  const path = (hash || '').replace(/^#/, '')
  return path === '' || path === '/' ? '/' : path.replace(/\/+$/, '') || '/'
}

export function navigate(to) {
  window.location.hash = to
}

export function useLocation() {
  const [path, setPath] = useState(() => clean(window.location.hash))
  useEffect(() => {
    const onChange = () => setPath(clean(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  const parts = path.split('/').filter(Boolean)
  return { path, route: parts[0] ? `/${parts[0]}` : '/', tab: parts[1] || null }
}
