import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import ScheduleForm from '../components/ScheduleForm';
import { addSchedule } from '../api/schedules';
import { ServiceScheduleInput } from '../types';

export default function AddSchedule() {
  const navigate = useNavigate();

  async function handleSubmit(data: ServiceScheduleInput) {
    try {
      const schedule = await addSchedule(data);
      toast.success('Schedule created!');
      navigate(`/schedules/${schedule.id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || 'Failed to create schedule');
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-church-navy mb-6">Create Service Schedule</h1>

      <ScheduleForm
        submitLabel="Save Schedule"
        onSubmit={handleSubmit}
        onCancel={() => navigate('/schedules')}
      />
    </div>
  );
}