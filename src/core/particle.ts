import type { Particle } from './types'

/**
 * คำลงท้ายในข้อความถึงลูกค้า — ครูผู้หญิงต้องไม่ถูกบังคับพูด "ครับ"
 * {p}  ท้ายประโยคบอกเล่า: ครับ / ค่ะ
 * {pq} ท้ายคำถามและ "นะ": ครับ / คะ
 */
export const PARTICLES = ['ครับ', 'ค่ะ'] as const

export const isParticle = (v: unknown): v is Particle => PARTICLES.includes(v as Particle)

export function particleVars(particle: Particle | undefined): { p: Particle; pq: 'ครับ' | 'คะ' } {
  if (particle === 'ค่ะ') return { p: 'ค่ะ', pq: 'คะ' }
  return { p: 'ครับ', pq: 'ครับ' }
}
