import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchSchedule } from '../api/schedules';
import { ServiceSchedule } from '../types';

const MONTHS = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatDate(dateValue: string) {
  const dateOnly = String(dateValue).slice(0, 10);
  const date = new Date(`${dateOnly}T00:00:00`);

  return date.toLocaleDateString('en-PH', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function PrintSchedule() {
  const { id } = useParams<{ id: string }>();
  const [schedule, setSchedule] = useState<ServiceSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const printed = useRef(false);

  useEffect(() => {
    if (!id) return;

    fetchSchedule(id)
      .then(setSchedule)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!loading && schedule && !printed.current) {
      printed.current = true;
      setTimeout(() => window.print(), 500);
    }
  }, [loading, schedule]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Preparing schedule PDF...</p>
      </div>
    );
  }

  if (!schedule) return <p className="text-center py-12">Schedule not found.</p>;

  return (
    <div className="p-6 max-w-5xl mx-auto bg-white text-gray-900">
      <div className="text-center border-b-2 border-gray-300 pb-4 mb-5">
        <h1 className="text-2xl font-bold">FGFT Sunday Service Schedule</h1>
        <p className="text-sm">
          {MONTHS[schedule.schedule_month]} {schedule.schedule_year}
        </p>
        <p className="text-sm font-semibold">{schedule.title}</p>
      </div>

      <div className="grid grid-cols-1 gap-5">
        {schedule.dates.map(dateItem => (
          <div key={dateItem.id || dateItem.service_date} className="border border-gray-300 rounded-lg overflow-hidden break-inside-avoid">
            <div className="bg-gray-100 px-3 py-2 flex justify-between gap-3">
              <h2 className="font-bold">{formatDate(dateItem.service_date)}</h2>
              <p className="text-sm">
                Activity: <span className="font-semibold">{dateItem.activity || 'None'}</span>
              </p>
            </div>

            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="border border-gray-300 px-2 py-1 text-left w-1/3">Position</th>
                  <th className="border border-gray-300 px-2 py-1 text-left w-1/3">Assigned Person</th>
                  <th className="border border-gray-300 px-2 py-1 text-left w-1/3">Notes</th>
                </tr>
              </thead>

              <tbody>
                {dateItem.assignments.length === 0 ? (
                  <tr>
                    <td className="border border-gray-300 px-2 py-2 text-center" colSpan={3}>
                      No assignments
                    </td>
                  </tr>
                ) : (
                  dateItem.assignments.map(assignment => (
                    <tr key={assignment.id}>
                      <td className="border border-gray-300 px-2 py-1">{assignment.position}</td>
                      <td className="border border-gray-300 px-2 py-1 font-semibold">{assignment.person_name}</td>
                      <td className="border border-gray-300 px-2 py-1">{assignment.notes || ''}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div className="no-print mt-6 text-center">
        <button onClick={() => window.print()} className="btn-primary">
          Print / Save as PDF
        </button>
      </div>
    </div>
  );
}