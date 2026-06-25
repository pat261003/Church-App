import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fetchSong } from '../api/songs';
import { Song, SongSection } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import { transposeLyrics, transposeKey, ALL_KEYS, isChordLine } from '../utils/transpose';
import { getSongDocxExportUrl } from '../api/songs';

function getChordTokens(chordLine: string) {
  const tokens: { chord: string; index: number }[] = [];
  const regex = /\S+/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(chordLine)) !== null) {
    tokens.push({
      chord: match[0],
      index: match.index,
    });
  }

  return tokens;
}

function renderChordOverLyric(chordLine: string, lyricLine: string, keyPrefix: string) {
  const chords = getChordTokens(chordLine);

  if (chords.length === 0) {
    return (
      <div key={keyPrefix} className="lyric-only-line">
        {lyricLine || ' '}
      </div>
    );
  }

  const pieces = [];
  let cursor = 0;

  chords.forEach((chord, index) => {
    const chordPosition = Math.max(0, Math.min(chord.index, lyricLine.length));

    if (chordPosition > cursor) {
      pieces.push({
        chord: '',
        lyric: lyricLine.slice(cursor, chordPosition),
      });
      cursor = chordPosition;
    }

    const nextChordPosition =
      index + 1 < chords.length
        ? Math.max(chordPosition, Math.min(chords[index + 1].index, lyricLine.length))
        : lyricLine.length;

    pieces.push({
      chord: chord.chord,
      lyric: lyricLine.slice(cursor, nextChordPosition) || ' ',
    });

    cursor = nextChordPosition;
  });

  if (cursor < lyricLine.length) {
    pieces.push({
      chord: '',
      lyric: lyricLine.slice(cursor),
    });
  }

  return (
    <div key={keyPrefix} className="chord-lyric-line">
      {pieces.map((piece, i) => (
        <span key={i} className="chord-segment">
          <span className="chord-name">{piece.chord || '\u00A0'}</span>
          <span className="lyric-text">{piece.lyric || '\u00A0'}</span>
        </span>
      ))}
    </div>
  );
}

function renderSongLines(content: string) {
  const lines = content.split('\n');
  const rendered = [];

  for (let i = 0; i < lines.length; i++) {
    const currentLine = lines[i];
    const nextLine = lines[i + 1];

    if (
      isChordLine(currentLine) &&
      nextLine !== undefined &&
      !isChordLine(nextLine)
    ) {
      rendered.push(renderChordOverLyric(currentLine, nextLine, `pair-${i}`));
      i++;
      continue;
    }

    if (isChordLine(currentLine)) {
      rendered.push(
        <div key={`chords-${i}`} className="chord-only-line">
          {currentLine.trim().split(/\s+/).map((chord, chordIndex) => (
            <span key={chordIndex} className="chord-name mr-6">
              {chord}
            </span>
          ))}
        </div>
      );
      continue;
    }

    rendered.push(
      <div key={`line-${i}`} className="lyric-only-line">
        {currentLine || ' '}
      </div>
    );
  }

  return rendered;
}

function LyricsSection({ section, currentKey, originalKey }: {
  section: SongSection;
  currentKey: string;
  originalKey: string;
}) {
  const content = transposeLyrics(section.content, originalKey, currentKey);

  return (
    <div className="mb-6">
      <span className="section-label mb-2 inline-block">
        {section.section_type}
      </span>

      <div className="chord-lyrics-box font-mono text-[12px] sm:text-sm bg-church-lightblue rounded-lg p-3 max-w-full">
        {renderSongLines(content)}
      </div>
    </div>
  );
}

export default function SongDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const lineupKey = searchParams.get('key');
  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentKey, setCurrentKey] = useState('');

  useEffect(() => {
    if (!id) return;
    fetchSong(id)
      .then(data => {
        setSong(data);
        setCurrentKey(lineupKey || data.current_key || data.original_key);
      })
      .catch(() => toast.error('Failed to load song'))
      .finally(() => setLoading(false));
  }, [id, lineupKey]);

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
