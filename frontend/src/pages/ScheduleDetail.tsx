import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fetchSchedule } from '../api/schedules';
import { ServiceSchedule } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

const MONTHS = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatDate(dateValue: string) {
  const dateOnly = String(dateValue).slice(0, 10);
  const date = new Date(`${dateOnly}T00:00:00`);

  return date.toLocaleDateString('en-PH', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ScheduleDetail() {
  const { id } = useParams<{ id: string }>();
  const [schedule, setSchedule] = useState<ServiceSchedule | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    fetchSchedule(id)
      .then(setSchedule)
      .catch(() => toast.error('Failed to load schedule'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner label="Loading schedule..." />;
  if (!schedule) return <p className="text-center text-gray-400 py-12">Schedule not found.</p>;

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-church-navy">{schedule.title}</h1>
          <p className="text-sm text-gray-500">
            {MONTHS[schedule.schedule_month]} {schedule.schedule_year}
          </p>
          {schedule.notes && <p className="text-sm text-gray-500 mt-1">{schedule.notes}</p>}
        </div>

        <div className="flex gap-2 flex-wrap">
          <Link to={`/schedules/${schedule.id}/edit`} className="btn-secondary text-xs">
            Edit
          </Link>

          <Link to={`/print/schedule/${schedule.id}`} target="_blank" className="btn-secondary text-xs">
            Export PDF
          </Link>

          <Link to="/schedules" className="btn-secondary text-xs">
            ← Back
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {schedule.dates.map(dateItem => (
          <div key={dateItem.id || dateItem.service_date} className="card">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
              <div>
                <p className="text-xs font-bold text-primary uppercase tracking-wide">
                  Sunday Service
                </p>
                <h2 className="text-lg font-bold text-church-navy">
                  {formatDate(dateItem.service_date)}
                </h2>
              </div>

              {dateItem.activity && (
                <div className="bg-primary-light rounded-xl px-3 py-2 sm:text-right">
                  <p className="text-[11px] text-gray-500">Activity</p>
                  <p className="font-bold text-primary text-sm">{dateItem.activity}</p>
                </div>
              )}
            </div>

            {dateItem.assignments.length === 0 ? (
              <p className="text-sm text-gray-400">No assignments for this Sunday.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {dateItem.assignments.map(assignment => (
                  <div
                    key={assignment.id}
                    className="bg-church-lightblue rounded-xl p-3"
                  >
                    <p className="text-xs font-bold text-primary uppercase tracking-wide">
                      {assignment.position}
                    </p>

                    <p className="font-bold text-church-navy">
                      {assignment.person_name}
                    </p>

                    {assignment.notes && (
                      <p className="text-xs text-gray-400 mt-1">{assignment.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}