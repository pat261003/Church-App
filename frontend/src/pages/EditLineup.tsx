import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import LineupForm from '../components/LineupForm';
import LoadingSpinner from '../components/LoadingSpinner';
import { fetchLineup, updateLineup } from '../api/lineups';
import { ServiceLineup, ServiceLineupInput } from '../types';

export default function EditLineup() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lineup, setLineup] = useState<ServiceLineup | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    fetchLineup(id)
      .then(setLineup)
      .catch(() => toast.error('Failed to load lineup'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(data: ServiceLineupInput) {
    if (!id) return;

    try {
      const updated = await updateLineup(id, data);
      toast.success('Lineup updated!');
      navigate(`/lineups/${updated.id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || 'Failed to update lineup');
    }
  }

  if (loading) return <LoadingSpinner label="Loading lineup..." />;
  if (!lineup) return <p className="text-center text-gray-400 py-12">Lineup not found.</p>;

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-church-navy mb-6">Edit Song Lineup</h1>

      <LineupForm
        initialData={{
          title: lineup.title,
          service_date: lineup.service_date,
          song_leader: lineup.song_leader,
          notes: lineup.notes || '',
          sections: lineup.sections,
        }}
        submitLabel="Save Changes"
        onSubmit={handleSubmit}
        onCancel={() => navigate(`/lineups/${id}`)}
      />
    </div>
  );
}