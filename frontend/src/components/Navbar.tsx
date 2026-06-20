import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const links = [
  { to: '/', label: 'Home', shortLabel: 'Home' },
  { to: '/attendance', label: 'Attendance', shortLabel: 'Attend' },
  { to: '/dashboard', label: 'Dashboard', shortLabel: 'Stats' },
  { to: '/songs', label: 'Songs', shortLabel: 'Songs' },
  { to: '/lineups', label: 'Lineup', shortLabel: 'Lineup' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  function isActive(to: string) {
    if (to === '/') return pathname === '/';
    return pathname.startsWith(to);
  }

  return (
    <>
      <nav className="no-print bg-primary shadow-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 flex items-center justify-between h-16">
          {/* Logo + Title */}
          <Link
            to="/"
            className="flex items-center gap-2 min-w-0"
            onClick={() => setOpen(false)}
          >
            <img
              src="/logo.jpg"
              alt="FGFT Logo"
              className="h-10 w-10 rounded-full object-cover bg-white shrink-0 ring-2 ring-white/70"
            />

            <div className="min-w-0">
              <span className="text-white font-bold text-sm sm:text-base leading-tight block truncate max-w-[190px] sm:max-w-none">
                FGFT Church App
              </span>
              <span className="text-white/80 text-[11px] hidden sm:block">
                Attendance • Lyrics • Lineup
              </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {links.map(l => (
              <Link
                key={l.to}
                to={l.to}
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  isActive(l.to)
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-white hover:bg-primary-dark'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* Hamburger */}
          <button
            className="md:hidden text-white p-2 rounded-lg hover:bg-primary-dark transition-colors"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {open ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile dropdown menu */}
        {open && (
          <div className="md:hidden bg-primary-dark px-3 pb-3 border-t border-white/10">
            <div className="grid grid-cols-2 gap-2 pt-3">
              {links.map(l => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className={`px-3 py-3 rounded-xl text-sm font-semibold text-center transition-colors ${
                    isActive(l.to)
                      ? 'bg-white text-primary shadow-sm'
                      : 'bg-primary text-white hover:bg-white/10'
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Mobile bottom quick navigation */}
      <div className="no-print md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-church-border shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
        <div className="grid grid-cols-5">
          {links.map(l => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className={`py-2.5 text-center text-[11px] font-bold transition-colors ${
                isActive(l.to)
                  ? 'text-primary bg-primary-light'
                  : 'text-gray-500 hover:text-primary'
              }`}
            >
              {l.shortLabel}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}