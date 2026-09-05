import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { BottomSheet, ProgressBar } from '../../src/app/components'

afterEach(() => cleanup())

describe('shared UI accessibility', () => {
  it('exposes progress values to assistive technology', () => {
    const { getByRole } = render(<ProgressBar value={3} max={10} tone="ok" label="ใช้แพ็กแล้ว" />)
    const bar = getByRole('progressbar', { name: 'ใช้แพ็กแล้ว' })
    expect(bar.getAttribute('aria-valuemin')).toBe('0')
    expect(bar.getAttribute('aria-valuenow')).toBe('3')
    expect(bar.getAttribute('aria-valuemax')).toBe('10')
  })

  it('isolates the background, traps focus, labels the dialog, and restores state', () => {
    const background = document.createElement('main')
    background.setAttribute('aria-hidden', 'false')
    document.body.appendChild(background)
    const onClose = vi.fn()
    const { unmount, getByRole } = render(
      <BottomSheet title="แก้ข้อมูล" onClose={onClose} footer={<button>บันทึก</button>}>
        <input aria-label="ชื่อ" />
      </BottomSheet>,
    )

    const dialog = getByRole('dialog', { name: 'แก้ข้อมูล' })
    expect(dialog.getAttribute('aria-labelledby')).toBeTruthy()
    expect(dialog.getAttribute('aria-label')).toBeNull()
    expect(background.hasAttribute('inert')).toBe(true)
    expect(background.getAttribute('aria-hidden')).toBe('true')

    const close = getByRole('button', { name: 'ปิด' })
    const save = getByRole('button', { name: 'บันทึก' })
    save.focus()
    fireEvent.keyDown(window, { key: 'Tab' })
    expect(document.activeElement).toBe(close)
    close.focus()
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(save)

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
    unmount()
    expect(background.hasAttribute('inert')).toBe(false)
    expect(background.getAttribute('aria-hidden')).toBe('false')
    background.remove()
  })
})
