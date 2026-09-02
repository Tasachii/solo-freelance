import type { ProfessionTemplate } from './types'
import tutor from './tutor'
import nail from './nail'
import barber from './barber'
import clean from './clean'

/** อาชีพใหม่ = เพิ่มไฟล์เดียวแล้วใส่ใน list นี้ */
export const professions: ProfessionTemplate[] = [tutor, nail, barber, clean]

export function professionById(id: string): ProfessionTemplate {
  return professions.find((p) => p.id === id) ?? tutor
}
