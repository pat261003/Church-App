import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fetchAttendance } from '../api/attendance';
import { AttendanceRecord } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatDatePH, formatTimePH, getTodayDate } from '../utils/csv';
import {
  ATTENDANCE_PRINT_GROUPS,
  filterAttendanceByPrintGroup,
  getAttendanceGroupCounts,
  getAttendancePrintGroupLabel,
  normalizeAttendancePrintGroup,
  type AttendancePrintGroup,
} from '../utils/attendanceGroups';

export default function PrintAttendance() {
  const [searchParams, setSearchParams] = useSearchParams();

  const date = searchParams.get('date') || getTodayDate();
  const group = normalizeAttendancePrintGroup(searchParams.get('group'));

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    fetchAttendance(date)
      .then(setRecords)
      .catch(() => toast.error('Failed to load attendance for printing'))
      .finally(() => setLoading(false));
  }, [date]);

  const printableRecords = useMemo(
    () => filterAttendanceByPrintGroup(records, group),
    [records, group]
  );

  const counts = getAttendanceGroupCounts(printableRecords);

  function updateGroup(nextGroup: AttendancePrintGroup) {
    const params = new URLSearchParams(searchParams);

    params.set('date', date);
    params.set('group', nextGroup);

    setSearchParams(params);
  }

  if (loading) return <LoadingSpinner label="Loading print view..." />;

  return (
    <div className="max-w-4xl mx-auto bg-white text-black p-4 sm:p-8 print:p-0">
      <div className="no-print mb-6 flex flex-wrap gap-2 items-end justify-between">
        <div>
          <label className="text-xs text-gray-500 block mb-1">
            Print Group
          </label>

          <select
            value={group}
            onChange={e => updateGroup(e.target.value as AttendancePrintGroup)}
            className="input-field w-full sm:w-auto"
          >
            {ATTENDANCE_PRINT_GROUPS.map(option => (
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

          <Link to="/attendance/dashboard" className="btn-secondary">
            Back to Dashboard
          </Link>
        </div>
      </div>

      <div className="text-center border-b border-gray-300 pb-4 mb-4">
        <h1 className="text-2xl font-bold">Attendance List</h1>

        <p className="text-sm mt-1">
          {formatDatePH(date)}
        </p>

        <p className="text-sm font-bold mt-1">
          {getAttendancePrintGroupLabel(group)}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm mb-4">
        <div className="border border-gray-300 rounded p-2">
          <p className="text-gray-500">Total</p>
          <p className="font-bold text-lg">{printableRecords.length}</p>
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

      {printableRecords.length === 0 ? (
        <p className="text-center text-gray-500 py-8">
          No attendance found for this print option.
        </p>
      ) : (
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
            {printableRecords.map((record, index) => (
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
      )}

      <div className="mt-8 text-xs text-gray-500">
        Printed: {new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}
      </div>
    </div>
  );
}