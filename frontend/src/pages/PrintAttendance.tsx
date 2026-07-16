import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fetchAttendance, fetchMonthAttendance } from '../api/attendance';
import { AttendanceRecord } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatDatePH, formatTimePH, getTodayDate, getCurrentMonth } from '../utils/csv';
import { getAttendanceGroupCounts } from '../utils/attendanceGroups';

type AttendanceFilter = 'all' | 'adults' | 'youth' | 'kids';

const ATTENDANCE_FILTERS: { value: AttendanceFilter; label: string }[] = [
  { value: 'all', label: 'All Attendees' },
  { value: 'adults', label: 'Adults Only' },
  { value: 'youth', label: 'Youth Only' },
  { value: 'kids', label: 'Kids Only' },
];

function normalizeGroup(value?: string | null) {
  return String(value || '').trim().toLowerCase();
}

function isAdultGroup(value?: string | null) {
  const group = normalizeGroup(value);

  return (
    group === 'male' ||
    group === 'female' ||
    group === 'adult male' ||
    group === 'adult female'
  );
}

function isYouthGroup(value?: string | null) {
  const group = normalizeGroup(value);

  return group === 'male youth' || group === 'female youth';
}

function isKidGroup(value?: string | null) {
  const group = normalizeGroup(value);

  return group === 'male child' || group === 'female child';
}

function normalizeFilter(value?: string | null): AttendanceFilter {
  if (value === 'adults' || value === 'youth' || value === 'kids') {
    return value;
  }

  return 'all';
}

function filterAttendance(records: AttendanceRecord[], filter: AttendanceFilter) {
  if (filter === 'adults') {
    return records.filter(record => isAdultGroup(record.ministry_group));
  }

  if (filter === 'youth') {
    return records.filter(record => isYouthGroup(record.ministry_group));
  }

  if (filter === 'kids') {
    return records.filter(record => isKidGroup(record.ministry_group));
  }

  return records;
}

function getFilterLabel(filter: AttendanceFilter) {
  return ATTENDANCE_FILTERS.find(item => item.value === filter)?.label || 'All Attendees';
}

function getDateOnly(value: string) {
  return String(value || '').slice(0, 10);
}

function groupRecordsByDate(records: AttendanceRecord[]) {
  const grouped = new Map<string, AttendanceRecord[]>();

  records.forEach(record => {
    const date = getDateOnly(record.attendance_date);

    if (!grouped.has(date)) {
      grouped.set(date, []);
    }

    grouped.get(date)!.push(record);
  });

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dateRecords]) => ({
      date,
      records: dateRecords,
    }));
}

export default function PrintAttendance() {
  const [searchParams, setSearchParams] = useSearchParams();

  const today = getTodayDate();
  const currentMonth = getCurrentMonth();

  const dateParam = searchParams.get('date');
  const monthParam = Number(searchParams.get('month') || currentMonth.month);
  const yearParam = Number(searchParams.get('year') || currentMonth.year);
  const filter = normalizeFilter(searchParams.get('group'));

  const isMonthlyPrint = !dateParam;
  const targetDate = dateParam || today;

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const monthNames = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    setLoading(true);

    const request = isMonthlyPrint
      ? fetchMonthAttendance(monthParam, yearParam)
      : fetchAttendance(targetDate);

    request
      .then(setRecords)
      .catch(() => toast.error('Failed to load attendance for printing'))
      .finally(() => setLoading(false));
  }, [isMonthlyPrint, monthParam, yearParam, targetDate]);

  function updateFilter(nextFilter: AttendanceFilter) {
    const params = new URLSearchParams(searchParams);

    params.set('group', nextFilter);

    if (isMonthlyPrint) {
      params.delete('date');
      params.set('month', String(monthParam));
      params.set('year', String(yearParam));
    } else {
      params.set('date', targetDate);
    }

    setSearchParams(params);
  }

  const filteredRecords = filterAttendance(records, filter);
  const groupedRecords = groupRecordsByDate(filteredRecords);
  const counts = getAttendanceGroupCounts(filteredRecords);

  const title = isMonthlyPrint
    ? `${monthNames[monthParam]} ${yearParam} Attendance`
    : `${formatDatePH(targetDate)} Attendance`;

  if (loading) return <LoadingSpinner label="Loading print view..." />;

  return (
    <div className="max-w-5xl mx-auto bg-white text-black p-4 sm:p-8 print:p-0">
      <div className="no-print mb-6 flex flex-wrap gap-3 items-end justify-between">
        <div>
          <label className="text-xs text-gray-500 block mb-1">
            Print Filter
          </label>

          <select
            value={filter}
            onChange={e => updateFilter(e.target.value as AttendanceFilter)}
            className="input-field attendance-input-bordered w-full sm:w-auto"
          >
            {ATTENDANCE_FILTERS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button onClick={() => window.print()} className="btn-primary">
            Print / Save as PDF
          </button>

          <button onClick={() => window.history.back()} className="btn-secondary">
            Back
          </button>
        </div>
      </div>

      <div className="text-center border-b border-gray-300 pb-4 mb-4">
        <h1 className="text-2xl font-bold">Attendance Report</h1>

        <p className="text-sm mt-1">
          {title}
        </p>

        <p className="text-sm font-bold mt-1">
          {getFilterLabel(filter)}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm mb-5">
        <div className="border border-gray-300 rounded p-2">
          <p className="text-gray-500">Total</p>
          <p className="font-bold text-lg">{filteredRecords.length}</p>
        </div>

        <div className="border border-gray-300 rounded p-2">
          <p className="text-gray-500">Adults</p>
          <p className="font-bold text-lg">{counts.adultTotal}</p>
        </div>

        <div className="border border-gray-300 rounded p-2">
          <p className="text-gray-500">Youth</p>
          <p className="font-bold text-lg">{counts.youthTotal}</p>
        </div>

        <div className="border border-gray-300 rounded p-2">
          <p className="text-gray-500">Kids</p>
          <p className="font-bold text-lg">{counts.childrenTotal}</p>
        </div>
      </div>

      {filteredRecords.length === 0 ? (
        <p className="text-center text-gray-500 py-8">
          No attendance records found for this filter.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {groupedRecords.map(group => (
            <div key={group.date} className="break-inside-avoid">
              <div className="border border-gray-400 bg-gray-100 px-3 py-2">
                <h2 className="font-bold">
                  {formatDatePH(group.date)}
                  {filter !== 'all' ? ` (${getFilterLabel(filter).replace(' Only', '')})` : ''}
                </h2>

                <p className="text-xs text-gray-600">
                  {group.records.length} attendee{group.records.length !== 1 ? 's' : ''}
                </p>
              </div>

              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="border border-gray-300 text-left p-2 w-12">#</th>
                    <th className="border border-gray-300 text-left p-2">Name</th>
                    <th className="border border-gray-300 text-left p-2">Group</th>
                    <th className="border border-gray-300 text-left p-2">Time</th>
                    <th className="border border-gray-300 text-left p-2">Notes</th>
                  </tr>
                </thead>

                <tbody>
                  {group.records.map((record, index) => (
                    <tr key={record.id}>
                      <td className="border border-gray-300 p-2">{index + 1}</td>

                      <td className="border border-gray-300 p-2 font-medium">
                        {record.full_name}
                      </td>

                      <td className="border border-gray-300 p-2">
                        {record.ministry_group || '—'}
                      </td>

                      <td className="border border-gray-300 p-2">
                        {formatTimePH(record.entered_at)}
                      </td>

                      <td className="border border-gray-300 p-2">
                        {record.notes || ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 text-xs text-gray-500">
        Printed: {new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}
      </div>
    </div>
  );
}