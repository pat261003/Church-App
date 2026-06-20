import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchLineup, fetchLineups } from '../api/lineups';
import { ServiceLineup } from '../types';

function getDateOnly(dateValue: string | null | undefined) {
  if (!dateValue) return '';

  return String(dateValue).slice(0, 10);
}

function getSafeDate(dateValue: string | null | undefined) {
  const dateOnly = getDateOnly(dateValue);

  if (!dateOnly) return null;

  const date = new Date(`${dateOnly}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function formatDate(dateValue: string | null | undefined) {
  const date = getSafeDate(dateValue);

  if (!date) return 'No date set';

  return date.toLocaleDateString('en-PH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function chooseFeaturedLineup(lineups: ServiceLineup[]) {
  if (lineups.length === 0) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const datedLineups = lineups
    .map(lineup => ({
      lineup,
      date: getSafeDate(lineup.service_date),
    }))
    .filter(item => item.date !== null) as {
      lineup: ServiceLineup;
      date: Date;
    }[];

  if (datedLineups.length === 0) return lineups[0];

  const upcoming = datedLineups
    .filter(item => item.date >= today)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (upcoming.length > 0) {
    return upcoming[0].lineup;
  }

  const latestPast = datedLineups.sort((a, b) => b.date.getTime() - a.date.getTime());

  return latestPast[0].lineup;
}

export default function Home() {
  const [featuredLineup, setFeaturedLineup] = useState<ServiceLineup | null>(null);
  const [loadingLineup, setLoadingLineup] = useState(true);

  useEffect(() => {
    async function loadFeaturedLineup() {
      try {
        const lineups = await fetchLineups();
        const selectedLineup = chooseFeaturedLineup(lineups);

        if (!selectedLineup) {
          setFeaturedLineup(null);
          return;
        }

        const fullLineup = await fetchLineup(selectedLineup.id);
        setFeaturedLineup(fullLineup);
      } catch (err) {
        console.error('Failed to load featured lineup:', err);
        setFeaturedLineup(null);
      } finally {
        setLoadingLineup(false);
      }
    }

    loadFeaturedLineup();
  }, []);

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

      {/* Featured Song Lineup */}
<div className="w-full max-w-4xl">
  {loadingLineup ? (
    <div className="card text-center">
      <p className="text-sm text-gray-500">Loading song lineup...</p>
    </div>
  ) : featuredLineup ? (
    <Link
      to={`/lineups/${featuredLineup.id}`}
      className="card block hover:shadow-lg transition-shadow active:scale-[0.99] border-l-4 border-primary overflow-hidden"
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div className="min-w-0">
          <p className="text-[11px] sm:text-xs font-bold text-primary uppercase tracking-wide mb-1">
            Current / Upcoming Song Lineup
          </p>

          <h2 className="text-lg sm:text-xl font-bold text-church-navy leading-tight break-words">
            {featuredLineup.title}
          </h2>

          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {formatDate(featuredLineup.service_date)}
          </p>
        </div>

        <div className="w-full sm:w-auto bg-primary-light px-3 py-2 rounded-xl sm:text-right">
          <p className="text-[11px] text-gray-500">Song Leader</p>
          <p className="font-bold text-primary text-base break-words">
            {featuredLineup.song_leader}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {featuredLineup.sections.map(section => (
          <div
            key={section.id || section.section_name}
            className="rounded-xl bg-church-lightblue/80 p-3 min-w-0"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-xs font-bold text-primary uppercase tracking-wide truncate">
                {section.section_name}
              </p>

              <span className="text-[10px] text-gray-500 bg-white px-2 py-0.5 rounded-full shrink-0">
                {section.songs.length} {section.songs.length === 1 ? 'song' : 'songs'}
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              {section.songs.map((song, index) => (
                <div
                  key={song.id || `${section.section_name}-${index}`}
                  className="bg-white rounded-lg px-2.5 py-2"
                >
                  <p className="text-sm font-semibold text-church-navy leading-snug break-words">
                    {index + 1}. {song.title || 'Untitled Song'}
                  </p>

                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Key: {song.key_override || song.current_key || song.original_key || '—'}
                    {song.artist ? ` · ${song.artist}` : ''}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-church-border flex items-center justify-between gap-2">
        <p className="text-[11px] sm:text-xs text-gray-400">
          Tap to open full lineup
        </p>

        <span className="text-xs font-bold text-primary">
          View →
        </span>
      </div>
    </Link>
  ) : (
    <Link
      to="/lineups/add"
      className="card block text-center hover:shadow-md transition-shadow active:scale-[0.99] border-l-4 border-primary"
    >
      <h2 className="text-lg font-bold text-church-navy mb-1">
        No Song Lineup Yet
      </h2>
      <p className="text-sm text-gray-500">
        Create a lineup so the song leader and songs appear here.
      </p>
    </Link>
  )}
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