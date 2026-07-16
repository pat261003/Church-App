import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  fetchStats,
  fetchAttendance,
  fetchMonthAttendance,
  getCSVUrl,
  getXLSXUrl,
  getPrintAttendanceUrl,
} from '../api/attendance';
import { AttendanceStats, AttendanceRecord } from '../types';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatTimePH, formatDatePH, getTodayDate, getCurrentMonth } from '../utils/csv';
import { Link } from 'react-router-dom';
import {
  ATTENDANCE_PRINT_GROUPS,
  filterAttendanceByPrintGroup,
  getAttendanceGroupCounts,
  getAttendancePrintGroupLabel,
  type AttendancePrintGroup,
} from '../utils/attendanceGroups';

function toDateInputValue(value: string) {
  return String(value || '').slice(0, 10);
}

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
  const [printGroup, setPrintGroup] = useState<AttendancePrintGroup>('all');

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

  function handleSundayClick(sundayDate: string) {
    const selectedDate = toDateInputValue(sundayDate);

    if (!selectedDate) return;

    setDate(selectedDate);

    const parsedDate = new Date(`${selectedDate}T00:00:00`);

    if (!Number.isNaN(parsedDate.getTime())) {
      setMonth(parsedDate.getMonth() + 1);
      setYear(parsedDate.getFullYear());
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const monthNames = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const groupCounts = getAttendanceGroupCounts(records);
  const monthGroupCounts = getAttendanceGroupCounts(monthRecords);
  const printableRecords = filterAttendanceByPrintGroup(records, printGroup);

  const safeStats = stats;
  const sundayMax = stats?.sundayStats?.length
    ? Math.max(...stats.sundayStats.map(x => parseInt(String(x.count), 10) || 0))
    : 0;

  if (loading) return <LoadingSpinner label="Loading dashboard..." />;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-church-navy">Attendance Dashboard</h1>

      {/* Date picker row */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Select Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="input-field w-auto"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 block mb-1">Month</label>
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            className="input-field w-auto"
          >
            {monthNames.slice(1).map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-500 block mb-1">Year</label>
          <input
            type="number"
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="input-field w-24"
            min={2020}
            max={2099}
          />
        </div>
      </div>

      {/* Stats cards */}
      {safeStats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <StatCard label="Today's Attendance" value={safeStats.todayCount} />

          <StatCard
            label={`Attendance on ${date}`}
            value={records.length}
            color="bg-blue-400"
          />

          <StatCard
            label="Adults Total"
            value={groupCounts.adultTotal}
            color="bg-purple-400"
          />

          <StatCard
            label="Adult Male"
            value={groupCounts.adultMale}
            color="bg-indigo-400"
          />

          <StatCard
            label="Adult Female"
            value={groupCounts.adultFemale}
            color="bg-pink-400"
          />

          <StatCard
            label="Youth Total"
            value={groupCounts.youthTotal}
            color="bg-green-400"
          />

          <StatCard
            label="Male Youth"
            value={groupCounts.maleYouth}
            color="bg-blue-500"
          />

          <StatCard
            label="Female Youth"
            value={groupCounts.femaleYouth}
            color="bg-pink-500"
          />

          <StatCard
            label="Kids Total"
            value={groupCounts.childrenTotal}
            color="bg-orange-400"
          />

          <StatCard
            label="Male Children"
            value={groupCounts.maleChild}
            color="bg-blue-300"
          />

          <StatCard
            label="Female Children"
            value={groupCounts.femaleChild}
            color="bg-pink-300"
          />

          <StatCard
            label="Male Total"
            value={groupCounts.male}
            color="bg-indigo-300"
          />

          <StatCard
            label="Female Total"
            value={groupCounts.female}
            color="bg-pink-300"
          />

          <StatCard
            label={`${monthNames[month]} ${year}`}
            value={safeStats.monthCount}
            color="bg-green-400"
          />

          <StatCard
            label="Monthly Adults"
            value={monthGroupCounts.adultTotal}
            color="bg-purple-300"
          />

          <StatCard
            label="Monthly Youth"
            value={monthGroupCounts.youthTotal}
            color="bg-green-300"
          />

          <StatCard
            label="Monthly Kids"
            value={monthGroupCounts.childrenTotal}
            color="bg-orange-300"
          />

          <StatCard
            label="Earliest Attendee"
            value={safeStats.earliest?.full_name || '—'}
            sub={safeStats.earliest ? formatTimePH(safeStats.earliest.entered_at) : undefined}
            color="bg-yellow-400"
          />
        </div>
      )}

      {/* Sunday stats */}
      {stats && stats.sundayStats.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-primary mb-1">Sunday Attendance History</h2>
          <p className="text-xs text-gray-400 mb-4">
            Click a Sunday to load its full attendance and adult/youth/kids breakdown above.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-church-border">
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Sunday</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Attendees</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Bar</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Action</th>
                </tr>
              </thead>

              <tbody>
                {stats.sundayStats.map(s => {
                  const count = parseInt(String(s.count), 10) || 0;
                  const pct = sundayMax > 0 ? Math.round((count / sundayMax) * 100) : 0;
                  const sundayDate = toDateInputValue(s.attendance_date);
                  const isSelected = sundayDate === date;

                  return (
                    <tr
                      key={s.attendance_date}
                      className={`border-b border-church-border/50 cursor-pointer transition-colors ${
                        isSelected ? 'bg-primary-light' : 'hover:bg-primary-light'
                      }`}
                      onClick={() => handleSundayClick(s.attendance_date)}
                    >
                      <td className="py-2 px-3">
                        <div className="font-medium text-church-navy">
                          {formatDatePH(s.attendance_date)}
                        </div>

                        {isSelected && (
                          <div className="text-[11px] text-primary font-semibold">
                            Selected
                          </div>
                        )}
                      </td>

                      <td className="py-2 px-3 font-bold text-primary">{s.count}</td>

                      <td className="py-2 px-3">
                        <div className="h-3 bg-church-border rounded-full overflow-hidden w-full max-w-32">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>

                      <td className="py-2 px-3">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            handleSundayClick(s.attendance_date);
                          }}
                          className="btn-secondary text-xs"
                        >
                          View
                        </button>
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
          <div>
            <h2 className="font-semibold text-primary">
              Attendance for {formatDatePH(date)} ({records.length})
            </h2>

            <p className="text-xs text-gray-400 mt-1">
              Adults: {groupCounts.adultTotal} · Youth: {groupCounts.youthTotal} · Kids: {groupCounts.childrenTotal}
            </p>
          </div>

          <div className="flex gap-2 flex-wrap items-end">
            <div>
              <label className="text-[11px] text-gray-500 block mb-1">
                Print Option
              </label>

              <select
                value={printGroup}
                onChange={e => setPrintGroup(e.target.value as AttendancePrintGroup)}
                className="input-field text-xs w-full sm:w-auto"
              >
                {ATTENDANCE_PRINT_GROUPS.map(group => (
                  <option key={group.value} value={group.value}>
                    {group.label}
                  </option>
                ))}
              </select>
            </div>

            <button onClick={handleCSVDate} className="btn-secondary text-xs">
              Export Date CSV
            </button>

            <button onClick={handleXLSXDate} className="btn-secondary text-xs">
              Export Date XLSX
            </button>

            <Link
              to={getPrintAttendanceUrl(date, printGroup)}
              className="btn-secondary text-xs"
            >
              Print {getAttendancePrintGroupLabel(printGroup)}
            </Link>
          </div>
        </div>

        {records.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No attendance yet for this date.</p>
        ) : (
          <>
            <div className="mb-3 rounded-lg bg-church-lightblue p-3 text-xs text-gray-500">
              Print preview option selected:{' '}
              <span className="font-bold text-primary">
                {getAttendancePrintGroupLabel(printGroup)}
              </span>{' '}
              ({printableRecords.length} attendee{printableRecords.length !== 1 ? 's' : ''})
            </div>

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
          </>
        )}
      </div>

      {/* Monthly summary */}
      <div className="card">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <h2 className="font-semibold text-primary">
              {monthNames[month]} {year} Summary ({monthRecords.length} total)
            </h2>

            <p className="text-xs text-gray-400 mt-1">
              Adults: {monthGroupCounts.adultTotal} · Youth: {monthGroupCounts.youthTotal} · Kids: {monthGroupCounts.childrenTotal}
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button onClick={handleCSVMonth} className="btn-secondary text-xs">
              Export Month CSV
            </button>

            <button onClick={handleXLSXMonth} className="btn-secondary text-xs">
              Export Month XLSX
            </button>
          </div>
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