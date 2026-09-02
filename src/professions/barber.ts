import type { ProfessionTemplate } from './types'
const barber: ProfessionTemplate = {
  id: 'barber', name: 'Solo Barber', status: 'coming_soon', icon: '💈',
  tagline: 'คิว เตือนถึงเวลาตัด เก็บเงิน ใบเสร็จ ให้ช่างที่ทำร้านคนเดียว',
  defaultBilling: 'per_unit',
  vocab: {
    subject: 'ลูกค้า', subjects: 'ลูกค้า', client: 'ลูกค้า', clientHonorific: 'คุณ',
    unit: 'คิว', units: 'ครั้ง', completion: 'ยืนยันคิว', completionDone: 'ตัดแล้ว',
    provider: 'ช่าง', providerSelf: 'ช่าง',
  },
}
export default barber
