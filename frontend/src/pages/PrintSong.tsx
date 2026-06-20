import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { fetchSong } from '../api/songs';
import { Song, SongSection } from '../types';
import { transposeLyrics } from '../utils/transpose';



function PrintSection({ section, currentKey, originalKey }: {
  section: SongSection;
  currentKey: string;
  originalKey: string;
}) {
  const content = transposeLyrics(section.content, originalKey, currentKey);
  return (
    <div className="mb-5">
      <div className="inline-block bg-gray-800 text-white text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider mb-1">
        {section.section_type}
      </div>
      <div className="song-lyrics font-mono text-sm leading-relaxed pl-1 max-w-full">
        {content.split('\n').map((line, i) => (
          <div key={i} className="song-line">
            {line || ' '}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PrintSong() {
  const { id } = useParams<{ id: string }>();
  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);
  const printed = useRef(false);

  useEffect(() => {
    if (!id) return;
    fetchSong(id)
      .then(data => {
        setSong(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!loading && song && !printed.current) {
      printed.current = true;
      setTimeout(() => window.print(), 400);
    }
  }, [loading, song]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Preparing song for print...</p>
      </div>
    );
  }

  if (!song) return <p className="text-center text-gray-400 py-12">Song not found.</p>;

  const displayKey = song.current_key || song.original_key;

  return (
    <div className="p-8 max-w-2xl mx-auto font-sans">
      {/* Header */}
      <div className="border-b-2 border-gray-300 pb-4 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{song.title}</h1>
            {song.artist && (
              <p className="text-sm text-gray-500 mt-0.5">{song.artist}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="text-sm font-semibold text-gray-700">Key: {displayKey}</div>
            {displayKey !== song.original_key && (
              <div className="text-xs text-gray-400">Original: {song.original_key}</div>
            )}
            {song.tags && (
              <div className="text-xs text-gray-400 mt-1">{song.tags}</div>
            )}
          </div>
        </div>
      </div>

      {/* Sections */}
      {song.sections.map(s => (
        <PrintSection
          key={s.id}
          section={s}
          currentKey={displayKey}
          originalKey={song.original_key}
        />
      ))}

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-300 text-xs text-gray-400 flex justify-between">
        <span>Full Gospel Faith Temple Inc.</span>
        <span>{song.title} · Key of {displayKey}</span>
      </div>

      {/* Print button */}
      <div className="mt-6 text-center no-print">
        <button onClick={() => window.print()} className="btn-primary">
          Print / Save as PDF
        </button>
      </div>
    </div>
  );
}
