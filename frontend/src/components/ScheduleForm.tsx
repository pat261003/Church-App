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
  'Youth Bible Study',
  'Adult Bible Study',
];

const SCHEDULE_FIELDS = [
  'Master of Ceremony',
  'Opening Song',
  'Opening Prayer',
  'Hymnal Song',
  'Prayer Request',
  'Testimony',
  'Tithes & Offering',
  'Scripture Reading',
  'Special Song',
  'Kids',
  'Teens',
  'Youth Bible Study',
  'Adult Bible Study',
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
    'prayer for birthday',
    'prayer for anniversary',
    'birthday prayer',
    'anniversary prayer',
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
  'Scripture Reading': [
    'scripture reading',
    'scripture',
    'bible reading',
  ],
  'Special Song': [
    'special song',
    'special number',
  ],
  'Kids': [
    'kids',
    'children',
    'children ministry',
  ],
  'Teens': [
    'teens',
    'teen',
  ],
  'Youth Bible Study': [
    'youth bible study',
    'youth study',
    'youth',
  ],
  'Adult Bible Study': [
    'adult bible study',
    'adult study',
    'adults',
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
};

const ACTIVITY_ALIASES = [
  'activity',
  'activity of the day',
  'activity for the day',
];

type ParsedPastedSchedule = {
  activity?: string;
  assignments: Record<string, {
    personName?: string;
    notes?: string;
  }>;
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

function isOptionalField(position: string) {
  return OPTIONAL_FIELDS.includes(position);
}

function isRequiredField(position: string) {
  return REQUIRED_FIELDS.includes(position);
}

function getAssignmentValue(dateItem: ServiceScheduleDate, position: string) {
  const found = dateItem.assignments.find(
    assignment => assignment.position.toLowerCase() === position.toLowerCase()
  );

  return found?.person_name || '';
}

function getAssignmentNotes(dateItem: ServiceScheduleDate, position: string) {
  const found = dateItem.assignments.find(
    assignment => assignment.position.toLowerCase() === position.toLowerCase()
  );

  return found?.notes || '';
}

function updateFixedAssignment(
  dateItem: ServiceScheduleDate,
  position: string,
  personName: string
): ServiceScheduleDate {
  const existingIndex = dateItem.assignments.findIndex(
    assignment => assignment.position.toLowerCase() === position.toLowerCase()
  );

  if (existingIndex >= 0) {
    const nextAssignments = [...dateItem.assignments];

    nextAssignments[existingIndex] = {
      ...nextAssignments[existingIndex],
      position,
      person_name: personName,
      assignment_order: SCHEDULE_FIELDS.indexOf(position),
    };

    return {
      ...dateItem,
      assignments: nextAssignments,
    };
  }

  const newAssignment: ServiceScheduleAssignment = {
    position,
    person_name: personName,
    assignment_order: SCHEDULE_FIELDS.indexOf(position),
    notes: '',
  };

  return {
    ...dateItem,
    assignments: [...dateItem.assignments, newAssignment],
  };
}

function updateFixedAssignmentNotes(
  dateItem: ServiceScheduleDate,
  position: string,
  notes: string
): ServiceScheduleDate {
  const existingIndex = dateItem.assignments.findIndex(
    assignment => assignment.position.toLowerCase() === position.toLowerCase()
  );

  if (existingIndex >= 0) {
    const nextAssignments = [...dateItem.assignments];

    nextAssignments[existingIndex] = {
      ...nextAssignments[existingIndex],
      notes,
    };

    return {
      ...dateItem,
      assignments: nextAssignments,
    };
  }

  const newAssignment: ServiceScheduleAssignment = {
    position,
    person_name: '',
    assignment_order: SCHEDULE_FIELDS.indexOf(position),
    notes,
  };

  return {
    ...dateItem,
    assignments: [...dateItem.assignments, newAssignment],
  };
}

function reorderDates(dates: ServiceScheduleDate[]) {
  return dates.map((date, dateIndex) => ({
    ...date,
    service_date: String(date.service_date).slice(0, 10),
    date_order: dateIndex,
    assignments: [...date.assignments]
      .sort((a, b) => {
        const aIndex = SCHEDULE_FIELDS.indexOf(a.position);
        const bIndex = SCHEDULE_FIELDS.indexOf(b.position);

        const safeA = aIndex === -1 ? 999 : aIndex;
        const safeB = bIndex === -1 ? 999 : bIndex;

        return safeA - safeB;
      })
      .map((assignment, assignmentIndex) => ({
        ...assignment,
        assignment_order: assignmentIndex,
      })),
  }));
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

function getAliasEntries() {
  const entries: {
    alias: string;
    target: string;
    notesOnly: boolean;
    isActivity: boolean;
  }[] = [];

  Object.entries(FIELD_ALIASES).forEach(([target, aliases]) => {
    const allAliases = [target, ...aliases];

    allAliases.forEach(alias => {
      entries.push({
        alias,
        target,
        notesOnly: false,
        isActivity: false,
      });

      entries.push({
        alias: `${alias} notes`,
        target,
        notesOnly: true,
        isActivity: false,
      });

      entries.push({
        alias: `${alias} note`,
        target,
        notesOnly: true,
        isActivity: false,
      });
    });
  });

  ACTIVITY_ALIASES.forEach(alias => {
    entries.push({
      alias,
      target: 'Activity of the Day',
      notesOnly: false,
      isActivity: true,
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

function splitPersonAndNotes(value: string) {
  const cleaned = value.trim();

  if (!cleaned) {
    return {
      personName: '',
      notes: '',
    };
  }

  if (cleaned.includes('|')) {
    const [personName, ...noteParts] = cleaned.split('|');

    return {
      personName: personName.trim(),
      notes: noteParts.join('|').trim(),
    };
  }

  const parenthesisMatch = cleaned.match(/^(.*?)\s*\((.*?)\)\s*$/);

  if (parenthesisMatch) {
    return {
      personName: parenthesisMatch[1].trim(),
      notes: parenthesisMatch[2].trim(),
    };
  }

  if (cleaned.includes(' - ')) {
    const [personName, ...noteParts] = cleaned.split(' - ');

    return {
      personName: personName.trim(),
      notes: noteParts.join(' - ').trim(),
    };
  }

  if (cleaned.includes(' — ')) {
    const [personName, ...noteParts] = cleaned.split(' — ');

    return {
      personName: personName.trim(),
      notes: noteParts.join(' — ').trim(),
    };
  }

  if (cleaned.includes(' – ')) {
    const [personName, ...noteParts] = cleaned.split(' – ');

    return {
      personName: personName.trim(),
      notes: noteParts.join(' – ').trim(),
    };
  }

  return {
    personName: cleaned,
    notes: '',
  };
}

function parsePastedSchedule(rawText: string): ParsedPastedSchedule {
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
    const value = match[2].trim();
    const aliasEntry = findAliasEntry(label);

    if (!aliasEntry) continue;

    if (aliasEntry.isActivity) {
      result.activity = value;
      result.count++;
      continue;
    }

    if (!result.assignments[aliasEntry.target]) {
      result.assignments[aliasEntry.target] = {};
    }

    if (aliasEntry.notesOnly) {
      result.assignments[aliasEntry.target].notes = value;
      result.count++;
      continue;
    }

    const { personName, notes } = splitPersonAndNotes(value);

    result.assignments[aliasEntry.target].personName = personName;

    if (notes) {
      result.assignments[aliasEntry.target].notes = notes;
    }

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
    if (value.personName !== undefined) {
      nextDate = updateFixedAssignment(nextDate, position, value.personName);
    }

    if (value.notes !== undefined) {
      nextDate = updateFixedAssignmentNotes(nextDate, position, value.notes);
    }
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

  const [dates, setDates] = useState<ServiceScheduleDate[]>(
    initialData?.dates?.length
      ? reorderDates(initialData.dates)
      : getSundaysInMonth(now.getFullYear(), now.getMonth() + 1)
  );

  const [openPasteDate, setOpenPasteDate] = useState<string | null>(null);
  const [pasteTextByDate, setPasteTextByDate] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData?.dates?.length) return;

    setDates(getSundaysInMonth(scheduleYear, scheduleMonth));
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

  function updateNotes(dateIndex: number, position: string, value: string) {
    setDates(prev =>
      prev.map((date, index) =>
        index === dateIndex ? updateFixedAssignmentNotes(date, position, value) : date
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
    const parsed = parsePastedSchedule(pastedText);

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

    const cleanDates = reorderDates(dates).map(date => ({
      ...date,
      activity: date.activity?.trim() || null,
      assignments: date.assignments
        .filter(assignment => assignment.position.trim() && assignment.person_name.trim())
        .map((assignment, index) => ({
          ...assignment,
          position: assignment.position.trim(),
          person_name: assignment.person_name.trim(),
          notes: assignment.notes?.trim() || null,
          assignment_order: index,
        })),
    }));

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
            Notes
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

      <div className="flex flex-col gap-4">
        {dates.map((dateItem, dateIndex) => {
          const dateKey = dateItem.service_date;
          const pasteBoxOpen = openPasteDate === dateKey;

          return (
            <div key={dateItem.service_date} className="card flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-primary uppercase tracking-wide">
                    Sunday Service
                  </p>

                  <h3 className="font-bold text-church-navy text-lg">
                    {formatDisplayDate(dateItem.service_date)}
                  </h3>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => setOpenPasteDate(pasteBoxOpen ? null : dateKey)}
                    className="btn-secondary text-sm py-3 sm:py-2"
                  >
                    {pasteBoxOpen ? 'Hide Paste Box' : 'Paste / Auto-Fill'}
                  </button>
                </div>
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
Prayer Request: Sis. Ana | Prayer for birthday and anniversary celebrants
Testimony: Bro. Mark
Tithes & Offering: Sis. Grace
Scripture Reading: Youth
Special Song: Music Team
Kids: Children Ministry
Teens: Teen Ministry
Youth Bible Study: Ptr. Manny
Adult Bible Study: Sis. Emma
Praises & Worship: Music Team
Message: Ptr. Manny
Closing Prayer: Bro. Chris
Activity of the Day: Youth Bible Study`}
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

              <div>
                <label className="text-sm font-semibold text-primary mb-1 block">
                  Activity of the Day
                </label>
                <input
                  value={dateItem.activity || ''}
                  onChange={e => updateActivity(dateIndex, e.target.value)}
                  className="input-field text-base sm:text-sm"
                  placeholder="Optional. If none, just leave blank."
                />
              </div>

              <div className="grid grid-cols-1 gap-3">
                {SCHEDULE_FIELDS.map(position => {
                  const personValue = getAssignmentValue(dateItem, position);
                  const notesValue = getAssignmentNotes(dateItem, position);
                  const optional = isOptionalField(position);
                  const required = isRequiredField(position);

                  return (
                    <div
                      key={position}
                      className={`rounded-xl border p-3 ${
                        required
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

                        {optional ? (
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
                          optional
                            ? 'If none, just leave blank'
                            : `Enter name for ${position}`
                        }
                      />

                      <input
                        value={notesValue}
                        onChange={e => updateNotes(dateIndex, position, e.target.value)}
                        className="input-field text-base sm:text-sm mt-2"
                        placeholder="Optional note, e.g. prayer for birthday/anniversary. If none, just leave blank."
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-3 flex-col sm:flex-row">
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