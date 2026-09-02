/**
 * ใต้ HashRouter ลิงก์ที่คนแชร์กันคือ …/#/app/today?dev=1
 * ซึ่ง query อยู่ "ใน" hash — location.search จะว่างเปล่า
 * จึงต้องอ่านทั้งสองที่
 */
export function urlParam(name: string): string | null {
  if (typeof location === 'undefined') return null
  const fromSearch = new URLSearchParams(location.search).get(name)
  if (fromSearch !== null) return fromSearch
  const q = location.hash.indexOf('?')
  if (q === -1) return null
  return new URLSearchParams(location.hash.slice(q + 1)).get(name)
}
