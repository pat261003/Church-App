import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchLineup, fetchLineups } from '../api/lineups';
import { fetchAttendance } from '../api/attendance';
import { fetchSchedule, fetchSchedules } from '../api/schedules';
import {
  AttendanceRecord,
  ServiceLineup,
  ServiceSchedule,
  ServiceScheduleDate,
} from '../types';

import { getAttendanceGroupCounts } from '../utils/attendanceGroups';

const CHURCH_FACEBOOK_URL = 'https://www.facebook.com/profile.php?id=61555244094090';
const CHURCH_BACKGROUND_IMAGE = '/images/church-members.jpg';

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getDateOnly(dateValue: string | null | undefined) {
  if (!dateValue) return '';

  return String(dateValue).slice(0, 10);
}

function getSafeDate(dateValue: string | null | undefined) {
  const dateOnly = getDateOnly(dateValue);

  if (!dateOnly) return null;

  const date = new Date(`${dateOnly}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function formatDate(dateValue: string | null | undefined) {
  const date = getSafeDate(dateValue);

  if (!date) return 'No date set';

  return date.toLocaleDateString('en-PH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getCurrentSundayDate() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const day = today.getDay();
  const daysUntilSunday = day === 0 ? 0 : 7 - day;

  const sunday = new Date(today);
  sunday.setDate(today.getDate() + daysUntilSunday);

  return formatLocalDate(sunday);
}

function getLastSundayDate() {
  const currentSunday = new Date(`${getCurrentSundayDate()}T00:00:00`);
  currentSunday.setDate(currentSunday.getDate() - 7);

  return formatLocalDate(currentSunday);
}

function countGender(records: AttendanceRecord[]) {
  const counts = getAttendanceGroupCounts(records);

  return {
    total: records.length,
    male: counts.male,
    female: counts.female,
  };
}

function chooseFeaturedLineup(lineups: ServiceLineup[]) {
  if (lineups.length === 0) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const datedLineups = lineups
    .map(lineup => ({
      lineup,
      date: getSafeDate(lineup.service_date),
    }))
    .filter(item => item.date !== null) as {
      lineup: ServiceLineup;
      date: Date;
    }[];

  if (datedLineups.length === 0) return lineups[0];

  const upcoming = datedLineups
    .filter(item => item.date >= today)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (upcoming.length > 0) {
    return upcoming[0].lineup;
  }

  const latestPast = datedLineups.sort((a, b) => b.date.getTime() - a.date.getTime());

  return latestPast[0].lineup;
}

async function findUpcomingSundaySchedule(upcomingSundayDate: string) {
  const schedules = await fetchSchedules();

  const sunday = new Date(`${upcomingSundayDate}T00:00:00`);
  const sundayMonth = sunday.getMonth() + 1;
  const sundayYear = sunday.getFullYear();

  const possibleSchedules = schedules.filter(
    schedule =>
      Number(schedule.schedule_month) === sundayMonth &&
      Number(schedule.schedule_year) === sundayYear
  );

  for (const schedule of possibleSchedules) {
    const fullSchedule = await fetchSchedule(schedule.id);
    const matchingDate = fullSchedule.dates.find(
      dateItem => getDateOnly(dateItem.service_date) === upcomingSundayDate
    );

    if (matchingDate) {
      return {
        schedule: fullSchedule,
        dateItem: matchingDate,
      };
    }
  }

  return null;
}

function AttendanceSummaryCard({
  title,
  date,
  total,
  male,
  female,
}: {
  title: string;
  date: string;
  total: number;
  male: number;
  female: number;
}) {
  return (
    <div className="rounded-xl bg-white border border-church-border p-3 shadow-sm">
      <p className="text-xs font-bold text-primary uppercase tracking-wide">
        {title}
      </p>

      <p className="text-[11px] text-gray-400 mb-3">
        {formatDate(date)}
      </p>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-primary-light rounded-lg p-2 text-center">
          <p className="text-[10px] text-gray-500">Total</p>
          <p className="text-lg font-bold text-primary">{total}</p>
        </div>

        <div className="bg-primary-light rounded-lg p-2 text-center">
          <p className="text-[10px] text-gray-500">Male</p>
          <p className="text-lg font-bold text-primary">{male}</p>
        </div>

        <div className="bg-primary-light rounded-lg p-2 text-center">
          <p className="text-[10px] text-gray-500">Female</p>
          <p className="text-lg font-bold text-primary">{female}</p>
        </div>
      </div>
    </div>
  );
}

function UpcomingScheduleCard({
  schedule,
  dateItem,
  loading,
}: {
  schedule: ServiceSchedule | null;
  dateItem: ServiceScheduleDate | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="text-center py-3">
        <p className="text-sm text-gray-500">Loading upcoming Sunday schedule...</p>
      </div>
    );
  }

  if (!schedule || !dateItem) {
    return (
      <div>
        <h2 className="text-lg font-bold text-church-navy">
          No schedule found for the upcoming Sunday
        </h2>

        <p className="text-sm text-gray-500 mt-1">
          Create or update the schedule in the Schedule tab.
        </p>

        <Link
          to="/schedules"
          className="btn-secondary text-sm mt-4 w-full sm:w-auto text-center block sm:inline-block"
        >
          Open Schedule
        </Link>
      </div>
    );
  }

  const visibleAssignments = dateItem.assignments.filter(
    assignment => assignment.person_name?.trim()
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div>
          <p className="text-[11px] sm:text-xs font-bold text-primary uppercase tracking-wide mb-1">
            Upcoming Sunday Schedule
          </p>

          <h2 className="text-lg sm:text-xl font-bold text-church-navy leading-tight">
            {formatDate(dateItem.service_date)}
          </h2>

          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {schedule.title}
          </p>
        </div>

        <div className="bg-primary-light rounded-xl px-3 py-2">
          <p className="text-[11px] text-gray-500">Assignments</p>
          <p className="font-bold text-primary">
            {visibleAssignments.length}
          </p>
        </div>
      </div>

      {visibleAssignments.length === 0 ? (
        <div className="rounded-xl bg-church-lightblue p-3 text-sm text-gray-500">
          No assignments added yet for this Sunday.
        </div>
      ) : (
        <div className="rounded-xl bg-church-lightblue p-3 flex flex-col gap-1.5">
          {visibleAssignments.map(assignment => (
            <div
              key={assignment.id || `${assignment.position}-${assignment.person_name}`}
              className="bg-white rounded-lg px-3 py-2"
            >
              <div className="grid grid-cols-[8.5rem_1fr] sm:grid-cols-[11rem_1fr] gap-2 items-start">
                <p className="text-xs sm:text-sm font-bold text-primary leading-snug break-words">
                  {assignment.position}:
                </p>

                <p className="text-xs sm:text-sm font-semibold text-church-navy leading-snug break-words">
                  {assignment.person_name}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {dateItem.activity && (
        <div className="mt-3 rounded-xl bg-primary-light p-3">
          <p className="text-[11px] font-bold text-primary uppercase tracking-wide">
            Activity of the Day / Notes
          </p>

          <p className="text-sm font-semibold text-church-navy whitespace-pre-wrap">
            {dateItem.activity}
          </p>
        </div>
      )}

      <Link
        to={`/schedules/${schedule.id}`}
        className="btn-secondary text-sm mt-4 w-full sm:w-auto text-center block sm:inline-block"
      >
        Open Full Schedule
      </Link>
    </div>
  );
}

function PinnedUpcomingScheduleCard({
  schedule,
  dateItem,
  loading,
  lineup,
  loadingLineup,
}: {
  schedule: ServiceSchedule | null;
  dateItem: ServiceScheduleDate | null;
  loading: boolean;
  lineup: ServiceLineup | null;
  loadingLineup: boolean;
}) {
  const visibleAssignments = dateItem?.assignments.filter(
    assignment => assignment.person_name?.trim()
  ) || [];

  const lineupSections = lineup?.sections || [];
  const totalSongs = lineupSections.reduce(
    (total, section) => total + section.songs.length,
    0
  );

  return (
    <div className="w-full h-full rounded-3xl border border-church-border bg-[rgb(var(--color-surface))] text-church-navy shadow-xl overflow-hidden">
      <div className="bg-primary px-4 py-3 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/80">
              Pinned Sunday Preview
            </p>

            <h2 className="font-extrabold text-lg leading-tight">
              Upcoming Sunday
            </h2>
          </div>

          <div className="rounded-full bg-white/15 px-3 py-1 text-center shrink-0">
            <p className="text-[9px] text-white/75">Items</p>
            <p className="text-base font-extrabold leading-none">
              {visibleAssignments.length + totalSongs}
            </p>
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Schedule side */}
        <div className="rounded-2xl border border-church-border bg-white p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-[10px] font-bold text-primary uppercase tracking-wide">
              Schedule
            </p>

            {!loading && schedule && dateItem && (
              <span className="text-[10px] text-gray-500 bg-primary-light px-2 py-0.5 rounded-full">
                {visibleAssignments.length} assigned
              </span>
            )}
          </div>

          {loading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-3 bg-primary-light rounded w-3/4" />
              <div className="h-3 bg-primary-light rounded w-1/2" />
              <div className="h-3 bg-primary-light rounded w-2/3" />
            </div>
          ) : !schedule || !dateItem ? (
            <div className="rounded-lg bg-church-lightblue p-2.5 text-xs text-gray-500">
              No schedule found yet.
            </div>
          ) : (
            <>
              <p className="text-[11px] font-bold text-primary">
                {formatDate(dateItem.service_date)}
              </p>

              <p className="text-[11px] font-semibold text-gray-500 break-words mt-0.5">
                {schedule.title}
              </p>

              {dateItem.activity && (
                <div className="mt-2 rounded-lg bg-primary-light px-2.5 py-2">
                  <p className="text-[9px] font-bold text-primary uppercase tracking-wide">
                    Activity / Notes
                  </p>

                  <p className="text-[11px] font-semibold text-church-navy whitespace-pre-wrap leading-snug">
                    {dateItem.activity}
                  </p>
                </div>
              )}

              {visibleAssignments.length === 0 ? (
                <div className="mt-2 rounded-lg bg-church-lightblue p-2.5 text-xs text-gray-500">
                  No assignments added yet for this Sunday.
                </div>
              ) : (
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {visibleAssignments.map(assignment => (
                    <div
                      key={assignment.id || `${assignment.position}-${assignment.person_name}`}
                      className="rounded-lg border border-church-border bg-[rgb(var(--color-surface))] px-2 py-1.5"
                    >
                      <p className="text-[9px] font-bold text-primary uppercase tracking-wide leading-snug break-words">
                        {assignment.position}
                      </p>

                      <p className="text-[11px] font-extrabold text-church-navy leading-snug break-words mt-0.5">
                        {assignment.person_name}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Lineup side */}
        <div className="rounded-2xl border border-church-border bg-white p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-[10px] font-bold text-primary uppercase tracking-wide">
              LINE UP THIS SUNDAY
            </p>

            {!loadingLineup && lineup && (
              <span className="text-[10px] text-gray-500 bg-primary-light px-2 py-0.5 rounded-full">
                {totalSongs} {totalSongs === 1 ? 'song' : 'songs'}
              </span>
            )}
          </div>

          {loadingLineup ? (
            <div className="animate-pulse space-y-2">
              <div className="h-3 bg-primary-light rounded w-4/5" />
              <div className="h-3 bg-primary-light rounded w-3/5" />
              <div className="h-3 bg-primary-light rounded w-2/3" />
            </div>
          ) : !lineup ? (
            <div className="rounded-lg bg-church-lightblue p-2.5 text-xs text-gray-500">
              No song lineup found yet.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="rounded-lg bg-primary-light px-2.5 py-2">
                <p className="text-[10px] font-bold text-primary uppercase tracking-wide">
                  {lineup.title}
                </p>

                <p className="text-[11px] text-church-navy font-semibold">
                  Song Leader: {lineup.song_leader || '—'}
                </p>
              </div>

              {lineupSections.map(section => (
                <div
                  key={section.id || section.section_name}
                  className="rounded-lg border border-church-border bg-[rgb(var(--color-surface))] px-2.5 py-2"
                >
                  <p className="text-[10px] font-bold text-primary uppercase tracking-wide mb-1">
                    {section.section_name}
                  </p>

                  {section.songs.length === 0 ? (
                    <p className="text-[11px] text-gray-400">
                      No songs added.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {section.songs.map((song, index) => (
                        <div
                          key={song.id || `${section.section_name}-${index}`}
                          className="grid grid-cols-[1.2rem_1fr_auto] gap-1.5 items-start"
                        >
                          <p className="text-[10px] text-gray-400 font-bold">
                            {index + 1}.
                          </p>

                          <p className="text-[11px] font-extrabold text-church-navy leading-snug break-words">
                            {song.title || 'Untitled Song'}
                          </p>

                          <p className="text-[10px] text-primary font-bold whitespace-nowrap">
                            {song.key_override || song.current_key || song.original_key || '—'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="lg:col-span-2 text-[10px] text-gray-400 text-center">
          Pinned preview only. Full clickable schedule and lineup are below.
        </p>
      </div>
    </div>
  );
}

function HomeAccordionSection({
  title,
  subtitle,
  open,
  onToggle,
  children,
}: {
  title: string;
  subtitle?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-4xl card overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left flex items-center justify-between gap-3"
      >
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-bold text-church-navy">
            {title}
          </h2>

          {subtitle && (
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              {subtitle}
            </p>
          )}
        </div>

        <span className="text-primary font-bold text-lg shrink-0">
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div className="mt-4 pt-4 border-t border-church-border">
          {children}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [featuredLineup, setFeaturedLineup] = useState<ServiceLineup | null>(null);
  const [loadingLineup, setLoadingLineup] = useState(true);
  const [upcomingSchedule, setUpcomingSchedule] = useState<ServiceSchedule | null>(null);
  const [upcomingScheduleDate, setUpcomingScheduleDate] = useState<ServiceScheduleDate | null>(null);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [showAttendanceHome, setShowAttendanceHome] = useState(false);
  const [showScheduleHome, setShowScheduleHome] = useState(false);
  const [showLineupHome, setShowLineupHome] = useState(false);  
  const [lastSundayStats, setLastSundayStats] = useState({
    total: 0,
    male: 0,
    female: 0,
  });

  const [currentSundayStats, setCurrentSundayStats] = useState({
    total: 0,
    male: 0,
    female: 0,
  });

  const lastSundayDate = getLastSundayDate();
  const currentSundayDate = getCurrentSundayDate();

  useEffect(() => {
    async function loadFeaturedLineup() {
      try {
        const lineups = await fetchLineups();
        const selectedLineup = chooseFeaturedLineup(lineups);

        if (!selectedLineup) {
          setFeaturedLineup(null);
          return;
        }

        const fullLineup = await fetchLineup(selectedLineup.id);
        setFeaturedLineup(fullLineup);
      } catch (err) {
        console.error('Failed to load featured lineup:', err);
        setFeaturedLineup(null);
      } finally {
        setLoadingLineup(false);
      }
    }

    async function loadAttendanceSummaries() {
      try {
        const [lastSundayRecords, currentSundayRecords] = await Promise.all([
          fetchAttendance(lastSundayDate),
          fetchAttendance(currentSundayDate),
        ]);

        setLastSundayStats(countGender(lastSundayRecords));
        setCurrentSundayStats(countGender(currentSundayRecords));
      } catch (err) {
        console.error('Failed to load attendance summaries:', err);
      }
    }

    async function loadUpcomingSchedule() {
      try {
        const result = await findUpcomingSundaySchedule(currentSundayDate);

        if (!result) {
          setUpcomingSchedule(null);
          setUpcomingScheduleDate(null);
          return;
        }

        setUpcomingSchedule(result.schedule);
        setUpcomingScheduleDate(result.dateItem);
      } catch (err) {
        console.error('Failed to load upcoming schedule:', err);
        setUpcomingSchedule(null);
        setUpcomingScheduleDate(null);
      } finally {
        setLoadingSchedule(false);
      }
    }

    loadFeaturedLineup();
    loadAttendanceSummaries();
    loadUpcomingSchedule();
  }, [lastSundayDate, currentSundayDate]);

  return (
  <div className="w-full flex flex-col items-center gap-6 sm:gap-8 py-4 sm:py-6 px-3 sm:px-5 lg:px-8 overflow-x-hidden">
     <div className="w-full grid grid-cols-1 xl:grid-cols-2 gap-5 items-stretch">
      <section className="relative w-full overflow-hidden rounded-3xl border border-church-border shadow-xl min-h-[360px] sm:min-h-[430px] xl:min-h-[620px] flex items-end">
        <div
          className="absolute inset-0 bg-cover bg-center xl:bg-center"
          style={{
            backgroundImage: `url(${CHURCH_BACKGROUND_IMAGE})`,
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/20" />

        <div className="relative z-10 w-full p-5 sm:p-8 md:p-10 text-white">
          <div className="max-w-3xl">
            <img
              src="/logo.jpg"
              alt="FGFTI"
              className="h-20 w-20 sm:h-24 sm:w-24 mb-4 rounded-full shadow-lg bg-white object-cover border-4 border-white/80"
            />

            <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.25em] text-white/80">
              Welcome to our church
            </p>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mt-3 leading-tight">
              Full Gospel Faith Temple Inc.
            </h1>

            <p className="text-sm sm:text-base text-white/85 mt-3 max-w-2xl">
              Church Attendance &amp; Lyrics System · Est. 1967
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <a
                href={CHURCH_FACEBOOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-xl bg-white text-primary font-bold px-5 py-3 shadow-md hover:scale-[1.02] active:scale-95 transition-transform"
              >
                Visit Church Facebook Page
              </a>
            </div>
          </div>
        </div>
      </section>

      <div className="w-full h-full min-w-0">
        <PinnedUpcomingScheduleCard
          schedule={upcomingSchedule}
          dateItem={upcomingScheduleDate}
          loading={loadingSchedule}
          lineup={featuredLineup}
          loadingLineup={loadingLineup}
        />
      </div>
    </div>

      <HomeAccordionSection
        title="Attendance Summary"
        subtitle="Tap to show previous and current Sunday attendance"
        open={showAttendanceHome}
        onToggle={() => setShowAttendanceHome(prev => !prev)}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AttendanceSummaryCard
            title="Last Sunday Attendance"
            date={lastSundayDate}
            total={lastSundayStats.total}
            male={lastSundayStats.male}
            female={lastSundayStats.female}
          />

          <AttendanceSummaryCard
            title="Current Sunday Attendance"
            date={currentSundayDate}
            total={currentSundayStats.total}
            male={currentSundayStats.male}
            female={currentSundayStats.female}
          />
        </div>

        <Link
          to="/attendance"
          className="btn-secondary text-sm mt-4 w-full sm:w-auto text-center block sm:inline-block"
        >
          Open Attendance
        </Link>
      </HomeAccordionSection>

      <HomeAccordionSection
        title="Upcoming Sunday Schedule"
        subtitle={
          upcomingScheduleDate
            ? formatDate(upcomingScheduleDate.service_date)
            : 'Tap to show the upcoming Sunday schedule'
        }
        open={showScheduleHome}
        onToggle={() => setShowScheduleHome(prev => !prev)}
      >
        <UpcomingScheduleCard
          schedule={upcomingSchedule}
          dateItem={upcomingScheduleDate}
          loading={loadingSchedule}
        />
      </HomeAccordionSection>

      <HomeAccordionSection
          title="Current / Upcoming Song Lineup"
          subtitle={
            featuredLineup
              ? `${featuredLineup.title} · ${formatDate(featuredLineup.service_date)}`
              : 'Tap to show the current lineup'
          }
          open={showLineupHome}
          onToggle={() => setShowLineupHome(prev => !prev)}
        >
          {loadingLineup ? (
            <div className="text-center">
              <p className="text-sm text-gray-500">Loading song lineup...</p>
            </div>
          ) : featuredLineup ? (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs font-bold text-primary uppercase tracking-wide mb-1">
                    Current / Upcoming Song Lineup
                  </p>

                  <h2 className="text-lg sm:text-xl font-bold text-church-navy leading-tight break-words">
                    {featuredLineup.title}
                  </h2>

                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    {formatDate(featuredLineup.service_date)}
                  </p>
                </div>

                <div className="w-full sm:w-auto bg-primary-light px-3 py-2 rounded-xl sm:text-right">
                  <p className="text-[11px] text-gray-500">Song Leader</p>
                  <p className="font-bold text-primary text-base break-words">
                    {featuredLineup.song_leader}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {featuredLineup.sections.map(section => (
                  <div
                    key={section.id || section.section_name}
                    className="rounded-xl bg-church-lightblue/80 p-3 min-w-0"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-xs font-bold text-primary uppercase tracking-wide truncate">
                        {section.section_name}
                      </p>

                      <span className="text-[10px] text-gray-500 bg-white px-2 py-0.5 rounded-full shrink-0">
                        {section.songs.length} {section.songs.length === 1 ? 'song' : 'songs'}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      {section.songs.map((song, index) => (
                        <div
                          key={song.id || `${section.section_name}-${index}`}
                          className="bg-white rounded-lg px-2.5 py-2"
                        >
                          <p className="text-sm font-semibold text-church-navy leading-snug break-words">
                            {index + 1}. {song.title || 'Untitled Song'}
                          </p>

                          <p className="text-[11px] text-gray-400 mt-0.5">
                            Key: {song.key_override || song.current_key || song.original_key || '—'}
                            {song.artist ? ` · ${song.artist}` : ''}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <Link
                to={`/lineups/${featuredLineup.id}`}
                className="btn-secondary text-sm mt-4 w-full sm:w-auto text-center block sm:inline-block"
              >
                Open Full Lineup
              </Link>
            </div>
          ) : (
            <div>
              <h2 className="text-lg font-bold text-church-navy mb-1">
                No Song Lineup Yet
              </h2>

              <p className="text-sm text-gray-500">
                Create a lineup so the song leader and songs appear here.
              </p>

              <Link
                to="/lineups/add"
                className="btn-secondary text-sm mt-4 w-full sm:w-auto text-center block sm:inline-block"
              >
                Create Lineup
              </Link>
            </div>
          )}
        </HomeAccordionSection>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl">
        <Link to="/attendance" className="card hover:shadow-md transition-shadow group active:scale-[0.99]">
          <div className="flex items-center gap-4">
            <div className="bg-primary-light p-3 rounded-xl shrink-0">
              <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>

            <div>
              <h2 className="font-bold text-church-navy text-lg group-hover:text-primary transition-colors">
                Attendance
              </h2>
              <p className="text-gray-500 text-sm">Record Sunday attendance</p>
            </div>
          </div>
        </Link>

        <Link to="/dashboard" className="card hover:shadow-md transition-shadow group active:scale-[0.99]">
          <div className="flex items-center gap-4">
            <div className="bg-primary-light p-3 rounded-xl shrink-0">
              <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>

            <div>
              <h2 className="font-bold text-church-navy text-lg group-hover:text-primary transition-colors">
                Dashboard
              </h2>
              <p className="text-gray-500 text-sm">View stats &amp; reports</p>
            </div>
          </div>
        </Link>

        <Link to="/songs" className="card hover:shadow-md transition-shadow group active:scale-[0.99]">
          <div className="flex items-center gap-4">
            <div className="bg-primary-light p-3 rounded-xl shrink-0">
              <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                />
              </svg>
            </div>

            <div>
              <h2 className="font-bold text-church-navy text-lg group-hover:text-primary transition-colors">
                Song Lyrics
              </h2>
              <p className="text-gray-500 text-sm">Browse &amp; transpose songs</p>
            </div>
          </div>
        </Link>

        <Link to="/lineups" className="card hover:shadow-md transition-shadow group active:scale-[0.99]">
          <div className="flex items-center gap-4">
            <div className="bg-primary-light p-3 rounded-xl shrink-0">
              <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5h6M9 9h6M9 13h6M5 5h.01M5 9h.01M5 13h.01M4 19h16"
                />
              </svg>
            </div>

            <div>
              <h2 className="font-bold text-church-navy text-lg group-hover:text-primary transition-colors">
                Song Lineup
              </h2>
              <p className="text-gray-500 text-sm">Prepare service songs</p>
            </div>
          </div>
        </Link>

        <Link to="/schedules" className="card hover:shadow-md transition-shadow group active:scale-[0.99]">
          <div className="flex items-center gap-4">
            <div className="bg-primary-light p-3 rounded-xl shrink-0">
              <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3M4 11h16M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2zm3 10h.01M12 15h.01M16 15h.01"
                />
              </svg>
            </div>

            <div>
              <h2 className="font-bold text-church-navy text-lg group-hover:text-primary transition-colors">
                Schedule
              </h2>
              <p className="text-gray-500 text-sm">View service assignments</p>
            </div>
          </div>
        </Link>

        <Link to="/songs/add" className="card hover:shadow-md transition-shadow group active:scale-[0.99]">
          <div className="flex items-center gap-4">
            <div className="bg-primary-light p-3 rounded-xl shrink-0">
              <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>

            <div>
              <h2 className="font-bold text-church-navy text-lg group-hover:text-primary transition-colors">
                Add Song
              </h2>
              <p className="text-gray-500 text-sm">Add lyrics &amp; chords</p>
            </div>
          </div>
        </Link>
      </div>

      <p className="text-xs text-gray-400 mt-2 text-center px-4">
        Full Gospel Faith Temple Inc. · Since 1967 · Philippines
      </p>
    </div>
  );
}