import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fetchSongs, searchSongs, deleteSong } from '../api/songs';
import { Song } from '../types';
import ConfirmModal from '../components/ConfirmModal';
import LoadingSpinner from '../components/LoadingSpinner';

export default function SongList() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Song | null>(null);

  useEffect(() => {
    loadSongs();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (search.trim()) handleSearch();
      else loadSongs();
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  async function loadSongs() {
    setLoading(true);
    try {
      const data = await fetchSongs();
      setSongs(data);
    } catch {
      toast.error('Failed to load songs');
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch() {
    setSearching(true);
    try {
      const data = await searchSongs(search);
      setSongs(data);
    } catch {
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteSong(deleteTarget.id);
      setSongs(prev => prev.filter(s => s.id !== deleteTarget.id));
      toast.success(`"${deleteTarget.title}" deleted`);
    } catch {
      toast.error('Failed to delete song');
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-church-navy">Song Library</h1>
        <Link to="/songs/add" className="btn-primary text-sm">+ Add Song</Link>
      </div>

      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by title, artist, or tag..."
        className="input-field-2"
      />

      {loading || searching ? (
        <LoadingSpinner label={searching ? 'Searching...' : 'Loading songs...'} />
      ) : songs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-2">🎵</p>
          <p className="mb-4">{search ? 'No songs found.' : 'No songs added yet.'}</p>
          {!search && <Link to="/songs/add" className="btn-primary text-sm">Add First Song</Link>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {songs.map(s => (
            <div key={s.id} className="card hover:shadow-md transition-shadow">
              <div className="flex flex-col gap-3">
                <div className="min-w-0">
                  <Link
                    to={`/songs/${s.id}`}
                    className="font-bold text-church-navy hover:text-primary transition-colors truncate block text-base"
                  >
                    {s.title}
                  </Link>

                  {s.artist && (
                    <p className="text-sm text-gray-500 mt-0.5">
                      {s.artist}
                    </p>
                  )}

                  <div className="flex gap-2 mt-2 flex-wrap">
                    <span className="text-xs bg-primary-light text-primary px-2 py-0.5 rounded-full font-semibold">
                      Key: {s.current_key || s.original_key}
                    </span>

                    {s.tags && s.tags.split(',').map(t => (
                      <span
                        key={t}
                        className="text-xs bg-[rgb(var(--color-surface))] border border-church-border text-gray-500 px-2 py-0.5 rounded-full"
                      >
                        {t.trim()}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-church-border">
                  <Link
                    to={`/songs/${s.id}`}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    Open Lyrics
                  </Link>

                  <div className="flex gap-2 flex-wrap">
                    <Link
                      to={`/songs/${s.id}/edit`}
                      className="inline-flex items-center justify-center gap-1.5 rounded-full border border-church-border px-3 py-1.5 text-xs font-bold text-primary transition-all duration-200 hover:bg-primary hover:text-white hover:shadow-sm active:scale-95 bg-[rgb(var(--color-surface))]"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                        />
                      </svg>
                      Edit
                    </Link>

                    <button
                      type="button"
                      onClick={() => setDeleteTarget(s)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-full border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 transition-all duration-200 hover:bg-red-500 hover:text-white hover:border-red-500 hover:shadow-sm active:scale-95 bg-[rgb(var(--color-surface))]"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m2 0H7m3-3h4a1 1 0 011 1v2H9V5a1 1 0 011-1z"
                        />
                      </svg>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete Song"
          message={`Delete "${deleteTarget.title}"? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          confirmLabel="Delete"
          danger
        />
      )}
    </div>
  );
}