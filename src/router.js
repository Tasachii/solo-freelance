import { useEffect, useState } from 'react'

// HashRouter แบบเล็กที่สุด — GitHub Pages ไม่มี SPA fallback ถ้าใช้ path จริงจะ 404
const clean = (hash) => {
  const path = (hash || '').replace(/^#/, '')
  return path === '' || path === '/' ? '/' : path
}

export function navigate(to) {
  window.location.hash = to
}

export function useRoute() {
  const [route, setRoute] = useState(() => clean(window.location.hash))
  useEffect(() => {
    const onChange = () => {
      setRoute(clean(window.location.hash))
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}
