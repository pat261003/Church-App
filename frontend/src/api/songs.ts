import axios from 'axios';
import { Song } from '../types';

const BASE = import.meta.env.VITE_API_URL || '';
const api = axios.create({ baseURL: BASE });

export const fetchSongs = () =>
  api.get<Song[]>('/api/songs').then(r => r.data);

export const searchSongs = (q: string) =>
  api.get<Song[]>(`/api/songs/search?q=${encodeURIComponent(q)}`).then(r => r.data);

export const fetchSong = (id: string) =>
  api.get<Song>(`/api/songs/${id}`).then(r => r.data);

export const addSong = (data: Omit<Song, 'id' | 'normalized_title' | 'created_at' | 'updated_at'>) =>
  api.post<Song>('/api/songs', data).then(r => r.data);

export const updateSong = (
  id: string,
  data: Omit<Song, 'id' | 'normalized_title' | 'created_at' | 'updated_at'>
) => api.put<Song>(`/api/songs/${id}`, data).then(r => r.data);

export const deleteSong = (id: string) =>
  api.delete(`/api/songs/${id}`).then(r => r.data);

export const getSongDocxExportUrl = (id: string): string =>
  `${BASE}/api/songs/${id}/export/docx`;
