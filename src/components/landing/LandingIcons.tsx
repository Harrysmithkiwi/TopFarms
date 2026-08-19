// Authored icon set for the v12 landing world.
//
// The operator's concept HTML used emoji (🐄 🐑 🍇 🌿 🌾 🌲, and ☆ for the bookmark) as the
// sector and job marks. Emoji are not an icon system: they render as a different typeface on
// every OS, they carry their own colour, they cannot take the fern ramp, and they announce
// themselves to screen readers as "cow face". The approved COMP does not show emoji — it
// shows drawn green marks — so the comp and the craft floor agree and the HTML was the lazy
// version of both.
//
// One grammar throughout: 24x24 box, 1.7 stroke where stroked, solid where the comp is solid,
// currentColor only, no per-icon colour. Every icon is aria-hidden — each is always adjacent
// to its own text label, so naming them again would just make a screen reader say it twice.

type IconProps = { className?: string }

const box = {
  viewBox: '0 0 24 24',
  'aria-hidden': true as const,
  focusable: 'false' as const,
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

/* ---------- sector marks (solid, as in the comp) ---------- */

export function IconDairy({ className }: IconProps) {
  return (
    <svg {...box} className={className}>
      <path
        d="M4.6 8.4h11.2a2 2 0 012 2v4.2a2 2 0 01-2 2H4.6a2 2 0 01-2-2v-4.2a2 2 0 012-2z"
        fill="currentColor"
      />
      <path d="M17.8 9.6l2.6-1.3a1.2 1.2 0 011.7 1.1v3.1a1.2 1.2 0 01-1.7 1.1l-2.6-1.3z" fill="currentColor" />
      <path d="M5.4 17h1.5v3.2H5.4zM9.2 17h1.5v3.2H9.2zM12.9 17h1.5v3.2h-1.5z" fill="currentColor" />
      <path d="M6.2 4.2c1.6.3 2.5 1.7 2.4 3.4H4.2c-.2-2 .6-3.1 2-3.4z" fill="currentColor" />
    </svg>
  )
}

export function IconSheepBeef({ className }: IconProps) {
  return (
    <svg {...box} className={className}>
      <ellipse cx="10.5" cy="11.4" rx="6.4" ry="4.6" fill="currentColor" />
      <circle cx="5.4" cy="9.4" r="2.5" fill="currentColor" />
      <circle cx="14.4" cy="8.4" r="2.2" fill="currentColor" />
      <ellipse cx="17.8" cy="11" rx="2.6" ry="2.1" fill="currentColor" />
      <path d="M6.6 15.4h1.5v4.2H6.6zM12 15.4h1.5v4.2H12z" fill="currentColor" />
    </svg>
  )
}

export function IconHorticulture({ className }: IconProps) {
  return (
    <svg {...box} className={className}>
      <path d="M12 21V11" {...stroke} />
      <path d="M12 12.4C12 8.2 15 5 19.4 4.2 20 8.6 17.2 12.4 12 12.4z" fill="currentColor" />
      <path d="M11.4 15.6C8 15.6 5.2 13.2 4.6 9.6c3.6 0 6.4 2.2 6.8 6z" fill="currentColor" />
    </svg>
  )
}

export function IconViticulture({ className }: IconProps) {
  return (
    <svg {...box} className={className}>
      <path d="M12 6.4V3.6" {...stroke} />
      <path d="M12 3.8c1.6-1.1 3.4-1 4.6.2-1.4 1.4-3.2 1.4-4.6-.2z" fill="currentColor" />
      <circle cx="12" cy="9" r="2.05" fill="currentColor" />
      <circle cx="8.5" cy="12.2" r="2.05" fill="currentColor" />
      <circle cx="15.5" cy="12.2" r="2.05" fill="currentColor" />
      <circle cx="12" cy="14.6" r="2.05" fill="currentColor" />
      <circle cx="10.2" cy="18" r="2.05" fill="currentColor" />
      <circle cx="13.8" cy="18" r="2.05" fill="currentColor" />
    </svg>
  )
}

export function IconArable({ className }: IconProps) {
  return (
    <svg {...box} className={className}>
      <path d="M12 21v-8.6" {...stroke} />
      <path d="M12 4.2c1.7 1.3 1.7 3.5 0 5-1.7-1.5-1.7-3.7 0-5z" fill="currentColor" />
      <path d="M9 7.4c1.9.6 2.7 2.4 1.9 4.3-1.9-.7-2.6-2.5-1.9-4.3zM15 7.4c.7 1.8 0 3.6-1.9 4.3-.8-1.9 0-3.7 1.9-4.3z" fill="currentColor" />
      <path d="M8.2 11.8c1.9.6 2.7 2.4 1.9 4.3-1.9-.7-2.6-2.5-1.9-4.3zM15.8 11.8c.7 1.8 0 3.6-1.9 4.3-.8-1.9 0-3.7 1.9-4.3z" fill="currentColor" />
    </svg>
  )
}

export function IconForestry({ className }: IconProps) {
  return (
    <svg {...box} className={className}>
      <path d="M12 21v-3" {...stroke} />
      <path d="M12 2.6l3.6 5.2h-7.2zM12 7l4.6 6.2H7.4zM12 11.4l5.6 6.8H6.4z" fill="currentColor" />
    </svg>
  )
}

/* ---------- feature / value marks (stroked) ---------- */

export function IconSeeker({ className }: IconProps) {
  return (
    <svg {...box} className={className}>
      <circle cx="12" cy="8" r="3.6" {...stroke} />
      <path d="M4.6 20c0-3.9 3.3-6.6 7.4-6.6s7.4 2.7 7.4 6.6" {...stroke} />
    </svg>
  )
}

export function IconEmployer({ className }: IconProps) {
  return (
    <svg {...box} className={className}>
      <circle cx="9" cy="8.2" r="3.2" {...stroke} />
      <circle cx="16.6" cy="9.4" r="2.4" {...stroke} />
      <path d="M2.6 19.6c0-3.4 2.9-5.8 6.4-5.8s6.4 2.4 6.4 5.8" {...stroke} />
      <path d="M15.6 14.2c2.6 0 5 1.6 5 4.2" {...stroke} />
    </svg>
  )
}

export function IconLeaf({ className }: IconProps) {
  return (
    <svg {...box} className={className}>
      <path d="M20 4.4C10.6 4.4 5 8.6 5 14.6a6 6 0 006 6c6 0 9-5.6 9-16.2z" {...stroke} />
      <path d="M16 8.4c-4.6 2.4-7.4 6-8.6 11" {...stroke} />
    </svg>
  )
}

export function IconHandshake({ className }: IconProps) {
  return (
    <svg {...box} className={className}>
      <path d="M2.6 12.4l3.6-3.6 3.4 1.4 2.4-1.4 2.4 1.4 3.4-1.4 3.6 3.6" {...stroke} />
      <path d="M9.6 10.2l-2.4 2.4a1.7 1.7 0 002.4 2.4l.8-.8.9.9a1.7 1.7 0 002.4-2.4" {...stroke} />
      <path d="M13.7 12.7l1.5 1.5a1.7 1.7 0 002.4-2.4" {...stroke} />
    </svg>
  )
}

export function IconShield({ className }: IconProps) {
  return (
    <svg {...box} className={className}>
      <path d="M12 21.4s7.4-3.6 7.4-9V5.2L12 2.6 4.6 5.2v7.2c0 5.4 7.4 9 7.4 9z" {...stroke} />
      <path d="M8.8 11.6l2.2 2.2 4-4.2" {...stroke} />
    </svg>
  )
}

export function IconMap({ className }: IconProps) {
  return (
    <svg {...box} className={className}>
      <path d="M12 21.4c3.6-4.4 5.4-7.7 5.4-10a5.4 5.4 0 10-10.8 0c0 2.3 1.8 5.6 5.4 10z" {...stroke} />
      <circle cx="12" cy="11" r="2.1" {...stroke} />
    </svg>
  )
}

export function IconLock({ className }: IconProps) {
  return (
    <svg {...box} className={className}>
      <rect x="4.4" y="10.6" width="15.2" height="9.8" rx="2.2" {...stroke} />
      <path d="M8 10.6V7.4a4 4 0 018 0v3.2" {...stroke} />
    </svg>
  )
}

export function IconTractor({ className }: IconProps) {
  return (
    <svg {...box} className={className}>
      <circle cx="6.6" cy="16.6" r="4" {...stroke} />
      <circle cx="17.8" cy="17.4" r="3.2" {...stroke} />
      <path d="M3.4 12.6V7.4a1.6 1.6 0 011.6-1.6h3.6l2 5.4h4.6v5.2" {...stroke} />
      <path d="M10.6 16.6h4" {...stroke} />
    </svg>
  )
}

export function IconCheck({ className }: IconProps) {
  return (
    <svg {...box} className={className}>
      <circle cx="12" cy="12" r="9.2" {...stroke} />
      <path d="M8 12.2l2.8 2.8 5.2-5.6" {...stroke} />
    </svg>
  )
}

export function IconTag({ className }: IconProps) {
  return (
    <svg {...box} className={className}>
      <path d="M11.2 2.8H4.4a1.6 1.6 0 00-1.6 1.6v6.8a2 2 0 00.6 1.4l7.4 7.4a1.6 1.6 0 002.3 0l6.6-6.6a1.6 1.6 0 000-2.3l-7.4-7.4a2 2 0 00-1.1-.9z" {...stroke} />
      <circle cx="7.6" cy="7.6" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

/* ---------- interface marks ---------- */

export function IconArrowRight({ className }: IconProps) {
  return (
    <svg {...box} className={className}>
      <path d="M4.6 12h14.2M13.4 6.6l5.4 5.4-5.4 5.4" {...stroke} />
    </svg>
  )
}

export function IconPin({ className }: IconProps) {
  return (
    <svg {...box} className={className}>
      <path d="M12 21c3.4-4.2 5.1-7.3 5.1-9.4a5.1 5.1 0 10-10.2 0c0 2.1 1.7 5.2 5.1 9.4z" {...stroke} />
      <circle cx="12" cy="11.4" r="1.9" {...stroke} />
    </svg>
  )
}
