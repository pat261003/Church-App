import axios from 'axios';
import {
  ScheduleAssignmentMatch,
  ServiceSchedule,
  ServiceScheduleInput,
} from '../types';

const BASE = import.meta.env.VITE_API_URL || '';
const api = axios.create({ baseURL: BASE });

export const fetchSchedules = () =>
  api.get<ServiceSchedule[]>('/api/schedules').then(r => r.data);

export const fetchSchedule = (id: string) =>
  api.get<ServiceSchedule>(`/api/schedules/${id}`).then(r => r.data);

export const addSchedule = (data: ServiceScheduleInput) =>
  api.post<ServiceSchedule>('/api/schedules', data).then(r => r.data);

export const updateSchedule = (id: string, data: ServiceScheduleInput) =>
  api.put<ServiceSchedule>(`/api/schedules/${id}`, data).then(r => r.data);

export const deleteSchedule = (id: string) =>
  api.delete(`/api/schedules/${id}`).then(r => r.data);

export const checkScheduleAssignments = (name: string, date: string) =>
  api
    .get<ScheduleAssignmentMatch[]>('/api/schedules/assignment-check', {
      params: { name, date },
    })
    .then(r => r.data);