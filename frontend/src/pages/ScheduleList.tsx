import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { deleteSchedule, fetchSchedules } from '../api/schedules';
import { ServiceSchedule } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

const MONTHS = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function ScheduleList() {
  const [schedules, setSchedules] = useState<ServiceSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSchedules();
  }, []);

  async function loadSchedules() {
    setLoading(true);
    try {
      const data = await fetchSchedules();
      setSchedules(data);
    } catch {
      toast.error('Failed to load schedules');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this schedule?')) return;

    try {
      await deleteSchedule(id);
      toast.success('Schedule deleted');
      loadSchedules();
    } catch {
      toast.error('Failed to delete schedule');
    }
  }

  if (loading) return <LoadingSpinner label="Loading schedules..." />;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-church-navy">Service Schedules</h1>
          <p className="text-sm text-gray-500">Manage Sunday service assignments.</p>
        </div>

        <Link to="/schedules/add" className="btn-primary">
          + New Schedule
        </Link>
      </div>

      {schedules.length === 0 ? (
        <Link
          to="/schedules/add"
          className="card block text-center py-10 hover:shadow-md transition-shadow"
        >
          <p className="text-gray-500 mb-2">No schedules yet.</p>
          <p className="text-primary font-bold">Create first schedule</p>
        </Link>
      ) : (
        <div className="grid gap-3">
          {schedules.map(schedule => (
            <div key={schedule.id} className="card flex items-center justify-between gap-3 flex-wrap">
              <Link to={`/schedules/${schedule.id}`} className="flex-1">
                <h2 className="font-bold text-primary text-lg">{schedule.title}</h2>
                <p className="text-sm text-gray-500">
                  {MONTHS[schedule.schedule_month]} {schedule.schedule_year}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {schedule.service_count || 0} Sundays · {schedule.assignment_count || 0} assignments
                </p>
              </Link>

              <div className="flex gap-2">
                <Link to={`/schedules/${schedule.id}/edit`} className="btn-secondary text-xs">
                  Edit
                </Link>

                <Link to={`/print/schedule/${schedule.id}`} className="btn-secondary text-xs">
                  PDF
                </Link>

                <button
                  onClick={() => handleDelete(schedule.id)}
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