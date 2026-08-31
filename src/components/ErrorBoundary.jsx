import { Component } from 'react'

/** กันจอขาว — ถ้า render พังที่ไหนสักที่ ยังมีทางกลับและทางกู้ข้อมูล */
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="land">
        <div className="land__inner" style={{ textAlign: 'center' }}>
          <h1 className="land__logo">ระบบสะดุด</h1>
          <p className="land__lead" style={{ maxWidth: 'none' }}>
            มีบางอย่างผิดพลาด ข้อมูลของคุณยังอยู่ครบ
          </p>
          <p className="fld__hint" style={{ textAlign: 'center' }}>
            {String(this.state.error?.message || this.state.error).slice(0, 160)}
          </p>
          <div className="land__cta">
            <button className="btn btn--cta btn--block" onClick={() => window.location.reload()}>
              โหลดหน้าใหม่
            </button>
            <button
              className="btn btn--ghost btn--block"
              style={{ marginTop: 8 }}
              onClick={() => {
                try { localStorage.removeItem('tutordai-demo-v1') } catch { /* ignore */ }
                window.location.reload()
              }}
            >
              ล้างข้อมูลแล้วเริ่มใหม่
            </button>
          </div>
        </div>
      </div>
    )
  }
}
