import { Component, type ErrorInfo, type ReactNode } from 'react'
import { copy } from '../copy'
import { STORAGE_KEY } from '../core/store'

interface State { failed: boolean }

/**
 * ข้อมูลเดโมมาจาก localStorage ซึ่งอาจค้างจากเวอร์ชันเก่าและอ้างถึงแถวที่ไม่มีแล้ว
 * ถ้าปล่อยพัง หน้าจะขาวทั้งจอ — ให้เห็นทางออกและกดโหลดชุดใหม่ได้ดีกว่า
 */
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(err: Error, info: ErrorInfo): void {
    console.error('[solo] render failed', err, info.componentStack)
  }

  private reset = (): void => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* โหมดส่วนตัวลบไม่ได้ — reload ก็ยังพอช่วย */
    }
    location.hash = '#/'
    location.reload()
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children
    return (
      <div className="page crash">
        <h1 className="crash__t">{copy.errors.stateCorrupt}</h1>
        <button className="btn btn--primary" onClick={this.reset}>{copy.common.reset}</button>
      </div>
    )
  }
}
