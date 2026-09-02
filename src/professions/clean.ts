import type { ProfessionTemplate } from './types'
const clean: ProfessionTemplate = {
  id: 'clean', name: 'Solo Clean', status: 'coming_soon', icon: '🧹',
  tagline: 'รอบทำความสะอาด เตือนเจ้าของบ้าน เก็บเงิน ใบเสร็จ ให้แม่บ้านอิสระ',
  vocab: {
    subject: 'บ้าน', subjects: 'บ้าน', client: 'เจ้าของบ้าน', clientHonorific: 'คุณ',
    unit: 'รอบ', units: 'รอบ', completion: 'ยืนยันรอบ', completionDone: 'ทำแล้ว',
    provider: 'แม่บ้าน', providerSelf: 'แม่บ้าน',
  },
}
export default clean
