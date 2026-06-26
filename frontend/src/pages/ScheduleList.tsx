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

type ScheduleDateLike = {
  schedule_month: number | string;
  schedule_year: number | string;
};

const MONTH_NAME_TO_NUMBER: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

function getScheduleMonthNumber(schedule: ScheduleDateLike) {
  const rawMonth = schedule.schedule_month;

  if (typeof rawMonth === 'number') {
    return rawMonth;
  }

  const numberMonth = Number(rawMonth);

  if (!Number.isNaN(numberMonth) && numberMonth >= 1 && numberMonth <= 12) {
    return numberMonth;
  }

  return MONTH_NAME_TO_NUMBER[String(rawMonth).toLowerCase()] || 1;
}

function getScheduleYearNumber(schedule: ScheduleDateLike) {
  const year = Number(schedule.schedule_year);

  if (!Number.isNaN(year)) {
    return year;
  }

  return new Date().getFullYear();
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function subtractOneMonth(date: Date) {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() - 1);
  return copy;
}

function getScheduleStartDate(schedule: ScheduleDateLike) {
  const year = getScheduleYearNumber(schedule);
  const month = getScheduleMonthNumber(schedule);

  return new Date(year, month - 1, 1);
}

function getScheduleEndDate(schedule: ScheduleDateLike) {
  const year = getScheduleYearNumber(schedule);
  const month = getScheduleMonthNumber(schedule);

  return new Date(year, month, 0, 23, 59, 59, 999);
}

function getScheduleGroupOrder(schedule: ScheduleDateLike, today: Date) {
  const startDate = getScheduleStartDate(schedule);
  const endDate = getScheduleEndDate(schedule);

  const isCurrentMonth = startDate <= today && endDate >= today;
  const isFutureMonth = startDate > today;

  if (isCurrentMonth) return 0;
  if (isFutureMonth) return 1;

  return 2;
}

function getScheduleSortDate(schedule: ScheduleDateLike, today: Date) {
  const startDate = getScheduleStartDate(schedule);
  const endDate = getScheduleEndDate(schedule);

  const isCurrentMonth = startDate <= today && endDate >= today;
  const isFutureMonth = startDate > today;

  if (isCurrentMonth) {
    return today;
  }

  if (isFutureMonth) {
    return startDate;
  }

  return endDate;
}

function getVisibleSortedSchedules<T extends ScheduleDateLike>(schedules: T[]) {
  const today = startOfDay(new Date());
  const oneMonthAgo = subtractOneMonth(today);

  return [...schedules]
    .filter(schedule => {
      const scheduleEndDate = getScheduleEndDate(schedule);

      // Hide schedules older than 1 month from the main list.
      // This does not delete them from the database.
      return scheduleEndDate >= oneMonthAgo;
    })
    .sort((a, b) => {
      const groupA = getScheduleGroupOrder(a, today);
      const groupB = getScheduleGroupOrder(b, today);

      if (groupA !== groupB) {
        return groupA - groupB;
      }

      return getScheduleSortDate(a, today).getTime() - getScheduleSortDate(b, today).getTime();
    });
}


export default function ScheduleList() {
  const [schedules, setSchedules] = useState<ServiceSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  const visibleSchedules = getVisibleSortedSchedules(schedules);

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

      {visibleSchedules.length === 0 ? (
        <Link
          to="/schedules/add"
          className="card block text-center py-10 hover:shadow-md transition-shadow"
        >
          <p className="text-gray-500 mb-2">No schedules yet.</p>
          <p className="text-primary font-bold">Create first schedule</p>
        </Link>
      ) : (
        <div className="grid gap-3">
          {visibleSchedules.map(schedule => (
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