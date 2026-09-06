import { lineShareUrl } from '../core/share'

/** Requests a launch, not proof of delivery. noopener may return null even on success. */
export function openLine(text: string): boolean {
  if (!text.trim()) return false
  try {
    window.open(lineShareUrl(text), '_blank', 'noopener,noreferrer')
    return true
  } catch {
    return false
  }
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
