import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { fetchStats, fetchAttendance, fetchMonthAttendance, getCSVUrl, getXLSXUrl } from '../api/attendance';
import { AttendanceStats, AttendanceRecord } from '../types';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatTimePH, formatDatePH, getTodayDate, getCurrentMonth } from '../utils/csv';
import { Link } from 'react-router-dom';

export default function AttendanceDashboard() {
  const today = getTodayDate();
  const { month: curMonth, year: curYear } = getCurrentMonth();

  const [date, setDate] = useState(today);
  const [month, setMonth] = useState(curMonth);
  const [year, setYear] = useState(curYear);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [monthRecords, setMonthRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, [date, month, year]);

  async function loadAll() {
    setLoading(true);
    try {
      const [s, r, m] = await Promise.all([
        fetchStats(date),
        fetchAttendance(date),
        fetchMonthAttendance(month, year),
      ]);
      setStats(s);
      setRecords(r);
      setMonthRecords(m);
    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }

  function handleCSVDate() {
    window.open(getCSVUrl(date), '_blank');
  }

  function handleCSVMonth() {
    window.open(getCSVUrl(undefined, month, year), '_blank');
  }

  function handleXLSXDate() {
  window.open(getXLSXUrl(date), '_blank');
}

function handleXLSXMonth() {
  window.open(getXLSXUrl(undefined, month, year), '_blank');
}
  const monthNames = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  if (loading) return <LoadingSpinner label="Loading dashboard..." />;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-church-navy">Attendance Dashboard</h1>

      {/* Date picker row */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Select Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="input-field w-auto" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Month</label>
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            className="input-field w-auto">
            {monthNames.slice(1).map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Year</label>
          <input type="number" value={year} onChange={e => setYear(Number(e.target.value))}
            className="input-field w-24" min={2020} max={2099} />
        </div>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Today's Attendance" value={stats.todayCount} />
          <StatCard label={`Attendance on ${date}`} value={stats.dateCount} color="bg-blue-400" />
          <StatCard label={`${monthNames[month]} ${year}`} value={stats.monthCount} color="bg-green-400" />
          <StatCard
            label="Earliest Attendee"
            value={stats.earliest?.full_name || '—'}
            sub={stats.earliest ? formatTimePH(stats.earliest.entered_at) : undefined}
            color="bg-yellow-400"
          />
        </div>
      )}

      {/* Sunday stats */}
      {stats && stats.sundayStats.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-primary mb-4">Sunday Attendance History</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-church-border">
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Sunday</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Attendees</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Bar</th>
                </tr>
              </thead>
              <tbody>
                {stats.sundayStats.map(s => {
                  const max = Math.max(...stats.sundayStats.map(x => parseInt(x.count)));
                  const pct = Math.round((parseInt(s.count) / max) * 100);
                  return (
                    <tr key={s.attendance_date} className="border-b border-church-border/50">
                      <td className="py-2 px-3">{formatDatePH(s.attendance_date)}</td>
                      <td className="py-2 px-3 font-bold text-primary">{s.count}</td>
                      <td className="py-2 px-3">
                        <div className="h-3 bg-church-border rounded-full overflow-hidden w-full max-w-32">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Attendees for selected date */}
      <div className="card">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h2 className="font-semibold text-primary">
            Attendance for {formatDatePH(date)} ({records.length})
          </h2>
          <div className="flex gap-2 flex-wrap">
            <button onClick={handleCSVDate} className="btn-secondary text-xs">
              Export Date CSV
            </button>
            <button onClick={handleXLSXDate} className="btn-secondary text-xs">
              Export Date XLSX
            </button>
            <Link
              to={`/print/attendance?date=${date}`}
              target="_blank"
              className="btn-secondary text-xs"
            >
              Print
            </Link>
          </div>
        </div>

        {records.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No attendance yet for this date.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-church-border">
                  <th className="text-left py-2 px-3 text-gray-500">#</th>
                  <th className="text-left py-2 px-3 text-gray-500">Name</th>
                  <th className="text-left py-2 px-3 text-gray-500 hidden sm:table-cell">Group</th>
                  <th className="text-left py-2 px-3 text-gray-500">Time</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr key={r.id} className="border-b border-church-border/50 hover:bg-primary-light">
                    <td className="py-2 px-3 text-gray-400">{i + 1}</td>
                    <td className="py-2 px-3 font-medium">{r.full_name}</td>
                    <td className="py-2 px-3 text-gray-500 hidden sm:table-cell">
                      {r.ministry_group || '—'}
                    </td>
                    <td className="py-2 px-3 text-gray-500">{formatTimePH(r.entered_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Monthly summary */}
      <div className="card">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h2 className="font-semibold text-primary">
            {monthNames[month]} {year} Summary ({monthRecords.length} total)
          </h2>
          <button onClick={handleCSVMonth} className="btn-secondary text-xs">
            Export Month CSV
          </button>
          <button onClick={handleXLSXMonth} className="btn-secondary text-xs">
            Export Month XLSX
          </button>
        </div>

        {monthRecords.length === 0 ? (
          <p className="text-center text-gray-400 py-6">No records for this month.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-church-border">
                  <th className="text-left py-2 px-3 text-gray-500">Name</th>
                  <th className="text-left py-2 px-3 text-gray-500">Date</th>
                  <th className="text-left py-2 px-3 text-gray-500 hidden sm:table-cell">Group</th>
                  <th className="text-left py-2 px-3 text-gray-500">Time</th>
                </tr>
              </thead>
              <tbody>
                {monthRecords.map(r => (
                  <tr key={r.id} className="border-b border-church-border/50 hover:bg-primary-light">
                    <td className="py-2 px-3 font-medium">{r.full_name}</td>
                    <td className="py-2 px-3 text-gray-500">{formatDatePH(r.attendance_date)}</td>
                    <td className="py-2 px-3 text-gray-500 hidden sm:table-cell">
                      {r.ministry_group || '—'}
                    </td>
                    <td className="py-2 px-3 text-gray-500">{formatTimePH(r.entered_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
