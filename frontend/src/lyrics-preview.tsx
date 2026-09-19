import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
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
  const id = config.url?.split('/').pop();
  const song = songs.find(item => item.id === id);
  if (!song) throw new Error('Only sample songs are available in this preview.');
  return { data: song, status: 200, statusText: 'OK', headers: {}, config };
};

// Load after configuring the preview adapter, before songs.ts creates its client.
const LyricsPlayer = React.lazy(() => import('./components/LyricsPlayer'));

function Preview() {
  const [open, setOpen] = React.useState(true);
  return <React.Suspense fallback={<p>Loading preview…</p>}>
    <div className="max-w-xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Lyrics player preview</h1>
      <p className="mb-4">This preview uses two sample songs. No Render connection is needed. Try swiping, changing keys, chord preview, and scrolling to hide or show the menu.</p>
      <button className="btn-primary" onClick={() => setOpen(true)}>Open fullscreen player</button>
    </div>
    {open && <LyricsPlayer initialSong={songs[0]} initialKey="G" entries={songs.map(song => ({ id: song.id }))} initialIndex={0} onClose={() => setOpen(false)} />}
  </React.Suspense>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Preview />);
