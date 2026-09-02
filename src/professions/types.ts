import type { AppState, BillingMode } from '../core/types'

export type FaqSource = 'currentInvoice' | 'nextUnit' | 'packageRemaining' | 'paymentStatus'

export interface FaqRule {
  keywords: string[]
  answerFrom: FaqSource
  /** ลำดับเช็คเมื่อข้อความ match หลายกฎ — เลขน้อยชนะ (paymentStatus=1 … currentInvoice=4) */
  priority: number
}

export interface ProfessionTemplate {
  id: string
  name: string
  tagline: string
  icon: string
  status: 'live' | 'coming_soon'
  vocab: {
    subject: string; subjects: string; client: string; clientHonorific: string
    unit: string; units: string; completion: string; completionDone: string
    provider: string; providerSelf: string
  }
  defaultBilling?: BillingMode
  packagePresets?: number[]
  dueDays?: number
  reminderLadder?: { minDaysOverdue: number; key: 'soft' | 'clear' | 'final' }[]
  faq?: FaqRule[]
  mockScenarios?: Record<string, () => Partial<AppState>>
}
