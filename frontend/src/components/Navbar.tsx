import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
/*import PaletteToggle from './PaletteToggle';*/

type IconName = 'home' | 'attendance' | 'dashboard' | 'songs' | 'lineup' | 'schedule' |'wheel';

const links: {
  to: string;
  label: string;
  shortLabel: string;
  icon: IconName;
  quick: boolean;
}[] = [
  { to: '/', label: 'Home', shortLabel: 'Home', icon: 'home', quick: true },
  { to: '/attendance', label: 'Attendance', shortLabel: 'Attend', icon: 'attendance', quick: true },
  { to: '/dashboard', label: 'Dashboard', shortLabel: 'Stats', icon: 'dashboard', quick: false },
  { to: '/songs', label: 'Songs', shortLabel: 'Songs', icon: 'songs', quick: true },
  { to: '/lineups', label: 'Lineup', shortLabel: 'Lineup', icon: 'lineup', quick: true },
  { to: '/schedules', label: 'Schedule', shortLabel: 'Sched', icon: 'schedule', quick: true },
  { to: '/wheel', label: 'Wheel', shortLabel: 'Wheel', icon: 'wheel', quick: false },
];

function NavIcon({ name, active }: { name: IconName; active: boolean }) {
  const className = `w-5 h-5 ${active ? 'text-white' : 'text-gray-500'}`;

  if (name === 'home') {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 12l9-9 9 9M5 10v10h14V10M9 20v-6h6v6"
        />
      </svg>
    );
  }

  if (name === 'attendance') {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 20h5v-2a4 4 0 00-4-4h-1M9 20H4v-2a4 4 0 014-4h1M12 12a4 4 0 100-8 4 4 0 000 8z"
        />
      </svg>
    );
  }

  if (name === 'dashboard') {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 19V5m0 14h16M8 17v-6m4 6V7m4 10v-3"
        />
      </svg>
    );
  }

  if (name === 'songs') {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"
        />
      </svg>
    );
  }

  if (name === 'schedule') {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7V3m8 4V3M4 11h16M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2zm3 10h.01M12 15h.01M16 15h.01"
        />
      </svg>
    );
  }

  if (name === 'wheel') {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 3v3m0 12v3m9-9h-3M6 12H3m15.364-6.364l-2.121 2.121M7.757 16.243l-2.121 2.121m12.728 0l-2.121-2.121M7.757 7.757L5.636 5.636M12 8a4 4 0 100 8 4 4 0 000-8z"
      />
    </svg>
  );
}

  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5h10M9 9h10M9 13h10M5 5h.01M5 9h.01M5 13h.01M4 19h16"
      />
    </svg>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  const quickLinks = links.filter(link => link.quick);

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
              <span className="text-white font-bold text-sm sm:text-base leading-tight block truncate max-w-[150px] sm:max-w-none">
                FGFT Church App
              </span>
              <span className="text-white/80 text-[11px] hidden sm:block">
                Attendance • Lyrics • Lineup
              </span>
            </div>
          </Link>

          {/* Desktop nav + palette toggle */}
          <div className="hidden md:flex items-center gap-2">
            <div className="flex items-center gap-1">
              {links.map(l => (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    isActive(l.to)
                      ? 'bg-[rgb(var(--color-surface))] text-primary shadow-sm'
                      : 'text-white hover:bg-primary-dark'
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </div>

           {/* <PaletteToggle /> */}
          </div>

          {/* Mobile palette toggle + hamburger */}
          <div className="md:hidden flex items-center gap-2">
           {/* <PaletteToggle /> */}

            <button
              className="text-white p-2 rounded-lg hover:bg-primary-dark transition-colors"
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
                      ? 'bg-[rgb(var(--color-surface))] text-primary shadow-sm'
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

      {/* Improved mobile bottom quick navigation */}
      <div className="no-print md:hidden fixed bottom-3 left-3 right-3 z-50">
        <div
          className="backdrop-blur border border-church-border rounded-2xl shadow-lg px-2 py-2"
          style={{ backgroundColor: 'rgb(var(--color-surface) / 0.95)' }}
        >
          <div className="grid grid-cols-5 gap-1">
            {quickLinks.map(l => {
              const active = isActive(l.to);

              return (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 transition-all ${
                    active
                      ? 'bg-primary text-white shadow-sm scale-[1.02]'
                      : 'text-gray-500 hover:bg-primary-light hover:text-primary'
                  }`}
                >
                  <NavIcon name={l.icon} active={active} />
                  <span
                    className={`text-[10px] font-bold leading-none ${
                      active ? 'text-white' : 'text-gray-500'
                    }`}
                  >
                    {l.shortLabel}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}