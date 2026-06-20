import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="flex flex-col items-center gap-6 sm:gap-8 py-4 sm:py-6">
      {/* Hero */}
      <div className="text-center max-w-lg px-2">
        <img
          src="/logo.jpg"
          alt="FGFTI"
          className="mx-auto h-24 w-24 mb-4 rounded-full shadow-md bg-white object-cover"
        />

        <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-2">
          Full Gospel Faith Temple Inc.
        </h1>

        <p className="text-gray-500 text-sm">
          Church Attendance &amp; Lyrics System · Est. 1967
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl">
        <Link to="/attendance" className="card hover:shadow-md transition-shadow group active:scale-[0.99]">
          <div className="flex items-center gap-4">
            <div className="bg-primary-light p-3 rounded-xl shrink-0">
              <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>

            <div>
              <h2 className="font-bold text-church-navy text-lg group-hover:text-primary transition-colors">
                Attendance
              </h2>
              <p className="text-gray-500 text-sm">Record Sunday attendance</p>
            </div>
          </div>
        </Link>

        <Link to="/dashboard" className="card hover:shadow-md transition-shadow group active:scale-[0.99]">
          <div className="flex items-center gap-4">
            <div className="bg-primary-light p-3 rounded-xl shrink-0">
              <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>

            <div>
              <h2 className="font-bold text-church-navy text-lg group-hover:text-primary transition-colors">
                Dashboard
              </h2>
              <p className="text-gray-500 text-sm">View stats &amp; reports</p>
            </div>
          </div>
        </Link>

        <Link to="/songs" className="card hover:shadow-md transition-shadow group active:scale-[0.99]">
          <div className="flex items-center gap-4">
            <div className="bg-primary-light p-3 rounded-xl shrink-0">
              <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                />
              </svg>
            </div>

            <div>
              <h2 className="font-bold text-church-navy text-lg group-hover:text-primary transition-colors">
                Song Lyrics
              </h2>
              <p className="text-gray-500 text-sm">Browse &amp; transpose songs</p>
            </div>
          </div>
        </Link>

        <Link to="/lineups" className="card hover:shadow-md transition-shadow group active:scale-[0.99]">
          <div className="flex items-center gap-4">
            <div className="bg-primary-light p-3 rounded-xl shrink-0">
              <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5h6M9 9h6M9 13h6M5 5h.01M5 9h.01M5 13h.01M4 19h16"
                />
              </svg>
            </div>

            <div>
              <h2 className="font-bold text-church-navy text-lg group-hover:text-primary transition-colors">
                Song Lineup
              </h2>
              <p className="text-gray-500 text-sm">Prepare service songs</p>
            </div>
          </div>
        </Link>

        <Link to="/songs/add" className="card hover:shadow-md transition-shadow group active:scale-[0.99]">
          <div className="flex items-center gap-4">
            <div className="bg-primary-light p-3 rounded-xl shrink-0">
              <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>

            <div>
              <h2 className="font-bold text-church-navy text-lg group-hover:text-primary transition-colors">
                Add Song
              </h2>
              <p className="text-gray-500 text-sm">Add lyrics &amp; chords</p>
            </div>
          </div>
        </Link>

        <Link to="/lineups/add" className="card hover:shadow-md transition-shadow group active:scale-[0.99]">
          <div className="flex items-center gap-4">
            <div className="bg-primary-light p-3 rounded-xl shrink-0">
              <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v12m6-6H6"
                />
              </svg>
            </div>

            <div>
              <h2 className="font-bold text-church-navy text-lg group-hover:text-primary transition-colors">
                Create Lineup
              </h2>
              <p className="text-gray-500 text-sm">Set songs for service</p>
            </div>
          </div>
        </Link>
      </div>

      <p className="text-xs text-gray-400 mt-2 text-center px-4">
        Full Gospel Faith Temple Inc. · Since 1967 · Philippines
      </p>
    </div>
  );
}