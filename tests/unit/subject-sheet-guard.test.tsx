import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SubjectSheet from '../../src/app/SubjectSheet'
import { buildScenario } from '../../src/core/scenarios'
import { complete } from '../../src/core/ledger'

const mocks = vi.hoisted(() => ({
  state: null as unknown as ReturnType<typeof buildScenario>,
  dispatch: vi.fn(() => true),
}))

vi.mock('../../src/core/store', () => ({
  useStore: () => ({ state: mocks.state, dispatch: mocks.dispatch }),
}))

afterEach(() => cleanup())
beforeEach(() => { mocks.state = buildScenario('default') })

describe('SubjectSheet billing history guard', () => {
  it('disables save and explains how to resolve an unsafe billing mode change', () => {
    const subject = mocks.state.subjects.find((row) => row.id === 's1')!
    render(<SubjectSheet subject={subject} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'เหมาเดือน' }))

    expect(screen.getByRole('button', { name: 'บันทึก' }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByText(/ปิดยอดเดือนที่ค้างก่อน/)).toBeTruthy()
  })

  it('disables save when changing a flat fee with completed work not yet billed', () => {
    const unit = mocks.state.units.find((row) => row.subjectId === 's4' && row.scheduledAt.startsWith('2025-09'))!
    mocks.state = complete(mocks.state, unit.id)
    const subject = mocks.state.subjects.find((row) => row.id === 's4')!
    render(<SubjectSheet subject={subject} onClose={vi.fn()} />)
    fireEvent.change(screen.getByRole('textbox', { name: 'ยอดเหมาต่อเดือน' }), { target: { value: '3500' } })

    expect(screen.getByRole('button', { name: 'บันทึก' }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByText(/ยังเปลี่ยนยอดเหมาไม่ได้/)).toBeTruthy()
  })

  it('directs a used package to a new subject instead of an impossible close-month step', () => {
    const subject = mocks.state.subjects.find((row) => row.id === 's8')!
    render(<SubjectSheet subject={subject} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'รายครั้ง' }))

    expect(screen.getByRole('button', { name: 'บันทึก' }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByText(/หยุดรายการเดิมและเพิ่มรายการใหม่/)).toBeTruthy()
  })
})
