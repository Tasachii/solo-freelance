import { useNavigate } from 'react-router-dom'
import { professions } from '../professions'
import { copy } from '../copy'

export default function ProfessionPicker({ onNotify }: { onNotify: (id: string) => void }) {
  const nav = useNavigate()

  return (
    <ul className="picker">
      {professions.map((p) => {
        const live = p.status === 'live'
        return (
          <li key={p.id} className={`picker__i${live ? ' picker__i--live' : ''}`}>
            <span className="picker__icon" aria-hidden="true">{p.icon}</span>
            <div className="picker__txt">
              <b className="picker__name">
                {p.name}
                {!live && <span className="picker__soon">{copy.landing.comingSoon}</span>}
              </b>
              <span className="picker__tag">{p.tagline}</span>
            </div>
            {live ? (
              <button className="btn btn--sm btn--primary" onClick={() => nav('/app/today')}>
                {copy.landing.tryNow}
              </button>
            ) : (
              <button className="btn btn--sm btn--ghost" onClick={() => onNotify(p.id)}>
                {copy.landing.notifyMe}
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
