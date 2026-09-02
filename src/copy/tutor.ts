// ข้อความถึงลูกค้าทุกประโยค — เสียงของครู ไม่มีคำว่า "ระบบ/อัตโนมัติ/Solo" (หลักการข้อ 8)
export const tutorTemplates = {
  invoice:
    'เรียน{clientHonorific}{clientName} 🙏 ค่าเรียน{subjectName} เดือน{periodThai} {qty} ครั้ง รวม {total} บาทครับ\nสแกน QR เพื่อชำระ แล้วแนบสลิปได้ที่ {invoiceUrl} ครับ',
  invoiceFlat:
    'เรียน{clientHonorific}{clientName} 🙏 ค่าเรียน{subjectName} เดือน{periodThai} {total} บาทครับ (เรียนครบ {qty} ครั้ง)\nสแกน QR เพื่อชำระ แล้วแนบสลิปได้ที่ {invoiceUrl} ครับ',
  reminder: {
    soft: 'เรียน{clientHonorific}{clientName} ขออนุญาตแจ้งเตือนค่าเรียน{subjectName} เดือน{periodThai} {total} บาท ยังไม่ได้รับยอดครับ สแกนจ่ายได้ที่ {invoiceUrl} ครับ 🙏',
    clear: 'เรียน{clientHonorific}{clientName} ค่าเรียน{subjectName} เดือน{periodThai} {total} บาท ค้างมา {daysOverdue} วันแล้วครับ รบกวนชำระภายในวันนี้หรือพรุ่งนี้ได้ไหมครับ {invoiceUrl}',
    final: 'เรียน{clientHonorific}{clientName} แจ้งครั้งสุดท้ายเรื่องค่าเรียน{subjectName} เดือน{periodThai} {total} บาทครับ หากมีเรื่องการชำระที่อยากคุย ทักครูได้เลยนะครับ ยินดีครับ {invoiceUrl}',
  },
  renewal:
    'เรียน{clientHonorific}{clientName} แพ็ก {packageTotal} ครั้งของ{subjectName} เหลืออีก {remaining} ครั้งครับ ต่อแพ็กใหม่ {packageTotal} ครั้ง {packagePrice} บาท สแกนจ่ายได้ที่ {invoiceUrl} ครับ',
  renewalExhausted:
    'เรียน{clientHonorific}{clientName} แพ็ก {packageTotal} ครั้งของ{subjectName} ครบแล้วครับ วันนี้เรียนเป็นครั้งที่ {overBy} นอกแพ็ก ต่อแพ็กใหม่ {packageTotal} ครั้ง {packagePrice} บาท ได้ที่ {invoiceUrl} ครับ',
  receipt:
    'ได้รับยอด {total} บาท ค่าเรียน{subjectName} เดือน{periodThai} แล้วครับ ขอบคุณครับ 🙏 ใบเสร็จ: {receiptUrl}',
  slipRequest:
    'เรียน{clientHonorific}{clientName} สลิปที่ส่งมายอด {slipAmount} บาท แต่ค่าเรียนเดือนนี้ {total} บาทครับ รบกวนตรวจสอบหรือส่งสลิปอีกครั้งได้ไหมครับ 🙏',
  faq: {
    currentInvoice: 'เดือน{periodThai} {subjectName}เรียน {qty} ครั้ง รวม {total} บาทครับ สแกนจ่ายได้ที่ {invoiceUrl}',
    currentInvoiceNone: 'เดือนนี้ยังไม่ปิดยอดครับ ตอนนี้เรียนไป {completedSoFar} ครั้ง ประมาณ {estimate} บาท จะส่งใบแจ้งสิ้นเดือนนะครับ',
    nextUnit: '{subjectName}มีเรียนครั้งถัดไปวัน{dayThai}ที่ {dateThai} เวลา {time} ครับ',
    nextUnitNone: 'ตอนนี้ยังไม่มีคาบถัดไปในตารางครับ เดี๋ยวครูนัดเพิ่มแล้วแจ้งนะครับ',
    packageRemaining: 'แพ็ก {packageTotal} ครั้งของ{subjectName} ใช้ไป {used} เหลือ {remaining} ครั้งครับ',
    packageNotPackage: '{subjectName}เป็นแบบ{modeThai}ครับ ไม่ได้ใช้แพ็ก',
    paymentPaid: 'ได้รับยอด {total} บาทแล้วครับ ใบเสร็จ {receiptUrl}',
    paymentUnpaid: 'ยังไม่ได้รับยอดครับ ถ้าโอนแล้ว แนบสลิปได้ที่ {invoiceUrl} ครับ',
    fallback: 'ขอบคุณที่สอบถามครับ เดี๋ยวครูตอบเองนะครับ',
  },
} as const

export const modeThai = (mode: 'per_unit' | 'flat_monthly' | 'package'): string =>
  mode === 'per_unit' ? 'รายครั้ง' : mode === 'flat_monthly' ? 'เหมารายเดือน' : 'แพ็ก'
