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

const POSITIONS = [
  'Step of Preparation',
  'Opening Song',
  'Opening Prayer',
  'Tithes',
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
  'Keyboard Operator',
  'Assistants',
  'Closing Prayer',
];

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

function createAssignment(order: number): ServiceScheduleAssignment {
  return {
    position: 'Opening Song',
    person_name: '',
    assignment_order: order,
    notes: '',
  };
}

function reorderDates(dates: ServiceScheduleDate[]) {
  return dates.map((date, dateIndex) => ({
    ...date,
    service_date: String(date.service_date).slice(0, 10),
    date_order: dateIndex,
    assignments: date.assignments.map((assignment, assignmentIndex) => ({
      ...assignment,
      assignment_order: assignmentIndex,
    })),
  }));
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

  function addAssignment(dateIndex: number) {
    setDates(prev =>
      prev.map((date, index) =>
        index === dateIndex
          ? {
              ...date,
              assignments: [
                ...date.assignments,
                createAssignment(date.assignments.length),
              ],
            }
          : date
      )
    );
  }

  function updateAssignment(
    dateIndex: number,
    assignmentIndex: number,
    key: 'position' | 'person_name' | 'notes',
    value: string
  ) {
    setDates(prev =>
      prev.map((date, index) =>
        index === dateIndex
          ? {
              ...date,
              assignments: date.assignments.map((assignment, aIndex) =>
                aIndex === assignmentIndex
                  ? { ...assignment, [key]: value }
                  : assignment
              ),
            }
          : date
      )
    );
  }

  function removeAssignment(dateIndex: number, assignmentIndex: number) {
    setDates(prev =>
      prev.map((date, index) =>
        index === dateIndex
          ? {
              ...date,
              assignments: date.assignments
                .filter((_, aIndex) => aIndex !== assignmentIndex)
                .map((assignment, newIndex) => ({
                  ...assignment,
                  assignment_order: newIndex,
                })),
            }
          : date
      )
    );
  }

  function moveAssignment(dateIndex: number, assignmentIndex: number, direction: -1 | 1) {
    setDates(prev =>
      prev.map((date, index) => {
        if (index !== dateIndex) return date;

        const nextAssignments = [...date.assignments];
        const targetIndex = assignmentIndex + direction;

        if (targetIndex < 0 || targetIndex >= nextAssignments.length) return date;

        const [removed] = nextAssignments.splice(assignmentIndex, 1);
        nextAssignments.splice(targetIndex, 0, removed);

        return {
          ...date,
          assignments: nextAssignments.map((assignment, newIndex) => ({
            ...assignment,
            assignment_order: newIndex,
          })),
        };
      })
    );
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
            placeholder="Optional notes..."
          />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {dates.map((dateItem, dateIndex) => (
          <div key={dateItem.service_date} className="card flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-primary uppercase tracking-wide">
                  Service Date
                </p>
                <h3 className="font-bold text-church-navy text-lg">
                  {formatDisplayDate(dateItem.service_date)}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => addAssignment(dateIndex)}
                className="btn-secondary text-sm py-3 sm:py-2"
              >
                + Add Assignment
              </button>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600 mb-1 block">
                Activity of the Day
              </label>
              <input
                value={dateItem.activity || ''}
                onChange={e => updateActivity(dateIndex, e.target.value)}
                className="input-field text-base sm:text-sm"
                placeholder="Optional, e.g. Youth Bible Study, Birthday Celebration..."
              />
            </div>

            {dateItem.assignments.length === 0 ? (
              <div className="bg-church-lightblue rounded-xl p-4 text-center text-sm text-gray-500">
                No assignments yet for this Sunday.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {dateItem.assignments.map((assignment, assignmentIndex) => (
                  <div
                    key={assignmentIndex}
                    className="bg-church-lightblue rounded-xl p-3 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-center"
                  >
                    <input
                      list="schedule-positions"
                      value={assignment.position}
                      onChange={e =>
                        updateAssignment(dateIndex, assignmentIndex, 'position', e.target.value)
                      }
                      className="input-field text-base sm:text-sm"
                      placeholder="Position"
                    />

                    <input
                      value={assignment.person_name}
                      onChange={e =>
                        updateAssignment(dateIndex, assignmentIndex, 'person_name', e.target.value)
                      }
                      className="input-field text-base sm:text-sm"
                      placeholder="Assigned person"
                    />

                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => moveAssignment(dateIndex, assignmentIndex, -1)}
                        disabled={assignmentIndex === 0}
                        className="btn-secondary text-xs disabled:opacity-40 flex-1 sm:flex-none"
                      >
                        ↑
                      </button>

                      <button
                        type="button"
                        onClick={() => moveAssignment(dateIndex, assignmentIndex, 1)}
                        disabled={assignmentIndex === dateItem.assignments.length - 1}
                        className="btn-secondary text-xs disabled:opacity-40 flex-1 sm:flex-none"
                      >
                        ↓
                      </button>

                      <button
                        type="button"
                        onClick={() => removeAssignment(dateIndex, assignmentIndex)}
                        className="text-red-500 text-xs px-2"
                      >
                        Remove
                      </button>
                    </div>

                    <input
                      value={assignment.notes || ''}
                      onChange={e =>
                        updateAssignment(dateIndex, assignmentIndex, 'notes', e.target.value)
                      }
                      className="input-field text-base sm:text-sm sm:col-span-3"
                      placeholder="Optional notes"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <datalist id="schedule-positions">
        {POSITIONS.map(position => (
          <option key={position} value={position} />
        ))}
      </datalist>

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