export type ISODate = string // เก็บ ค.ศ. "2025-09-02" แสดง พ.ศ. ผ่าน format.ts
export type Money = number // บาท จำนวนเต็ม

export type BillingMode =
  | { mode: 'per_unit'; rate: Money }
  | { mode: 'flat_monthly'; amount: Money }
  | { mode: 'package'; total: number; price: Money; purchasedAt: ISODate // used = derive จาก completions
      /** unitId ที่แพ็กก่อนหน้านับไปแล้ว — กันคาบวันต่อแพ็กถูกคิดเงินสองรอบ */
      carriedUnitIds?: string[] }

export interface Client { id: string; name: string; lineId?: string; phone?: string }
export interface Subject {
  id: string; name: string; clientId: string; billing: BillingMode
  label?: string; active: boolean; createdAt: ISODate
}
export interface ServiceUnit {
  id: string; subjectId: string; scheduledAt: ISODate; time: string
  durationMin: number; label?: string; adHoc?: boolean
  /** ยกเลิกแล้ว — ไม่โผล่ในตาราง ไม่ถูกนับเงิน แต่ยังอยู่ในประวัติ */
  cancelled?: boolean
  /** วันเดิมก่อนเลื่อน เก็บไว้ให้ตรวจย้อนได้ */
  movedFrom?: ISODate
}
export interface CompletionEvent { unitId: string; completedAt: ISODate; note?: string }
export interface InvoiceLine { description: string; qty: number; unitPrice: Money; amount: Money }
export interface Invoice {
  id: string; clientId: string; subjectId: string; period: string; kind: 'monthly' | 'package'
  lines: InvoiceLine[]; total: Money; status: 'draft' | 'sent' | 'paid' | 'overdue'
  createdAt: ISODate; sentAt?: ISODate; dueAt?: ISODate
}
export interface Payment {
  id: string; invoiceId: string; amount: Money; paidAt: ISODate
  slipVerified: boolean; slipAmount?: Money
}
export interface Receipt { id: string; paymentId: string; number: string; issuedAt: ISODate }

export type MessageKind = 'invoice' | 'reminder' | 'renewal' | 'renewal_exhausted' | 'receipt' | 'faq_reply'
  | 'moved' | 'cancelled' | 'summary'
export interface Message {
  id: string; clientId: string; subjectId?: string; kind: MessageKind; draft: string; edited?: boolean
  status: 'draft' | 'sent' | 'skipped'; createdAt: ISODate; sentAt?: ISODate
  dedupeKey: string; meta?: Record<string, unknown>
}
export interface ChatTurn {
  id: string; clientId: string; from: 'client' | 'provider'; text: string; at: ISODate; viaAdmin?: boolean
}
export interface WaitlistEntry {
  professionId: string; name: string; contact: string
  size?: string; modes?: string[]; concierge?: boolean; at: ISODate
}
export interface EventLog { at: string; name: string; props?: Record<string, unknown> }

/** demo = ข้อมูลสมมติ วันล็อก · real = ข้อมูลจริงของผู้ใช้ วันตามเครื่อง */
export type AppMode = 'demo' | 'real'

export interface AppState {
  schemaVersion: 4
  mode: AppMode
  professionId: string
  scenarioId: string
  provider: { name: string; promptpayId: string }
  today: ISODate // เดโมล็อกวันไว้ · โหมดจริงเดินตามเครื่อง
  clients: Client[]; subjects: Subject[]; units: ServiceUnit[]; completions: CompletionEvent[]
  invoices: Invoice[]; payments: Payment[]; receipts: Receipt[]; messages: Message[]; chats: ChatTurn[]
  waitlist: WaitlistEntry[]; events: EventLog[]
  counters: { receipt: number; invoice: number }
  onboarded: boolean
  /** วันที่สำรองข้อมูลล่าสุด — เตือนครูเมื่อทิ้งช่วงนาน */
  lastBackupAt?: ISODate
  /**
   * ข้อความที่เปิด LINE ไปแล้วและรอยืนยัน + คิวที่เหลือ
   * ต้องอยู่ใน state ไม่ใช่ในคอมโพเนนต์ — สลับไป LINE แล้ว iOS ทิ้งแท็บได้
   * กลับมาแล้วต้องรู้ว่าค้างอยู่ที่ใคร ไม่งั้นครูส่งซ้ำและผู้ปกครองได้บิลสองรอบ
   */
  sending?: { awaiting: string; queue: string[] }
}
