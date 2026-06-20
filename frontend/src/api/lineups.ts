import axios from 'axios';
import { ServiceLineup, ServiceLineupInput } from '../types';

const BASE = import.meta.env.VITE_API_URL || '';
const api = axios.create({ baseURL: BASE });

export const fetchLineups = () =>
  api.get<ServiceLineup[]>('/api/lineups').then(r => r.data);

export const fetchLineup = (id: string) =>
  api.get<ServiceLineup>(`/api/lineups/${id}`).then(r => r.data);

export const addLineup = (data: ServiceLineupInput) =>
  api.post<ServiceLineup>('/api/lineups', data).then(r => r.data);

export const updateLineup = (id: string, data: ServiceLineupInput) =>
  api.put<ServiceLineup>(`/api/lineups/${id}`, data).then(r => r.data);

export const deleteLineup = (id: string) =>
  api.delete(`/api/lineups/${id}`).then(r => r.data);