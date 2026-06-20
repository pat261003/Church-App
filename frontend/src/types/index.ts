export interface AttendanceRecord {
  id: string;
  full_name: string;
  normalized_name: string;
  contact_number: string | null;
  ministry_group: string | null;
  notes: string | null;
  attendance_date: string;
  entered_at: string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceStats {
  todayCount: number;
  dateCount: number;
  monthCount: number;
  earliest: AttendanceRecord | null;
  latest: AttendanceRecord | null;
  sundayStats: { attendance_date: string; count: string }[];
}

export interface SongSection {
  id?: string;
  song_id?: string;
  section_type: string;
  section_order: number;
  content: string;
}

export interface Song {
  id: string;
  title: string;
  normalized_title: string;
  original_key: string;
  current_key: string | null;
  artist: string | null;
  tags: string | null;
  sections: SongSection[];
  created_at: string;
  updated_at: string;
}

export type ToastType = 'success' | 'error' | 'info';
