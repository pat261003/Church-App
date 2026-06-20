import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fetchSong } from '../api/songs';
import { Song, SongSection } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import { transposeLyrics, transposeKey, ALL_KEYS, isChordLine } from '../utils/transpose';
import { getSongDocxExportUrl } from '../api/songs';



function LyricsSection({ section, currentKey, originalKey }: {
  section: SongSection;
  currentKey: string;
  originalKey: string;
}) {
  const content = transposeLyrics(section.content, originalKey, currentKey);

  return (
    <div className="mb-5">
      <span className="section-label mb-2 inline-block">
        {section.section_type}
      </span>

      <div className="song-lyrics font-mono text-[12px] sm:text-sm leading-6 bg-church-lightblue rounded-lg p-3 max-w-full">
        {content.split('\n').map((line, i) => (
          <div
            key={i}
            className={`song-line ${isChordLine(line) ? 'text-primary font-bold' : 'text-church-navy'}`}
          >
            {line || ' '}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SongDetail() {
  const { id } = useParams<{ id: string }>();
  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentKey, setCurrentKey] = useState('');

  useEffect(() => {
    if (!id) return;
    fetchSong(id)
      .then(data => {
        setSong(data);
        setCurrentKey(data.current_key || data.original_key);
      })
      .catch(() => toast.error('Failed to load song'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner label="Loading song..." />;
  if (!song) return <p className="text-center text-gray-400 py-12">Song not found.</p>;

  function handleTransposeUp() {
    setCurrentKey(k => transposeKey(k, 1));
  }

  function handleTransposeDown() {
    setCurrentKey(k => transposeKey(k, -1));
  }

  function handleReset() {
    setCurrentKey(song!.original_key);
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-church-navy">{song.title}</h1>
          {song.artist && <p className="text-gray-500 text-sm">{song.artist}</p>}
          {song.tags && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {song.tags.split(',').map(t => (
                <span key={t} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                  {t.trim()}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to={`/songs/${id}/edit`} className="btn-secondary text-xs">Edit</Link>
          <Link to={`/print/song/${id}`} target="_blank" className="btn-secondary text-xs">Print</Link>
          <a href={getSongDocxExportUrl(id!)} download className="btn-secondary text-xs">Export DOCX</a>
          <Link to="/songs" className="btn-secondary text-xs">← Back</Link>
        </div>
      </div>

      {/* Transpose controls */}
      <div className="card">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-gray-600">Key:</span>
          <div className="flex items-center gap-2">
            <button onClick={handleTransposeDown}
              className="w-8 h-8 rounded-full bg-primary text-white font-bold hover:bg-primary-dark transition-colors">
              −
            </button>
            <span className="w-10 text-center font-bold text-lg text-primary">{currentKey}</span>
            <button onClick={handleTransposeUp}
              className="w-8 h-8 rounded-full bg-primary text-white font-bold hover:bg-primary-dark transition-colors">
              +
            </button>
          </div>

          <select
            value={currentKey}
            onChange={e => setCurrentKey(e.target.value)}
            className="input-field w-auto text-sm"
          >
            {ALL_KEYS.map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>

          <button onClick={handleReset}
            className="text-xs text-gray-500 hover:text-primary underline">
            Reset ({song.original_key})
          </button>

          <span className="text-xs text-gray-400">
            Original: <strong>{song.original_key}</strong>
          </span>
        </div>
      </div>

      {/* Lyrics */}
      <div className="card">
        {song.sections.map(s => (
          <LyricsSection
            key={s.id}
            section={s}
            currentKey={currentKey}
            originalKey={song.original_key}
          />
        ))}
      </div>
    </div>
  );
}
