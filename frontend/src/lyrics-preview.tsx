import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import { HashRouter, Link, NavLink, Routes, Route, Navigate } from 'react-router-dom';
import type { Song } from './types';
import './index.css';

// This standalone preview uses sample data only; the main app is unaffected.
const songs: Song[] = [
  { id: 'preview-1', title: 'Morning Light (Demo)', original_key: 'G', current_key: 'G',
    normalized_title: 'morning light', artist: 'Sample lyrics for testing', tags: null,
    created_at: '', updated_at: '', sections: ['Verse 1', 'Chorus', 'Verse 2', 'Chorus', 'Bridge', 'Final Chorus'].map((section_type, i) => ({
      id: `first-${i}`, section_type, section_order: i,
      content: '[G]Morning light across the [C]sky\n[Em]Every voice is rising [D]high\n[G]Side by side we gather [C]here\n[Am]With a song for all to [D]hear',
    })),
  },
  { id: 'preview-2', title: 'Together We Sing (Demo)', original_key: 'C', current_key: 'C',
    normalized_title: 'together we sing', artist: 'Sample lyrics for testing', tags: null,
    created_at: '', updated_at: '', sections: ['Verse', 'Chorus', 'Verse 2', 'Bridge', 'Chorus'].map((section_type, i) => ({
      id: `second-${i}`, section_type, section_order: i,
      content: 'C                F\nHere we stand together\nAm               G\nWith a melody to share\nC                F\nEvery note a new beginning\nDm               G\nEvery voice upon the air',
    })),
  },
];

axios.defaults.adapter = async config => {
  if (config.method !== 'get') throw new Error('This sample preview is read-only.');
  const id = config.url?.split('/').pop();
  const data = config.url === '/api/songs' ? songs
    : config.url === '/api/lineups/demo-lineup' ? {
      id: 'demo-lineup', title: 'Sunday Demo Lineup', service_date: '2026-09-20', song_leader: 'Demo Leader', notes: null,
      sections: [{ id: 'demo-section', section_name: 'Worship', section_order: 0,
        songs: songs.map((song, index) => ({ id: `entry-${index}`, song_id: song.id, title: song.title,
          song_order: index, key_override: index === 0 ? 'A' : 'D', original_key: song.original_key })) }],
    } : songs.find(item => item.id === id);
  if (!data) throw new Error('Only sample songs are available in this preview.');
  return { data, status: 200, statusText: 'OK', headers: {}, config };
};

// Load after configuring the preview adapter, before songs.ts creates its client.
const SongDetail = React.lazy(() => import('./pages/SongDetail'));
const LineupDetail = React.lazy(() => import('./pages/LineupDetail'));

function Preview() {
  return <HashRouter><React.Suspense fallback={<p>Loading preview…</p>}>
    <div className="max-w-3xl mx-auto p-4 pb-32">
      <p className="text-sm text-gray-500 mb-4">Sample preview · No Render connection needed</p>
      <nav className="flex gap-3 mb-6" aria-label="Preview tabs">
        <NavLink to="/songs" className={({ isActive }) => isActive ? 'btn-primary' : 'btn-secondary'}>Songs</NavLink>
        <NavLink to="/lineups" className={({ isActive }) => isActive ? 'btn-primary' : 'btn-secondary'}>Lineups</NavLink>
      </nav>
      <Routes>
        <Route path="/" element={<Navigate to="/songs" replace />} />
        <Route path="/songs" element={<>
          <h1 className="text-2xl font-bold mb-4">Songs</h1>
          <p className="mb-4">Choose a song, then tap Fullscreen lyrics. Exit fullscreen to return to the song; Back to songs returns here.</p>
          {songs.map(song => <Link className="card block mb-3" key={song.id} to={`/songs/${song.id}`}><strong>{song.title}</strong><p>Key: {song.original_key} · Open lyrics →</p></Link>)}
        </>} />
        <Route path="/songs/:id" element={<SongDetail />} />
        <Route path="/lineups" element={<><h1 className="text-2xl font-bold mb-4">Lineups</h1><Link className="card block" to="/lineups/demo-lineup">Sunday Demo Lineup →</Link></>} />
        <Route path="/lineups/:id" element={<LineupDetail />} />
        <Route path="*" element={<p>Editing and printing are unavailable in this sample preview. Use the Songs or Lineups tab above.</p>} />
      </Routes>
    </div>
  </React.Suspense></HashRouter>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Preview />);
