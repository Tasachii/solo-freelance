// ข้อความถึงลูกค้าทุกประโยค — เสียงของครู ไม่มีคำว่า "ระบบ/อัตโนมัติ/Solo" (หลักการข้อ 8)
export const tutorTemplates = {
  invoice:
    'เรียน{clientHonorific}{clientName} 🙏 ค่าเรียน{subjectName} เดือน {periodThai} {qty} ครั้ง รวม {total} บาท{p}\nดูรายละเอียดชำระเงินที่ {invoiceUrl} แล้วส่งสลิปกลับในแชท{p}',
  invoiceFlat:
    'เรียน{clientHonorific}{clientName} 🙏 ค่าเรียน{subjectName} เดือน {periodThai} {total} บาท{p} (เรียนครบ {qty} ครั้ง)\nดูรายละเอียดชำระเงินที่ {invoiceUrl} แล้วส่งสลิปกลับในแชท{p}',
  reminder: {
    soft: 'เรียน{clientHonorific}{clientName} ขออนุญาตแจ้งเตือนค่าเรียน{subjectName} เดือน {periodThai} {total} บาท ยังไม่ได้รับยอด{p} ดูรายละเอียดชำระเงินที่ {invoiceUrl} {p} 🙏',
    clear: 'เรียน{clientHonorific}{clientName} ค่าเรียน{subjectName} เดือน {periodThai} {total} บาท ค้างมา {daysOverdue} วันแล้ว{p} รบกวนชำระภายในวันนี้หรือพรุ่งนี้ได้ไหม{pq} {invoiceUrl}',
    final: 'เรียน{clientHonorific}{clientName} แจ้งครั้งสุดท้ายเรื่องค่าเรียน{subjectName} เดือน {periodThai} {total} บาท{p} หากมีเรื่องการชำระที่อยากคุย ทักครูได้เลยนะ{pq} ยินดี{p} {invoiceUrl}',
  },
  renewal:
    'เรียน{clientHonorific}{clientName} แพ็ก {packageTotal} ครั้งของ{subjectName} เหลืออีก {remaining} ครั้ง{p} ต่อแพ็กใหม่ {packageTotal} ครั้ง {packagePrice} บาท ดูรายละเอียดชำระเงินที่ {invoiceUrl} {p}',
  renewalExhausted:
    'เรียน{clientHonorific}{clientName} แพ็ก {packageTotal} ครั้งของ{subjectName} ครบแล้ว{p} วันนี้เรียนเป็นครั้งที่ {overBy} นอกแพ็ก ต่อแพ็กใหม่ {packageTotal} ครั้ง {packagePrice} บาท ได้ที่ {invoiceUrl} {p}',
  receipt:
    'ได้รับยอด {total} บาท ค่าเรียน{subjectName} เดือน {periodThai} แล้ว{p} ขอบคุณ{p} 🙏 ใบเสร็จ: {receiptUrl}',
  moved:
    'เรียน{clientHonorific}{clientName} ขอเลื่อนคาบ{subjectName}จากวัน{fromDayThai}ที่ {fromDateThai} ไปเป็นวัน{dayThai}ที่ {dateThai} เวลา {time} {p} ขออภัยในความไม่สะดวก{p} 🙏',
  cancelled:
    'เรียน{clientHonorific}{clientName} ขอแจ้งงดคาบ{subjectName}วัน{dayThai}ที่ {dateThai} {p} เดี๋ยวครูนัดชดเชยแล้วแจ้งอีกทีนะ{pq} 🙏',
  summary:
    'เรียน{clientHonorific}{clientName} สรุป{subjectName} เดือน {periodThai} {p} เรียนไปแล้ว {qty} ครั้ง {amountLine}',
  summaryAmount: 'ยอดตอนนี้ {total} บาท',
  summaryPackage: 'เหลืออีก {remaining} จาก {packageTotal} ครั้ง',
  slipRequest:
    'เรียน{clientHonorific}{clientName} สลิปที่ส่งมายอด {slipAmount} บาท แต่ค่าเรียนเดือนนี้ {total} บาท{p} รบกวนตรวจสอบหรือส่งสลิปอีกครั้งได้ไหม{pq} 🙏',
  faq: {
    currentInvoice: 'เดือน {periodThai} {subjectName}เรียน {qty} ครั้ง รวม {total} บาท{p} ดูรายละเอียดชำระเงินที่ {invoiceUrl}',
    currentInvoiceNone: '{subjectName}เดือนนี้ยังไม่ปิดยอด{p} ตอนนี้เรียนไป {completedSoFar} ครั้ง ประมาณ {estimate} บาท จะส่งใบแจ้งสิ้นเดือนนะ{pq}',
    nextUnit: '{subjectName}มีเรียนครั้งถัดไปวัน{dayThai}ที่ {dateThai} เวลา {time} {p}',
    nextUnitNone: 'ตอนนี้ยังไม่มีคาบถัดไปในตาราง{p} เดี๋ยวครูนัดเพิ่มแล้วแจ้งนะ{pq}',
    packageRemaining: 'แพ็ก {packageTotal} ครั้งของ{subjectName} ใช้ไป {used} เหลือ {remaining} ครั้ง{p}',
    packageNotPackage: '{subjectName}เป็นแบบ{modeThai}{p} ไม่ได้ใช้แพ็ก',
    paymentPaid: 'ได้รับยอด {total} บาทแล้ว{p} ใบเสร็จ {receiptUrl}',
    paymentUnpaid: 'ยังมียอดคงเหลือ {total} บาท{p} ดูรายละเอียดชำระเงินที่ {invoiceUrl} แล้วส่งสลิปกลับในแชท{p}',
    fallback: 'ขอบคุณที่สอบถาม{p} เดี๋ยวครูตอบเองนะ{pq}',
  },
} as const

export const modeThai = (mode: 'per_unit' | 'flat_monthly' | 'package'): string =>
  mode === 'per_unit' ? 'รายครั้ง' : mode === 'flat_monthly' ? 'เหมารายเดือน' : 'แพ็ก'
