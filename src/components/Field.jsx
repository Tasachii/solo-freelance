/** ชิ้นส่วนฟอร์มที่ใช้ทั่วแอป — คุมหน้าตาและ accessibility ไว้ที่เดียว */
import { useId } from 'react'

export function TextField({ label, hint, error, suffix, ...rest }) {
  const id = useId()
  return (
    <div className="fld">
      {label && (
        <label className="fld__label" htmlFor={id}>
          {label}
        </label>
      )}
      <div className={`fld__wrap${error ? ' fld__wrap--err' : ''}`}>
        <input
          id={id}
          className="fld__input"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error || hint ? `${id}-d` : undefined}
          {...rest}
        />
        {suffix && <span className="fld__suffix">{suffix}</span>}
      </div>
      {(error || hint) && (
        <div id={`${id}-d`} className={error ? 'fld__err' : 'fld__hint'}>
          {error || hint}
        </div>
      )}
    </div>
  )
}

export function SelectField({ label, hint, options, ...rest }) {
  const id = useId()
  return (
    <div className="fld">
      {label && (
        <label className="fld__label" htmlFor={id}>
          {label}
        </label>
      )}
      <div className="fld__wrap">
        <select id={id} className="fld__input fld__input--select" {...rest}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {hint && <div className="fld__hint">{hint}</div>}
    </div>
  )
}

export function Switch({ label, hint, checked, onChange }) {
  const id = useId()
  return (
    <div className="swrow">
      <label className="swrow__txt" htmlFor={id}>
        <span className="swrow__label">{label}</span>
        {hint && <span className="swrow__hint">{hint}</span>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={`sw${checked ? ' sw--on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="sw__dot" />
      </button>
    </div>
  )
}

export function Segmented({ label, hint, value, onChange, options }) {
  return (
    <div className="fld">
      {label && <div className="fld__label">{label}</div>}
      <div className="seg" role="group" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            className={`seg__b${value === o.value ? ' seg__b--on' : ''}`}
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
      {hint && <div className="fld__hint">{hint}</div>}
    </div>
  )
}

/** หัวข้อกลุ่มในหน้าตั้งค่า */
export function Group({ title, desc, children }) {
  return (
    <section className="grp">
      <h3 className="grp__t">{title}</h3>
      {desc && <p className="grp__d">{desc}</p>}
      <div className="card grp__body">{children}</div>
    </section>
  )
}

export function EmptyState({ icon, title, desc, action }) {
  return (
    <div className="empty">
      <div className="empty__ico" aria-hidden="true">{icon}</div>
      <h3 className="empty__t">{title}</h3>
      {desc && <p className="empty__d">{desc}</p>}
      {action}
    </div>
  )
}
