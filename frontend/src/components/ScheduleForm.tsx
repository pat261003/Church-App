import { useEffect, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import {
  ServiceScheduleAssignment,
  ServiceScheduleDate,
  ServiceScheduleInput,
} from '../types';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const REQUIRED_FIELDS = [
  'Master of Ceremony',
  'Opening Song',
  'Opening Prayer',
  'Testimony',
  'Tithes & Offering',
  'Special Song',
  'Praises & Worship',
  'Message',
  'Closing Prayer',
];

const OPTIONAL_FIELDS = [
  'Hymnal Song',
  'Prayer Request',
];

const MONTH_END_FIELDS = [
  'Communion Officiator',
  'Assistants',
];

const BASE_SCHEDULE_FIELDS = [
  'Master of Ceremony',
  'Opening Song',
  'Opening Prayer',
  'Hymnal Song',
  'Prayer Request',
  'Testimony',
  'Tithes & Offering',
  'Special Song',
  'Praises & Worship',
  'Message',
  'Closing Prayer',
];

const FIELD_ALIASES: Record<string, string[]> = {
  'Master of Ceremony': [
    'master of ceremony',
    'mc',
    'm.c',
    'm.c.',
    'emcee',
    'master ceremony',
  ],
  'Opening Song': [
    'opening song',
    'opening songs',
  ],
  'Opening Prayer': [
    'opening prayer',
  ],
  'Hymnal Song': [
    'hymnal song',
    'hymnal',
    'hymn',
    'hymn song',
  ],
  'Prayer Request': [
    'prayer request',
    'prayer requests',
  ],
  'Testimony': [
    'testimony',
    'testimonies',
  ],
  'Tithes & Offering': [
    'tithes & offering',
    'tithes and offering',
    'tithes offering',
    'offering',
    'tithes',
  ],
  'Special Song': [
    'special song',
    'special number',
  ],
  'Praises & Worship': [
    'praises & worship',
    'praises and worship',
    'praise and worship',
    'praise & worship',
    'worship',
  ],
  'Message': [
    'message',
    'sermon',
    'preaching',
    'speaker',
    'preacher',
  ],
  'Closing Prayer': [
    'closing prayer',
    'closing',
  ],
  'Communion Officiator': [
    'communion officiator',
    'communion',
    'communion officer',
    'communion pastor',
    'holy communion',
  ],
  'Assistants': [
    'assistants',
    'assistant',
    'communion assistants',
    'communion assistant',
  ],
};

const ACTIVITY_ALIASES = [
  'activity',
  'activity of the day',
  'activity for the day',
  'notes',
  'note',
  'remarks',
  'schedule notes',
  'sunday notes',
  'prayer for birthday',
  'prayer for anniversary',
  'birthday prayer',
  'anniversary prayer',
];

const REMOVED_FIELD_ALIASES = [
  'scripture reading',
  'scripture',
  'bible reading',
  'kids',
  'children',
  'children ministry',
  'teens',
  'teen',
  'youth bible study',
  'youth study',
  'youth',
  'adult bible study',
  'adult study',
  'adults',
];

type ParsedPastedSchedule = {
  activity?: string;
  assignments: Record<string, string>;
  count: number;
};

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateValue: string) {
  const dateOnly = String(dateValue).slice(0, 10);
  const date = new Date(`${dateOnly}T00:00:00`);

  return date.toLocaleDateString('en-PH', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function getSundaysInMonth(year: number, month: number) {
  const sundays: ServiceScheduleDate[] = [];
  const date = new Date(year, month - 1, 1);

  while (date.getMonth() === month - 1) {
    if (date.getDay() === 0) {
      sundays.push({
        service_date: formatLocalDate(date),
        activity: '',
        date_order: sundays.length,
        assignments: [],
      });
    }

    date.setDate(date.getDate() + 1);
  }

  return sundays;
}

function isLastSundayOfMonth(dateValue: string) {
  const dateOnly = String(dateValue).slice(0, 10);
  const date = new Date(`${dateOnly}T00:00:00`);
  const nextWeek = new Date(date);

  nextWeek.setDate(date.getDate() + 7);

  return nextWeek.getMonth() !== date.getMonth();
}

function getScheduleFieldsForDate(dateValue: string) {
  if (isLastSundayOfMonth(dateValue)) {
    return [...BASE_SCHEDULE_FIELDS, ...MONTH_END_FIELDS];
  }

  return BASE_SCHEDULE_FIELDS;
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

function isOptionalField(position: string) {
  return OPTIONAL_FIELDS.includes(position);
}

function isRequiredField(position: string) {
  return REQUIRED_FIELDS.includes(position);
}

function isMonthEndField(position: string) {
  return MONTH_END_FIELDS.includes(position);
}

function getAssignmentValue(dateItem: ServiceScheduleDate, position: string) {
  const found = dateItem.assignments.find(
    assignment => assignment.position.toLowerCase() === position.toLowerCase()
  );

  return found?.person_name || '';
}

function updateFixedAssignment(
  dateItem: ServiceScheduleDate,
  position: string,
  personName: string
): ServiceScheduleDate {
  const fieldsForDate = getScheduleFieldsForDate(dateItem.service_date);
  const existingIndex = dateItem.assignments.findIndex(
    assignment => assignment.position.toLowerCase() === position.toLowerCase()
  );

  if (existingIndex >= 0) {
    const nextAssignments = [...dateItem.assignments];

    nextAssignments[existingIndex] = {
      ...nextAssignments[existingIndex],
      position,
      person_name: personName,
      assignment_order: fieldsForDate.indexOf(position),
      notes: null,
    };

    return {
      ...dateItem,
      assignments: nextAssignments,
    };
  }

  const newAssignment: ServiceScheduleAssignment = {
    position,
    person_name: personName,
    assignment_order: fieldsForDate.indexOf(position),
    notes: null,
  };

  return {
    ...dateItem,
    assignments: [...dateItem.assignments, newAssignment],
  };
}

function reorderDates(dates: ServiceScheduleDate[]) {
  return dates.map((date, dateIndex) => {
    const fieldsForDate = getScheduleFieldsForDate(date.service_date);

    return {
      ...date,
      service_date: String(date.service_date).slice(0, 10),
      activity: date.activity || '',
      date_order: dateIndex,
      assignments: [...date.assignments]
        .filter(assignment => fieldsForDate.includes(assignment.position))
        .sort((a, b) => {
          const aIndex = fieldsForDate.indexOf(a.position);
          const bIndex = fieldsForDate.indexOf(b.position);

          const safeA = aIndex === -1 ? 999 : aIndex;
          const safeB = bIndex === -1 ? 999 : bIndex;

          return safeA - safeB;
        })
        .map((assignment, assignmentIndex) => ({
          ...assignment,
          notes: null,
          assignment_order: assignmentIndex,
        })),
    };
  });
}

function normalizeLabel(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[.]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function cleanPastedValue(value: string) {
  const cleaned = value.trim();

  if (!cleaned) return '';

  const lower = cleaned.toLowerCase();

  if (
    lower === 'none' ||
    lower === 'n/a' ||
    lower === 'na' ||
    lower.includes('if none') ||
    lower.includes('leave blank')
  ) {
    return '';
  }

  return cleaned;
}

function appendActivity(current: string | undefined, label: string, value: string) {
  const cleanedValue = cleanPastedValue(value);

  if (!cleanedValue) return current || '';

  const nextLine = `${label}: ${cleanedValue}`;

  if (!current) return nextLine;

  return `${current}\n${nextLine}`;
}

function getAliasEntries() {
  const entries: {
    alias: string;
    target: string;
    type: 'assignment' | 'activity' | 'removed';
  }[] = [];

  Object.entries(FIELD_ALIASES).forEach(([target, aliases]) => {
    const allAliases = [target, ...aliases];

    allAliases.forEach(alias => {
      entries.push({
        alias,
        target,
        type: 'assignment',
      });
    });
  });

  ACTIVITY_ALIASES.forEach(alias => {
    entries.push({
      alias,
      target: 'Activity of the Day',
      type: 'activity',
    });
  });

  REMOVED_FIELD_ALIASES.forEach(alias => {
    entries.push({
      alias,
      target: alias,
      type: 'removed',
    });
  });

  return entries;
}

function findAliasEntry(label: string) {
  const normalized = normalizeLabel(label);

  return getAliasEntries().find(
    entry => normalizeLabel(entry.alias) === normalized
  );
}

function parsePastedSchedule(rawText: string, dateValue: string): ParsedPastedSchedule {
  const fieldsForDate = getScheduleFieldsForDate(dateValue);
  const entries = getAliasEntries();
  const aliasPattern = entries
    .map(entry => entry.alias)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join('|');

  const result: ParsedPastedSchedule = {
    assignments: {},
    count: 0,
  };

  if (!rawText.trim()) return result;

  const regex = new RegExp(
    `(?:^|[\\n,;])\\s*(${aliasPattern})\\s*(?::|=|-|–|—)\\s*([\\s\\S]*?)(?=(?:[\\n,;]\\s*(?:${aliasPattern})\\s*(?::|=|-|–|—))|$)`,
    'gi'
  );

  let match: RegExpExecArray | null;

  while ((match = regex.exec(rawText)) !== null) {
    const label = match[1].trim();
    const value = cleanPastedValue(match[2]);
    const aliasEntry = findAliasEntry(label);

    if (!aliasEntry) continue;

    if (aliasEntry.type === 'activity') {
      result.activity = value;
      result.count++;
      continue;
    }

    if (aliasEntry.type === 'removed') {
      result.activity = appendActivity(result.activity, label, value);
      result.count++;
      continue;
    }

    if (!fieldsForDate.includes(aliasEntry.target)) {
      result.activity = appendActivity(result.activity, label, value);
      result.count++;
      continue;
    }

    result.assignments[aliasEntry.target] = value;
    result.count++;
  }

  return result;
}

function applyParsedScheduleToDate(
  dateItem: ServiceScheduleDate,
  parsed: ParsedPastedSchedule
): ServiceScheduleDate {
  let nextDate = {
    ...dateItem,
  };

  if (parsed.activity !== undefined) {
    nextDate = {
      ...nextDate,
      activity: parsed.activity,
    };
  }

  Object.entries(parsed.assignments).forEach(([position, value]) => {
    nextDate = updateFixedAssignment(nextDate, position, value);
  });

  return nextDate;
}

export default function ScheduleForm({
  initialData,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initialData?: Partial<ServiceScheduleInput>;
  submitLabel: string;
  onSubmit: (data: ServiceScheduleInput) => Promise<void>;
  onCancel: () => void;
}) {
  const now = new Date();

  const initialDates = initialData?.dates?.length
    ? reorderDates(initialData.dates)
    : getSundaysInMonth(now.getFullYear(), now.getMonth() + 1);

  const [title, setTitle] = useState(
    initialData?.title || `FGFT Sunday Service Schedule`
  );

  const [scheduleMonth, setScheduleMonth] = useState(
    initialData?.schedule_month || now.getMonth() + 1
  );

  const [scheduleYear, setScheduleYear] = useState(
    initialData?.schedule_year || now.getFullYear()
  );

  const [notes, setNotes] = useState(initialData?.notes || '');
  const [submitting, setSubmitting] = useState(false);

  const [dates, setDates] = useState<ServiceScheduleDate[]>(initialDates);
  const [openDateKey, setOpenDateKey] = useState<string | null>(
    getClosestSundayDateKey(initialDates)
  );

  const [openPasteDate, setOpenPasteDate] = useState<string | null>(null);
  const [pasteTextByDate, setPasteTextByDate] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData?.dates?.length) return;

    const newDates = getSundaysInMonth(scheduleYear, scheduleMonth);
    setDates(newDates);
    setOpenDateKey(getClosestSundayDateKey(newDates));
    setOpenPasteDate(null);
  }, [scheduleMonth, scheduleYear, initialData?.dates?.length]);

  function updateActivity(dateIndex: number, value: string) {
    setDates(prev =>
      prev.map((date, index) =>
        index === dateIndex ? { ...date, activity: value } : date
      )
    );
  }

  function updatePerson(dateIndex: number, position: string, value: string) {
    setDates(prev =>
      prev.map((date, index) =>
        index === dateIndex ? updateFixedAssignment(date, position, value) : date
      )
    );
  }

  function updatePasteText(dateKey: string, value: string) {
    setPasteTextByDate(prev => ({
      ...prev,
      [dateKey]: value,
    }));
  }

  function handleAutoFillFromPaste(dateIndex: number) {
    const dateKey = dates[dateIndex].service_date;
    const pastedText = pasteTextByDate[dateKey] || '';
    const parsed = parsePastedSchedule(pastedText, dateKey);

    if (parsed.count === 0) {
      toast.error('No matching schedule fields found. Use format like "Opening Prayer: Name".');
      return;
    }

    setDates(prev =>
      prev.map((date, index) =>
        index === dateIndex ? applyParsedScheduleToDate(date, parsed) : date
      )
    );

    setOpenPasteDate(null);
    toast.success(`Auto-filled ${parsed.count} field${parsed.count > 1 ? 's' : ''}`);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!title.trim()) return toast.error('Title is required');

    const cleanDates = reorderDates(dates).map(date => {
      const fieldsForDate = getScheduleFieldsForDate(date.service_date);

      return {
        ...date,
        activity: date.activity?.trim() || null,
        assignments: date.assignments
          .filter(assignment =>
            fieldsForDate.includes(assignment.position) &&
            assignment.position.trim() &&
            assignment.person_name.trim()
          )
          .map((assignment, index) => ({
            ...assignment,
            position: assignment.position.trim(),
            person_name: assignment.person_name.trim(),
            notes: null,
            assignment_order: index,
          })),
      };
    });

    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        schedule_month: scheduleMonth,
        schedule_year: scheduleYear,
        notes: notes.trim(),
        dates: cleanDates,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 pb-36 sm:pb-32 md:pb-10">
      <div className="card flex flex-col gap-3">
        <h2 className="font-semibold text-primary">Schedule Info</h2>

        <div>
          <label className="text-sm font-medium text-gray-600 mb-1 block">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="input-field text-base sm:text-sm"
            placeholder="FGFT Sunday Service Schedule"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-gray-600 mb-1 block">
              Month
            </label>
            <select
              value={scheduleMonth}
              onChange={e => setScheduleMonth(Number(e.target.value))}
              className="input-field text-base sm:text-sm"
            >
              {MONTHS.map((month, index) => (
                <option key={month} value={index + 1}>
                  {month}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600 mb-1 block">
              Year
            </label>
            <input
              type="number"
              value={scheduleYear}
              onChange={e => setScheduleYear(Number(e.target.value))}
              className="input-field text-base sm:text-sm"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-600 mb-1 block">
            Notes for Whole Schedule
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            className="input-field resize-y text-base sm:text-sm"
            placeholder="Optional notes for the whole schedule..."
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {dates.map((dateItem, dateIndex) => {
          const dateKey = String(dateItem.service_date).slice(0, 10);
          const isOpen = openDateKey === dateKey;
          const pasteBoxOpen = openPasteDate === dateKey;
          const fieldsForDate = getScheduleFieldsForDate(dateKey);
          const lastSunday = isLastSundayOfMonth(dateKey);
          const assignedCount = dateItem.assignments.filter(
            assignment =>
              fieldsForDate.includes(assignment.position) &&
              assignment.person_name.trim()
          ).length;
          const closestKey = getClosestSundayDateKey(dates);
          const isClosestSunday = closestKey === dateKey;

          return (
            <div key={dateKey} className="card overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  setOpenDateKey(isOpen ? null : dateKey);
                  setOpenPasteDate(null);
                }}
                className="w-full text-left flex items-center justify-between gap-3"
              >
                <div>
                  <p className="text-xs font-bold text-primary uppercase tracking-wide">
                    Sunday Service
                  </p>

                  <h3 className="font-bold text-church-navy text-lg">
                    {formatDisplayDate(dateItem.service_date)}
                  </h3>

                  <p className="text-xs text-gray-400">
                    {assignedCount} assigned
                    {dateItem.activity ? ' · Has activity/notes' : ''}
                    {lastSunday ? ' · Communion Sunday' : ''}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  {isClosestSunday && (
                    <span className="text-[10px] bg-primary text-white px-2 py-1 rounded-full">
                      Closest
                    </span>
                  )}

                  {lastSunday && (
                    <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                      Communion
                    </span>
                  )}

                  <span className="text-primary font-bold text-lg">
                    {isOpen ? '▲' : '▼'}
                  </span>
                </div>
              </button>

              {isOpen && (
                <div className="mt-4 pt-4 border-t border-church-border flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => setOpenPasteDate(pasteBoxOpen ? null : dateKey)}
                      className="btn-secondary text-sm py-3 sm:py-2"
                    >
                      {pasteBoxOpen ? 'Hide Paste Box' : 'Paste / Auto-Fill'}
                    </button>
                  </div>

                  {pasteBoxOpen && (
                    <div className="rounded-xl border border-primary/20 bg-primary-light p-3 flex flex-col gap-3">
                      <div>
                        <h4 className="font-bold text-church-navy text-sm">
                          Paste schedule text for this Sunday
                        </h4>

                        <p className="text-xs text-gray-500">
                          Use format like “Master of Ceremony: Name”. Commas or new lines are okay.
                        </p>
                      </div>

                      <textarea
                        value={pasteTextByDate[dateKey] || ''}
                        onChange={e => updatePasteText(dateKey, e.target.value)}
                        className="input-field min-h-52 font-mono text-base sm:text-sm resize-y bg-white leading-7"
                        placeholder={`Example:

Master of Ceremony: Bro. Juan
Opening Song: Sis. Maria
Opening Prayer: Bro. Carlo
Hymnal Song: If none, leave blank
Prayer Request: If none, leave blank
Testimony: Bro. Mark
Tithes & Offering: Sis. Grace
Special Song: Music Team
Praises & Worship: Music Team
Message: Ptr. Manny
Closing Prayer: Bro. Chris
${lastSunday ? 'Communion Officiator: Ptr. Manny\nAssistants: Bro. Juan, Bro. Carlo\n' : ''}Activity of the Day: Prayer for birthday and anniversary celebrants`}
                      />

                      <div className="sticky bottom-24 sm:static bg-primary-light pt-2 flex gap-2 flex-col sm:flex-row">
                        <button
                          type="button"
                          onClick={() => handleAutoFillFromPaste(dateIndex)}
                          className="btn-primary text-sm flex-1 py-3"
                        >
                          Auto-Fill Fields
                        </button>

                        <button
                          type="button"
                          onClick={() => updatePasteText(dateKey, '')}
                          className="btn-secondary text-sm py-3"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-3">
                    {fieldsForDate.map(position => {
                      const personValue = getAssignmentValue(dateItem, position);
                      const optional = isOptionalField(position);
                      const required = isRequiredField(position);
                      const monthEnd = isMonthEndField(position);

                      return (
                        <div
                          key={position}
                          className={`rounded-xl border p-3 ${
                            monthEnd
                              ? 'border-yellow-300 bg-yellow-50'
                              : required
                                ? 'border-primary/30 bg-primary-light/60'
                                : optional
                                  ? 'border-church-border bg-white'
                                  : 'border-church-border bg-church-lightblue/40'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <label className="text-sm font-bold text-church-navy">
                              {position}
                            </label>

                            {monthEnd ? (
                              <span className="text-[10px] text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">
                                Last Sunday only
                              </span>
                            ) : optional ? (
                              <span className="text-[10px] text-gray-500 bg-church-lightblue px-2 py-0.5 rounded-full">
                                Optional
                              </span>
                            ) : required ? (
                              <span className="text-[10px] text-primary bg-white px-2 py-0.5 rounded-full">
                                Usual
                              </span>
                            ) : (
                              <span className="text-[10px] text-gray-500 bg-white px-2 py-0.5 rounded-full">
                                Schedule
                              </span>
                            )}
                          </div>

                          <input
                            value={personValue}
                            onChange={e => updatePerson(dateIndex, position, e.target.value)}
                            className="input-field text-base sm:text-sm"
                            placeholder={
                              monthEnd
                                ? `Enter name for ${position}`
                                : optional
                                  ? 'If none, just leave blank'
                                  : `Enter name for ${position}`
                            }
                          />
                        </div>
                      );
                    })}

                    <div className="rounded-xl border border-primary/30 bg-primary-light/70 p-3">
                      <label className="text-sm font-bold text-church-navy mb-2 block">
                        Activity of the Day / Notes
                      </label>

                      <textarea
                        value={dateItem.activity || ''}
                        onChange={e => updateActivity(dateIndex, e.target.value)}
                        rows={3}
                        className="input-field text-base sm:text-sm resize-y bg-white"
                        placeholder="Optional. Example: prayer for birthday/anniversary, Bible study, reminders. If none, just leave blank."
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="sticky bottom-24 md:bottom-4 z-40 bg-white/95 backdrop-blur border border-church-border shadow-lg rounded-2xl p-3 flex gap-3 flex-col sm:flex-row">
        <button type="submit" disabled={submitting} className="btn-primary flex-1 py-3">
          {submitting ? 'Saving...' : submitLabel}
        </button>

        <button type="button" onClick={onCancel} className="btn-secondary py-3">
          Cancel
        </button>
      </div>
    </form>
  );
}