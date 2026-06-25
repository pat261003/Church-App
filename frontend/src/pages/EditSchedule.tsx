import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import ScheduleForm from '../components/ScheduleForm';
import LoadingSpinner from '../components/LoadingSpinner';
import { fetchSchedule, updateSchedule } from '../api/schedules';
import { ServiceSchedule, ServiceScheduleInput } from '../types';

export default function EditSchedule() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState<ServiceSchedule | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    fetchSchedule(id)
      .then(setSchedule)
      .catch(() => toast.error('Failed to load schedule'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(data: ServiceScheduleInput) {
    if (!id) return;

    try {
      const updated = await updateSchedule(id, data);
      toast.success('Schedule updated!');
      navigate(`/schedules/${updated.id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || 'Failed to update schedule');
    }
  }

  if (loading) return <LoadingSpinner label="Loading schedule..." />;
  if (!schedule) return <p className="text-center text-gray-400 py-12">Schedule not found.</p>;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-church-navy mb-6">Edit Service Schedule</h1>

      <ScheduleForm
        initialData={{
          title: schedule.title,
          schedule_month: schedule.schedule_month,
          schedule_year: schedule.schedule_year,
          notes: schedule.notes || '',
          dates: schedule.dates,
        }}
        submitLabel="Save Changes"
        onSubmit={handleSubmit}
        onCancel={() => navigate(`/schedules/${id}`)}
      />
    </div>
  );
}