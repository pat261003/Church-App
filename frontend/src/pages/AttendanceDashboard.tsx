import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { fetchStats, fetchAttendance, fetchMonthAttendance, getCSVUrl, getXLSXUrl } from '../api/attendance';
import { AttendanceStats, AttendanceRecord } from '../types';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatTimePH, formatDatePH, getTodayDate, getCurrentMonth } from '../utils/csv';
import { Link } from 'react-router-dom';
import { getAttendanceGroupCounts } from '../utils/attendanceGroups';

type AttendanceFilter = 'all' | 'adults' | 'youth' | 'kids';

const ATTENDANCE_FILTERS: { value: AttendanceFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'adults', label: 'Adults' },
  { value: 'youth', label: 'Youth' },
  { value: 'kids', label: 'Kids' },
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
  return ATTENDANCE_FILTERS.find(item => item.value === filter)?.label || 'All';
}

function getFilterSuffix(filter: AttendanceFilter) {
  return filter === 'all' ? '' : ` (${getFilterLabel(filter)})`;
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

function getPrintUrl({
  date,
  month,
  year,
  filter,
}: {
  date?: string;
  month?: number;
  year?: number;
  filter: AttendanceFilter;
}) {
  const params = new URLSearchParams();

  if (date) {
    params.set('date', date);
  }

  if (month && year) {
    params.set('month', String(month));
    params.set('year', String(year));
  }

  params.set('group', filter);

  return `/print/attendance?${params.toString()}`;
}

function AttendanceFilterSelect({
  value,
  onChange,
}: {
  value: AttendanceFilter;
  onChange: (value: AttendanceFilter) => void;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as AttendanceFilter)}
      className="input-field attendance-input-bordered text-xs w-full sm:w-auto"
    >
      {ATTENDANCE_FILTERS.map(filter => (
        <option key={filter.value} value={filter.value}>
          {filter.label}
        </option>
      ))}
    </select>
  );
}

function AttendanceRecordsTable({
  records,
  startAt = 1,
}: {
  records: AttendanceRecord[];
  startAt?: number;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-300">
            <th className="text-left py-2 px-3 text-gray-500">#</th>
            <th className="text-left py-2 px-3 text-gray-500">Name</th>
            <th className="text-left py-2 px-3 text-gray-500">Group</th>
            <th className="text-left py-2 px-3 text-gray-500">Time</th>
            <th className="text-left py-2 px-3 text-gray-500 hidden md:table-cell">Notes</th>
          </tr>
        </thead>

        <tbody>
          {records.map((record, index) => (
            <tr key={record.id} className="border-b border-slate-200 hover:bg-primary-light">
              <td className="py-2 px-3 text-gray-400">{startAt + index}</td>

              <td className="py-2 px-3 font-medium">
                {record.full_name}
              </td>

              <td className="py-2 px-3 text-gray-500">
                {record.ministry_group || '—'}
              </td>

              <td className="py-2 px-3 text-gray-500 whitespace-nowrap">
                {formatTimePH(record.entered_at)}
              </td>

              <td className="py-2 px-3 text-gray-500 hidden md:table-cell">
                {record.notes || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
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

  const [dateFilter, setDateFilter] = useState<AttendanceFilter>('all');
  const [monthFilter, setMonthFilter] = useState<AttendanceFilter>('all');

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
    const selectedDate = getDateOnly(sundayDate);

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

  const filteredDateRecords = filterAttendance(records, dateFilter);
  const filteredMonthRecords = filterAttendance(monthRecords, monthFilter);
  const groupedMonthRecords = groupRecordsByDate(filteredMonthRecords);

  const filteredDateCounts = getAttendanceGroupCounts(filteredDateRecords);
  const filteredMonthCounts = getAttendanceGroupCounts(filteredMonthRecords);

  const safeStats = stats;

  const sundayMax = stats?.sundayStats?.length
    ? Math.max(...stats.sundayStats.map(item => parseInt(String(item.count), 10) || 0))
    : 0;

  if (loading) return <LoadingSpinner label="Loading dashboard..." />;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-church-navy">Attendance Dashboard</h1>

      {/* Date picker row */}
      <div className="card attendance-bordered-card">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Select Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="input-field attendance-input-bordered w-auto"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Month</label>
            <select
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
              className="input-field attendance-input-bordered w-auto"
            >
              {monthNames.slice(1).map((m, i) => (
                <option key={i + 1} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Year</label>
            <input
              type="number"
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="input-field attendance-input-bordered w-24"
              min={2020}
              max={2099}
            />
          </div>
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
        <div className="card attendance-bordered-card">
          <h2 className="font-semibold text-primary mb-1">Sunday Attendance History</h2>
          <p className="text-xs text-gray-400 mb-4">
            Click a Sunday to load that date and see its adults, youth, and kids breakdown.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-300">
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
                  const sundayDate = getDateOnly(s.attendance_date);
                  const selected = sundayDate === date;

                  return (
                    <tr
                      key={s.attendance_date}
                      onClick={() => handleSundayClick(s.attendance_date)}
                      className={`border-b border-slate-200 cursor-pointer transition-colors ${
                        selected ? 'bg-primary-light' : 'hover:bg-primary-light'
                      }`}
                    >
                      <td className="py-2 px-3">
                        <div className="font-medium">{formatDatePH(s.attendance_date)}</div>
                        {selected && (
                          <div className="text-[11px] text-primary font-bold">
                            Selected
                          </div>
                        )}
                      </td>

                      <td className="py-2 px-3 font-bold text-primary">{s.count}</td>

                      <td className="py-2 px-3">
                        <div className="h-3 bg-slate-200 rounded-full overflow-hidden w-full max-w-32">
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
      <div className="card attendance-bordered-card">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <h2 className="font-semibold text-primary">
              {formatDatePH(date)}
              {getFilterSuffix(dateFilter)}
            </h2>

            <p className="text-xs text-gray-400 mt-1">
              Showing {filteredDateRecords.length} of {records.length} attendee{records.length !== 1 ? 's' : ''}
            </p>

            <p className="text-xs text-gray-400 mt-1">
              Adults: {filteredDateCounts.adultTotal} · Youth: {filteredDateCounts.youthTotal} · Kids: {filteredDateCounts.childrenTotal}
            </p>
          </div>

          <div className="flex gap-2 flex-wrap items-end">
            <div>
              <label className="text-[11px] text-gray-500 block mb-1">
                Date Filter
              </label>

              <AttendanceFilterSelect
                value={dateFilter}
                onChange={setDateFilter}
              />
            </div>

            <button onClick={handleCSVDate} className="btn-secondary text-xs">
              Export Date CSV
            </button>

            <button onClick={handleXLSXDate} className="btn-secondary text-xs">
              Export Date XLSX
            </button>

            <Link
              to={getPrintUrl({ date, filter: dateFilter })}
              className="btn-secondary text-xs"
            >
              Print {getFilterLabel(dateFilter)}
            </Link>
          </div>
        </div>

        {records.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No attendance yet for this date.</p>
        ) : filteredDateRecords.length === 0 ? (
          <p className="text-center text-gray-400 py-8">
            No {getFilterLabel(dateFilter).toLowerCase()} attendance for this date.
          </p>
        ) : (
          <div className="rounded-xl border border-slate-300 overflow-hidden">
            <div className="bg-church-lightblue border-b border-slate-300 px-3 py-2">
              <h3 className="font-bold text-primary">
                {formatDatePH(date)}
                {getFilterSuffix(dateFilter)}
              </h3>
            </div>

            <AttendanceRecordsTable records={filteredDateRecords} />
          </div>
        )}
      </div>

      {/* Monthly summary */}
      <div className="card attendance-bordered-card">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <h2 className="font-semibold text-primary">
              {monthNames[month]} {year} Summary
              {getFilterSuffix(monthFilter)}
            </h2>

            <p className="text-xs text-gray-400 mt-1">
              Showing {filteredMonthRecords.length} of {monthRecords.length} attendee records
            </p>

            <p className="text-xs text-gray-400 mt-1">
              Adults: {filteredMonthCounts.adultTotal} · Youth: {filteredMonthCounts.youthTotal} · Kids: {filteredMonthCounts.childrenTotal}
            </p>
          </div>

          <div className="flex gap-2 flex-wrap items-end">
            <div>
              <label className="text-[11px] text-gray-500 block mb-1">
                Month Filter
              </label>

              <AttendanceFilterSelect
                value={monthFilter}
                onChange={setMonthFilter}
              />
            </div>

            <button onClick={handleCSVMonth} className="btn-secondary text-xs">
              Export Month CSV
            </button>

            <button onClick={handleXLSXMonth} className="btn-secondary text-xs">
              Export Month XLSX
            </button>

            <Link
              to={getPrintUrl({ month, year, filter: monthFilter })}
              className="btn-secondary text-xs"
            >
              Print Month {getFilterLabel(monthFilter)}
            </Link>
          </div>
        </div>

        {monthRecords.length === 0 ? (
          <p className="text-center text-gray-400 py-6">No records for this month.</p>
        ) : filteredMonthRecords.length === 0 ? (
          <p className="text-center text-gray-400 py-6">
            No {getFilterLabel(monthFilter).toLowerCase()} attendance records for this month.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {groupedMonthRecords.map(group => (
              <div
                key={group.date}
                className="rounded-xl border border-slate-300 overflow-hidden bg-white/40"
              >
                <div className="bg-church-lightblue border-b border-slate-300 px-3 py-2">
                  <h3 className="font-bold text-primary">
                    {formatDatePH(group.date)}
                    {getFilterSuffix(monthFilter)}
                  </h3>

                  <p className="text-xs text-gray-500">
                    {group.records.length} attendee{group.records.length !== 1 ? 's' : ''}
                  </p>
                </div>

                <AttendanceRecordsTable records={group.records} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}