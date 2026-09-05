import { lineShareUrl } from '../core/share'

/** เปิด LINE พร้อมข้อความ — คืน false ถ้าเบราว์เซอร์บล็อก popup */
export function openLine(text: string): boolean {
  const w = window.open(lineShareUrl(text), '_blank', 'noopener,noreferrer')
  return w !== null
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
