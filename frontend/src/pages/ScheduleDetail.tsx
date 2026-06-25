import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fetchSchedule } from '../api/schedules';
import { ServiceSchedule, ServiceScheduleDate } from '../types';
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

function getClosestSundayDateKey(dates: ServiceScheduleDate[]) {
  if (dates.length === 0) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const datedItems = dates.map(dateItem => ({
    key: String(dateItem.service_date).slice(0, 10),
    date: new Date(`${String(dateItem.service_date).slice(0, 10)}T00:00:00`),
  }));

  const upcoming = datedItems
    .filter(item => item.date >= today)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (upcoming.length > 0) {
    return upcoming[0].key;
  }

  const latestPast = datedItems.sort((a, b) => b.date.getTime() - a.date.getTime());

  return latestPast[0].key;
}

export default function ScheduleDetail() {
  const { id } = useParams<{ id: string }>();
  const [schedule, setSchedule] = useState<ServiceSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [openDateKey, setOpenDateKey] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    fetchSchedule(id)
      .then(data => {
        setSchedule(data);
        setOpenDateKey(getClosestSundayDateKey(data.dates));
      })
      .catch(() => toast.error('Failed to load schedule'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner label="Loading schedule..." />;
  if (!schedule) return <p className="text-center text-gray-400 py-12">Schedule not found.</p>;

  const closestKey = getClosestSundayDateKey(schedule.dates);

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-church-navy break-words">
            {schedule.title}
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            {MONTHS[schedule.schedule_month]} {schedule.schedule_year}
          </p>

          {schedule.notes && (
            <p className="text-sm text-gray-500 mt-1">
              {schedule.notes}
            </p>
          )}

          <div className="flex gap-2 flex-wrap mt-3">
            <Link to="/schedules" className="btn-secondary text-xs">
              ← Back
            </Link>

            <Link to={`/schedules/${schedule.id}/edit`} className="btn-secondary text-xs">
              Edit
            </Link>

            <Link to={`/print/schedule/${schedule.id}`} className="btn-secondary text-xs">
              Print
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {schedule.dates.map(dateItem => {
          const dateKey = String(dateItem.service_date).slice(0, 10);
          const isOpen = openDateKey === dateKey;
          const assignedCount = dateItem.assignments.length;
          const isClosestSunday = closestKey === dateKey;

          return (
            <div key={dateItem.id || dateKey} className="card">
              <button
                type="button"
                onClick={() => setOpenDateKey(isOpen ? null : dateKey)}
                className="w-full text-left flex items-center justify-between gap-3"
              >
                <div>
                  <p className="text-xs font-bold text-primary uppercase tracking-wide">
                    Sunday Service
                  </p>

                  <h2 className="text-lg font-bold text-church-navy">
                    {formatDate(dateItem.service_date)}
                  </h2>

                  <p className="text-xs text-gray-400">
                    {assignedCount} assigned
                    {dateItem.activity ? ' · Has activity/notes' : ''}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  {isClosestSunday && (
                    <span className="text-[10px] bg-primary text-white px-2 py-1 rounded-full">
                      Closest
                    </span>
                  )}

                  <span className="text-primary font-bold text-lg">
                    {isOpen ? '▲' : '▼'}
                  </span>
                </div>
              </button>

              {isOpen && (
                <div className="mt-4 pt-4 border-t border-church-border flex flex-col gap-3">
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
                        </div>
                      ))}
                    </div>
                  )}

                  {dateItem.activity && (
                    <div className="bg-primary-light rounded-xl p-3">
                      <p className="text-xs font-bold text-primary uppercase tracking-wide">
                        Activity of the Day / Notes
                      </p>

                      <p className="font-semibold text-church-navy">
                        {dateItem.activity}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}