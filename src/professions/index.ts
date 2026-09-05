import type { ProfessionTemplate } from './types'
import tutor from './tutor'
import nail from './nail'
import barber from './barber'
import clean from './clean'
import type { BillingMode } from '../core/types'
import type { ProfessionMessages } from './types'

/** อาชีพใหม่ = เพิ่มไฟล์เดียวแล้วใส่ใน list นี้ */
export const professions: ProfessionTemplate[] = [tutor, nail, barber, clean]

export function professionById(id: string): ProfessionTemplate {
  return professions.find((p) => p.id === id) ?? professions[0]
}

const genericTemplates = (profession: ProfessionTemplate): ProfessionMessages => {
  const v = profession.vocab
  return {
    invoice: `เรียน{clientHonorific}{clientName} 🙏 ค่า${v.unit}ของ{subjectName} เดือน{periodThai} {qty} ${v.units} รวม {total} บาทครับ\nดูรายละเอียดชำระเงินที่ {invoiceUrl} แล้วส่งสลิปกลับในแชทครับ`,
    invoiceFlat: `เรียน{clientHonorific}{clientName} 🙏 ค่าบริการ{subjectName} เดือน{periodThai} {total} บาทครับ ({qty} ${v.units})\nดูรายละเอียดชำระเงินที่ {invoiceUrl} แล้วส่งสลิปกลับในแชทครับ`,
    reminder: {
      soft: 'เรียน{clientHonorific}{clientName} ขออนุญาตแจ้งเตือนยอดของ{subjectName} เดือน{periodThai} {total} บาท ยังไม่ได้รับยอดครับ ดูรายละเอียดที่ {invoiceUrl} 🙏',
      clear: 'เรียน{clientHonorific}{clientName} ยอดของ{subjectName} เดือน{periodThai} {total} บาท ค้างมา {daysOverdue} วันแล้วครับ รบกวนชำระภายในวันนี้หรือพรุ่งนี้ได้ไหมครับ {invoiceUrl}',
      final: 'เรียน{clientHonorific}{clientName} แจ้งครั้งสุดท้ายเรื่องยอดของ{subjectName} เดือน{periodThai} {total} บาทครับ หากมีเรื่องการชำระที่อยากคุย ทักมาได้เลยครับ {invoiceUrl}',
    },
    renewal: `เรียน{clientHonorific}{clientName} แพ็ก {packageTotal} ${v.units}ของ{subjectName} เหลือ {remaining} ${v.units}ครับ ต่อแพ็กใหม่ {packageTotal} ${v.units} {packagePrice} บาท ดูรายละเอียดที่ {invoiceUrl}`,
    renewalExhausted: `เรียน{clientHonorific}{clientName} แพ็ก {packageTotal} ${v.units}ของ{subjectName} ครบแล้วครับ รอบล่าสุดเป็นครั้งที่ {overBy} นอกแพ็ก ต่อแพ็กใหม่ {packageTotal} ${v.units} {packagePrice} บาท ดูรายละเอียดที่ {invoiceUrl}`,
    receipt: 'ได้รับยอด {total} บาทของ{subjectName} เดือน{periodThai} แล้วครับ ขอบคุณครับ 🙏 ใบเสร็จ: {receiptUrl}',
    moved: `เรียน{clientHonorific}{clientName} ขอเลื่อน${v.unit}ของ{subjectName}จากวัน{fromDayThai}ที่ {fromDateThai} ไปเป็นวัน{dayThai}ที่ {dateThai} เวลา {time} ครับ ขออภัยในความไม่สะดวกครับ 🙏`,
    cancelled: `เรียน{clientHonorific}{clientName} ขอแจ้งงด${v.unit}ของ{subjectName}วัน{dayThai}ที่ {dateThai} ครับ จะแจ้งนัดใหม่อีกครั้งครับ 🙏`,
    summary: `เรียน{clientHonorific}{clientName} สรุป{subjectName} เดือน {periodThai} ครับ ทำไปแล้ว {qty} ${v.units} {amountLine}`,
    summaryAmount: 'ยอดตอนนี้ {total} บาท',
    summaryPackage: `เหลืออีก {remaining} จาก {packageTotal} ${v.units}`,
    slipRequest: 'เรียน{clientHonorific}{clientName} สลิปที่ส่งมายอด {slipAmount} บาท แต่ยอดรอบนี้ {total} บาทครับ รบกวนตรวจสอบหรือส่งสลิปอีกครั้งครับ 🙏',
    faq: {
      currentInvoice: `เดือน{periodThai} {subjectName}มี {qty} ${v.units} รวม {total} บาทครับ ดูรายละเอียดชำระเงินที่ {invoiceUrl}`,
      currentInvoiceNone: `{subjectName}เดือนนี้ยังไม่ปิดยอดครับ ตอนนี้ทำไป {completedSoFar} ${v.units} ประมาณ {estimate} บาท จะแจ้งยอดเมื่อสรุปรอบครับ`,
      nextUnit: `{subjectName}มี${v.unit}ครั้งถัดไปวัน{dayThai}ที่ {dateThai} เวลา {time} ครับ`,
      nextUnitNone: `ตอนนี้ยังไม่มี${v.unit}ถัดไปในตารางครับ จะแจ้งเมื่อเพิ่มนัดครับ`,
      packageRemaining: `แพ็ก {packageTotal} ${v.units}ของ{subjectName} ใช้ไป {used} เหลือ {remaining} ${v.units}ครับ`,
      packageNotPackage: '{subjectName}เป็นแบบ{modeThai}ครับ ไม่ได้ใช้แพ็ก',
      paymentPaid: 'ได้รับยอด {total} บาทแล้วครับ ใบเสร็จ {receiptUrl}',
      paymentUnpaid: 'ยังมียอดคงเหลือ {total} บาทครับ ดูรายละเอียดชำระเงินที่ {invoiceUrl} แล้วส่งสลิปกลับในแชทครับ',
      fallback: `ขอบคุณที่สอบถามครับ เดี๋ยว${v.providerSelf}ตอบเองนะครับ`,
    },
  }
}

export const templatesFor = (professionId: string): ProfessionMessages => {
  const profession = professionById(professionId)
  return profession.messages ?? genericTemplates(profession)
}

export const modeLabelFor = (professionId: string, mode: BillingMode['mode']): string => {
  const profession = professionById(professionId)
  return profession.modeLabels?.[mode]
    ?? (mode === 'per_unit' ? `ราย${profession.vocab.unit}` : mode === 'flat_monthly' ? 'เหมารายเดือน' : 'แพ็ก')
}
