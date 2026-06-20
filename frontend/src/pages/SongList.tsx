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
        className="input-field"
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
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <Link to={`/songs/${s.id}`}
                    className="font-bold text-church-navy hover:text-primary transition-colors truncate block">
                    {s.title}
                  </Link>
                  {s.artist && <p className="text-sm text-gray-500">{s.artist}</p>}
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <span className="text-xs bg-primary-light text-primary px-2 py-0.5 rounded font-semibold">
                      Key: {s.current_key || s.original_key}
                    </span>
                    {s.tags && s.tags.split(',').map(t => (
                      <span key={t} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                        {t.trim()}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Link to={`/songs/${s.id}/edit`}
                    className="text-xs text-primary hover:underline">Edit</Link>
                  <button onClick={() => setDeleteTarget(s)}
                    className="text-xs text-red-500 hover:underline">Delete</button>
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
