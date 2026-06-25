import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchAttendance } from '../api/attendance';
import { AttendanceRecord } from '../types';
import { formatTimePH, formatDatePH } from '../utils/csv';

export default function PrintAttendance() {
  const [params] = useSearchParams();
  const date = params.get('date') || '';
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const printed = useRef(false);

  useEffect(() => {
    if (!date) return;
    fetchAttendance(date)
      .then(data => {
        setRecords(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [date]);

  useEffect(() => {
    if (!loading && records.length > 0 && !printed.current) {
      printed.current = true;
      setTimeout(() => window.print(), 400);
    }
  }, [loading, records]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Preparing print view...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto font-sans">
      {/* Header */}
      <div className="text-center mb-8 border-b-2 border-gray-300 pb-4">
        <div className="flex items-center justify-center gap-3 mb-2">
          <img src="/logo.png" alt="FGFTI" className="h-14 w-14 rounded-full" />
          <div className="text-left">
            <h1 className="text-xl font-bold text-gray-900">
              Full Gospel Faith Temple Inc.
            </h1>
            <p className="text-sm text-gray-500">Church Attendance Record · Est. 1967</p>
          </div>
        </div>
        <h2 className="text-lg font-semibold text-gray-700 mt-3">
          Sunday Attendance — {formatDatePH(date)}
        </h2>
        <p className="text-sm text-gray-500">Total Attendees: {records.length}</p>
      </div>

      {/* Table */}
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-3 py-2 text-left">#</th>
            <th className="border border-gray-300 px-3 py-2 text-left">Full Name</th>
            <th className="border border-gray-300 px-3 py-2 text-left">Age/Gender Group</th>
            <th className="border border-gray-300 px-3 py-2 text-left">Time Entered</th>
            <th className="border border-gray-300 px-3 py-2 text-left">Notes</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r, i) => (
            <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="border border-gray-300 px-3 py-2 text-gray-500">{i + 1}</td>
              <td className="border border-gray-300 px-3 py-2 font-medium">{r.full_name}</td>
              <td className="border border-gray-300 px-3 py-2 text-gray-600">
                {r.ministry_group || '—'}
              </td>
              <td className="border border-gray-300 px-3 py-2 text-gray-600">
                {formatTimePH(r.entered_at)}
              </td>
              <td className="border border-gray-300 px-3 py-2 text-gray-600">
                {r.notes || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-300 flex justify-between text-xs text-gray-400">
        <span>Full Gospel Faith Temple Inc.</span>
        <span>Printed: {new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</span>
      </div>

      {/* Print button (hidden when printing) */}
      <div className="mt-6 text-center no-print">
        <button
          onClick={() => window.print()}
          className="btn-primary"
        >
          Print / Save as PDF
        </button>
      </div>
    </div>
  );
}
