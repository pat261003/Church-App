import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { fetchAttendance, addAttendance, updateAttendance, deleteAttendance } from '../api/attendance';
import { AttendanceRecord } from '../types';
import ConfirmModal from '../components/ConfirmModal';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatTimePH, getTodayDate } from '../utils/csv';
import { ATTENDANCE_GROUPS, getAttendanceGroupCounts } from '../utils/attendanceGroups';

export default function Attendance() {
  const today = getTodayDate();
  const [date, setDate] = useState(today);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');

  const [fullName, setFullName] = useState('');
  const [contact, setContact] = useState('');
  const [ministry, setMinistry] = useState('');
  const [notes, setNotes] = useState('');

  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editContact, setEditContact] = useState('');
  const [editMinistry, setEditMinistry] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<AttendanceRecord | null>(null);
  const [editConfirm, setEditConfirm] = useState(false);

  useEffect(() => {
    loadRecords();
  }, [date]);

  async function loadRecords() {
    setLoading(true);
    try {
      const data = await fetchAttendance(date);
      setRecords(data);
    } catch {
      toast.error('Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!fullName.trim()) return toast.error('Full name is required');
    if (!ministry) return toast.error('Age/Gender group is required');

    setSubmitting(true);
    try {
      const record = await addAttendance({
        full_name: fullName,
        attendance_date: date,
        contact_number: contact,
        ministry_group: ministry,
        notes,
      });

      setRecords(prev => [...prev, record]);
      setFullName('');
      setContact('');
      setMinistry('');
      setNotes('');

      toast.success(`${record.full_name} registered at ${formatTimePH(record.entered_at)}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || 'Failed to register attendance');
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(r: AttendanceRecord) {
    setEditId(r.id);
    setEditName(r.full_name);
    setEditContact(r.contact_number || '');
    setEditMinistry(r.ministry_group || '');
    setEditNotes(r.notes || '');
  }

  async function handleUpdate() {
    if (!editId || !editName.trim()) return toast.error('Name is required');
    if (!editMinistry) return toast.error('Age/Gender group is required');

    setEditConfirm(false);

    try {
      const updated = await updateAttendance(editId, {
        full_name: editName,
        contact_number: editContact,
        ministry_group: editMinistry,
        notes: editNotes,
      });

      setRecords(prev => prev.map(r => r.id === editId ? updated : r));
      setEditId(null);
      toast.success('Updated successfully');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || 'Failed to update');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    try {
      await deleteAttendance(deleteTarget.id);
      setRecords(prev => prev.filter(r => r.id !== deleteTarget.id));
      toast.success(`${deleteTarget.full_name} removed`);
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeleteTarget(null);
    }
  }

  const filtered = records.filter(r =>
    r.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (r.ministry_group || '').toLowerCase().includes(search.toLowerCase())
  );

  const groupCounts = getAttendanceGroupCounts(records);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-church-navy">Sunday Attendance</h1>
          <p className="text-sm text-gray-500">
            Male: {groupCounts.male} · Female: {groupCounts.female}
          </p>
          <p className="text-xs text-gray-400">
            Male Children: {groupCounts.maleChild} · Female Children: {groupCounts.femaleChild} · Male Youth: {groupCounts.maleYouth} · Female Youth: {groupCounts.femaleYouth}
          </p>
        </div>

        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="input-field w-auto"
        />
      </div>

      <form onSubmit={handleSubmit} className="card">
        <h2 className="font-semibold text-primary mb-4">Register Attendee</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-gray-600 mb-1 block">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="e.g. Juan Dela Cruz"
              className="input-field"
              autoComplete="name"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600 mb-1 block">
              Contact Number
            </label>
            <input
              value={contact}
              onChange={e => setContact(e.target.value)}
              placeholder="Optional"
              className="input-field"
              type="tel"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600 mb-1 block">
              Age/Gender Group <span className="text-red-500">*</span>
            </label>
            <select
              value={ministry}
              onChange={e => setMinistry(e.target.value)}
              className="input-field"
            >
              <option value="">Select group</option>
              {ATTENDANCE_GROUPS.map(group => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-gray-600 mb-1 block">Notes</label>
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Optional"
              className="input-field"
            />
          </div>
        </div>

        <button type="submit" disabled={submitting} className="btn-primary mt-4 w-full sm:w-auto">
          {submitting ? 'Registering...' : 'Register Attendance'}
        </button>
      </form>

      <div className="card">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h2 className="font-semibold text-primary">
            {filtered.length} Attendee{filtered.length !== 1 ? 's' : ''} — {date}
          </h2>

          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name or group..."
            className="input-field w-full sm:w-64"
          />
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <p className="text-4xl mb-2">🙏</p>
            <p>No attendance recorded for this date yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-church-border">
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">#</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Name</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium hidden sm:table-cell">Group</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Time</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.id} className="border-b border-church-border/50 hover:bg-primary-light transition-colors">
                    {editId === r.id ? (
                      <>
                        <td className="py-2 px-3 text-gray-400">{i + 1}</td>

                        <td className="py-2 px-3" colSpan={2}>
                          <div className="flex flex-col gap-1">
                            <input
                              value={editName}
                              onChange={e => setEditName(e.target.value)}
                              className="input-field text-xs py-1"
                              placeholder="Name"
                            />

                            <div className="flex gap-1 flex-col sm:flex-row">
                              <input
                                value={editContact}
                                onChange={e => setEditContact(e.target.value)}
                                className="input-field text-xs py-1"
                                placeholder="Contact"
                              />

                              <select
                                value={editMinistry}
                                onChange={e => setEditMinistry(e.target.value)}
                                className="input-field text-xs py-1"
                              >
                                <option value="">Group</option>
                                {ATTENDANCE_GROUPS.map(group => (
                                  <option key={group} value={group}>
                                    {group}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <input
                              value={editNotes}
                              onChange={e => setEditNotes(e.target.value)}
                              className="input-field text-xs py-1"
                              placeholder="Notes"
                            />
                          </div>
                        </td>

                        <td className="py-2 px-3">{formatTimePH(r.entered_at)}</td>

                        <td className="py-2 px-3">
                          <div className="flex gap-1">
                            <button
                              onClick={() => setEditConfirm(true)}
                              className="text-xs bg-primary text-white px-2 py-1 rounded"
                            >
                              Save
                            </button>

                            <button
                              onClick={() => setEditId(null)}
                              className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-2 px-3 text-gray-400">{i + 1}</td>

                        <td className="py-2 px-3 font-medium">
                          {r.full_name}

                          <div className="sm:hidden mt-1">
                            <span className="text-[11px] bg-primary-light text-primary px-2 py-0.5 rounded-full">
                              {r.ministry_group || 'No group'}
                            </span>
                          </div>

                          {r.notes && <p className="text-xs text-gray-400">{r.notes}</p>}
                        </td>

                        <td className="py-2 px-3 text-gray-500 hidden sm:table-cell">
                          {r.ministry_group || '—'}
                        </td>

                        <td className="py-2 px-3 text-gray-500 whitespace-nowrap">
                          {formatTimePH(r.entered_at)}
                        </td>

                        <td className="py-2 px-3">
                          <div className="flex gap-1">
                            <button
                              onClick={() => startEdit(r)}
                              className="text-xs text-primary hover:underline"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => setDeleteTarget(r)}
                              className="text-xs text-red-500 hover:underline"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {deleteTarget && (
        <ConfirmModal
          title="Remove Attendee"
          message={`Remove "${deleteTarget.full_name}" from ${date}?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          confirmLabel="Remove"
          danger
        />
      )}

      {editConfirm && (
        <ConfirmModal
          title="Save Changes"
          message={`Update attendee name to "${editName}"?`}
          onConfirm={handleUpdate}
          onCancel={() => setEditConfirm(false)}
          confirmLabel="Save"
        />
      )}
    </div>
  );
}