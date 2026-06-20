import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { deleteLineup, fetchLineups } from '../api/lineups';
import { ServiceLineup } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatDatePH } from '../utils/csv';

export default function LineupList() {
  const [lineups, setLineups] = useState<ServiceLineup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLineups();
  }, []);

  async function loadLineups() {
    setLoading(true);
    try {
      const data = await fetchLineups();
      setLineups(data);
    } catch {
      toast.error('Failed to load lineups');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this lineup?')) return;

    try {
      await deleteLineup(id);
      toast.success('Lineup deleted');
      loadLineups();
    } catch {
      toast.error('Failed to delete lineup');
    }
  }

  if (loading) return <LoadingSpinner label="Loading lineups..." />;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-church-navy">Song Lineups</h1>
          <p className="text-sm text-gray-500">Prepare songs for each service.</p>
        </div>

        <Link to="/lineups/add" className="btn-primary">
          + New Lineup
        </Link>
      </div>

      {lineups.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-gray-500 mb-4">No lineups yet.</p>
          <Link to="/lineups/add" className="btn-primary">
            Create First Lineup
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {lineups.map(lineup => (
            <div key={lineup.id} className="card flex items-center justify-between gap-3 flex-wrap">
              <Link to={`/lineups/${lineup.id}`} className="flex-1">
                <h2 className="font-bold text-primary text-lg">{lineup.title}</h2>
                <p className="text-sm text-gray-500">
                  {formatDatePH(lineup.service_date)} · Song Leader: {lineup.song_leader}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {lineup.section_count || 0} sections · {lineup.song_count || 0} songs
                </p>
              </Link>

              <div className="flex gap-2">
                <Link to={`/lineups/${lineup.id}/edit`} className="btn-secondary text-xs">
                  Edit
                </Link>
                <button
                  onClick={() => handleDelete(lineup.id)}
                  className="btn-danger text-xs"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}