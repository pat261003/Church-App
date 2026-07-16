import axios from 'axios';
import { AttendanceRecord, AttendanceStats } from '../types';
import type { AttendancePrintGroup } from '../utils/attendanceGroups';

const BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({ baseURL: BASE });

export type ScheduleAssignmentNotice = {
  title: string;
  service_date: string;
  activity?: string | null;
  position: string;
  person_name: string;
  notes?: string | null;
};

export type KnownAttendee = {
  id: string;
  normalized_name: string;
  full_name: string;
  contact_number?: string | null;
  ministry_group?: string | null;
  notes?: string | null;
  entered_at?: string;
};

// Keep Render from cold-starting: ping on load
export const pingServer = () =>
  api.get('/health').catch(() => {});

export const fetchAttendance = (date: string) =>
  api.get<AttendanceRecord[]>(`/api/attendance?date=${date}`).then(r => r.data);

export const fetchMonthAttendance = (month: number, year: number) =>
  api.get<AttendanceRecord[]>(`/api/attendance/month?month=${month}&year=${year}`).then(r => r.data);

export const fetchStats = (date: string) =>
  api.get<AttendanceStats>(`/api/attendance/stats?date=${date}`).then(r => r.data);

export const fetchKnownAttendees = () =>
  api.get<KnownAttendee[]>('/api/attendance/people').then(r => r.data);

export const addAttendance = (data: {
  full_name: string;
  attendance_date: string;
  contact_number?: string;
  ministry_group?: string;
  notes?: string;
}) => api.post<AttendanceRecord>('/api/attendance', data).then(r => r.data);

export const checkScheduleAssignments = (name: string, date: string) =>
  api.get<ScheduleAssignmentNotice[]>('/api/schedules/assignment-check', {
    params: {
      name,
      date,
    },
  }).then(r => r.data);

export const updateAttendance = (
  id: string,
  data: { full_name: string; contact_number?: string; ministry_group?: string; notes?: string }
) => api.put<AttendanceRecord>(`/api/attendance/${id}`, data).then(r => r.data);

export const deleteAttendance = (id: string) =>
  api.delete(`/api/attendance/${id}`).then(r => r.data);

export const getCSVUrl = (date?: string, month?: number, year?: number): string => {
  if (date) return `${BASE}/api/attendance/export/csv?date=${date}`;
  return `${BASE}/api/attendance/export/csv?month=${month}&year=${year}`;
};

export const getXLSXUrl = (date?: string, month?: number, year?: number): string => {
  if (date) return `${BASE}/api/attendance/export/xlsx?date=${date}`;
  return `${BASE}/api/attendance/export/xlsx?month=${month}&year=${year}`;
};

export const getPrintAttendanceUrl = (
  date: string,
  group: AttendancePrintGroup = 'all'
): string => {
  const params = new URLSearchParams();

  params.set('date', date);
  params.set('group', group);

  return `/print/attendance?${params.toString()}`;
};