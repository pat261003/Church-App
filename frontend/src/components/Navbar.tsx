import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const links = [
  { to: '/', label: 'Home' },
  { to: '/attendance', label: 'Attendance' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/songs', label: 'Songs' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <nav className="bg-primary shadow-md sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
        {/* Logo + Title */}
        <Link to="/" className="flex items-center gap-2 shrink-0" onClick={() => setOpen(false)}>
          <img src="/logo.jpg" alt="FGFT Logo" className="h-8 w-8 rounded-full object-cover" />
          <span className="text-white font-bold text-sm leading-tight hidden sm:block">
            FGFT Church App
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex gap-1">
          {links.map(l => (
            <Link
              key={l.to}
              to={l.to}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${pathname === l.to
                  ? 'bg-white text-primary'
                  : 'text-white hover:bg-primary-dark'}`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Hamburger */}
        <button
          className="md:hidden text-white p-1"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {open
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            }
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-primary-dark px-4 pb-3 flex flex-col gap-1">
          {links.map(l => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className={`px-3 py-2 rounded-lg text-sm font-medium
                ${pathname === l.to ? 'bg-white text-primary' : 'text-white hover:bg-primary'}`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
