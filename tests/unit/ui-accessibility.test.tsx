import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { BottomSheet, ConfirmSheet, ProgressBar } from '../../src/app/components'

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

  it('keeps a confirmation open when an async operation reports failure', async () => {
    const onClose = vi.fn()
    const onConfirm = vi.fn(async () => false)
    const { getByRole } = render(
      <ConfirmSheet title="กู้คืนข้อมูล" confirmLabel="กู้คืน" onConfirm={onConfirm} onClose={onClose} />,
    )

    fireEvent.click(getByRole('button', { name: 'กู้คืน' }))
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1))
    expect(onClose).not.toHaveBeenCalled()
    expect(getByRole('dialog', { name: 'กู้คืนข้อมูล' })).toBeTruthy()
  })

  it('closes once after a successful async confirmation', async () => {
    let finish!: (value: boolean) => void
    const onClose = vi.fn()
    const onConfirm = vi.fn(() => new Promise<boolean>((resolve) => { finish = resolve }))
    const { getByRole } = render(
      <ConfirmSheet title="ยืนยัน" confirmLabel="ทำต่อ" onConfirm={onConfirm} onClose={onClose} />,
    )

    const confirm = getByRole('button', { name: 'ทำต่อ' })
    fireEvent.click(confirm)
    fireEvent.click(confirm)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onClose).not.toHaveBeenCalled()
    expect(confirm.hasAttribute('disabled')).toBe(true)
    finish(true)
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })
})
