import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import LineupForm from '../components/LineupForm';
import { addLineup } from '../api/lineups';
import { ServiceLineupInput } from '../types';

export default function AddLineup() {
  const navigate = useNavigate();

  async function handleSubmit(data: ServiceLineupInput) {
    try {
      const lineup = await addLineup(data);
      toast.success('Lineup created!');
      navigate(`/lineups/${lineup.id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || 'Failed to create lineup');
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-church-navy mb-6">Create Song Lineup</h1>

      <LineupForm
        submitLabel="Save Lineup"
        onSubmit={handleSubmit}
        onCancel={() => navigate('/lineups')}
      />
    </div>
  );
}