const base = {
  fill: 'none', stroke: 'currentColor', strokeWidth: 1.7,
  strokeLinecap: 'round', strokeLinejoin: 'round',
}

export const IconToday = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...base}>
    <rect x="3" y="5" width="18" height="16" rx="3" />
    <path d="M3 10h18M8 3v4M16 3v4" />
    <path d="m9 15 2 2 4-4" />
  </svg>
)

export const IconStudents = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...base}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 20c0-3.2 2.7-5.2 6-5.2s6 2 6 5.2" />
    <path d="M16.5 11.2A3 3 0 0 0 17 5.3M18 19.6c.6-.3 2.2-.9 3-1.6 0-2.4-1.4-4-3.6-4.6" />
  </svg>
)

export const IconBilling = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...base}>
    <path d="M5 3.5h14v17l-2.3-1.6-2.4 1.6-2.3-1.6-2.4 1.6L7.3 19 5 20.5z" />
    <path d="M9 8.5h6M9 12.5h6" />
  </svg>
)

export const IconSun = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...base}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
)

export const IconMoon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...base}>
    <path d="M21 13.2A8.5 8.5 0 1 1 10.8 3a6.8 6.8 0 0 0 10.2 10.2z" />
  </svg>
)

export const IconClose = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...base}>
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
)
