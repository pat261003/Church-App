import { useState, useEffect, useMemo, useRef, type TouchEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fetchSong, fetchSongs, getSongDocxExportUrl } from '../api/songs';
import { Song, SongSection } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import { transposeLyrics, transposeKey, ALL_KEYS, isChordLine } from '../utils/transpose';

const SWIPE_DISTANCE = 70;
const SWIPE_VERTICAL_LIMIT = 90;

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

function LyricsSection({
  section,
  currentKey,
  originalKey,
}: {
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

function FloatingAutoScrollControls({
  autoScroll,
  scrollSpeed,
  setAutoScroll,
  setScrollSpeed,
}: {
  autoScroll: boolean;
  scrollSpeed: number;
  setAutoScroll: React.Dispatch<React.SetStateAction<boolean>>;
  setScrollSpeed: React.Dispatch<React.SetStateAction<number>>;
}) {
  function decreaseSpeed() {
    setScrollSpeed(prev => Math.max(5, prev - 5));
  }

  function increaseSpeed() {
    setScrollSpeed(prev => Math.min(150, prev + 5));
  }

  return (
    <div
      className="no-print fixed right-4 bottom-24 md:bottom-6 z-[60]"
      onTouchStart={e => e.stopPropagation()}
      onTouchEnd={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center gap-2 rounded-full bg-primary/85 backdrop-blur-md border border-white/20 shadow-xl px-2.5 py-2 text-white">
        <button
          type="button"
          onClick={decreaseSpeed}
          className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 font-bold active:scale-95"
          aria-label="Decrease scroll speed"
        >
          −
        </button>

        <button
          type="button"
          onClick={() => setAutoScroll(prev => !prev)}
          className="w-11 h-11 rounded-full bg-white text-primary font-extrabold shadow active:scale-95"
          aria-label={autoScroll ? 'Pause auto scroll' : 'Start auto scroll'}
        >
          {autoScroll ? 'Ⅱ' : '▶'}
        </button>

        <button
          type="button"
          onClick={increaseSpeed}
          className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 font-bold active:scale-95"
          aria-label="Increase scroll speed"
        >
          +
        </button>

        <div className="pr-1 min-w-[42px] text-center">
          <p className="text-[10px] font-bold leading-none">{scrollSpeed}</p>
          <p className="text-[9px] text-white/75 leading-none mt-0.5">px/s</p>
        </div>
      </div>
    </div>
  );
}

export default function SongDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const lineupKey = searchParams.get('key');

  const [song, setSong] = useState<Song | null>(null);
  const [songList, setSongList] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentKey, setCurrentKey] = useState('');

  const [autoScroll, setAutoScroll] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(35);
  const [pendingSwipeTitle, setPendingSwipeTitle] = useState('');

  const lyricsRef = useRef<HTMLDivElement | null>(null);
  const shouldJumpToLyricsRef = useRef(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const currentSongIndex = useMemo(() => {
    if (!id) return -1;
    return songList.findIndex(item => item.id === id);
  }, [id, songList]);

  const previousSong = currentSongIndex > -1 && songList.length > 1
    ? songList[(currentSongIndex - 1 + songList.length) % songList.length]
    : null;

  const nextSong = currentSongIndex > -1 && songList.length > 1
    ? songList[(currentSongIndex + 1) % songList.length]
    : null;

  useEffect(() => {
    fetchSongs()
      .then(setSongList)
      .catch(() => {
        // Swipe navigation will simply be unavailable if this fails.
      });
  }, []);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setAutoScroll(false);

    fetchSong(id)
      .then(data => {
        setSong(data);
        setCurrentKey(lineupKey || data.current_key || data.original_key);
        setPendingSwipeTitle('');

        setLoading(false);

        window.setTimeout(() => {
          if (shouldJumpToLyricsRef.current && lyricsRef.current) {
            const top = lyricsRef.current.getBoundingClientRect().top + window.scrollY - 12;
            window.scrollTo({ top, behavior: 'smooth' });
            shouldJumpToLyricsRef.current = false;
          } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }, 80);
      })
      .catch(() => {
        toast.error('Failed to load song');
        setLoading(false);
      });
  }, [id, lineupKey]);

  useEffect(() => {
    if (!autoScroll) return;

    let animationFrame: number;
    let lastTime = performance.now();

    function step(now: number) {
      const elapsed = now - lastTime;
      lastTime = now;

      const reachedBottom =
        window.innerHeight + window.scrollY >= document.body.scrollHeight - 4;

      if (reachedBottom) {
        setAutoScroll(false);
        return;
      }

      window.scrollBy({
        top: (scrollSpeed * elapsed) / 1000,
        behavior: 'auto',
      });

      animationFrame = window.requestAnimationFrame(step);
    }

    animationFrame = window.requestAnimationFrame(step);

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [autoScroll, scrollSpeed]);

  if (loading && pendingSwipeTitle) {
    return (
      <>
        <div className="flex flex-col gap-6 max-w-2xl mx-auto">
          <div className="card">
            <p className="text-xs font-bold text-primary uppercase tracking-wide">
              Loading next song
            </p>
            <h1 className="text-2xl font-bold text-church-navy break-words mt-1">
              {pendingSwipeTitle}
            </h1>
            <div className="mt-4">
              <LoadingSpinner label="Loading lyrics..." />
            </div>
          </div>
        </div>

        <FloatingAutoScrollControls
          autoScroll={autoScroll}
          scrollSpeed={scrollSpeed}
          setAutoScroll={setAutoScroll}
          setScrollSpeed={setScrollSpeed}
        />
      </>
    );
  }

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

  function goToSong(targetSong: Song | null) {
    if (!targetSong) return;

    setAutoScroll(false);
    setPendingSwipeTitle(targetSong.title);
    shouldJumpToLyricsRef.current = true;
    navigate(`/songs/${targetSong.id}`);
  }

  function handleTouchStart(e: TouchEvent<HTMLDivElement>) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e: TouchEvent<HTMLDivElement>) {
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;

    const diffX = endX - touchStartX.current;
    const diffY = endY - touchStartY.current;

    if (Math.abs(diffY) > SWIPE_VERTICAL_LIMIT) return;
    if (Math.abs(diffX) < SWIPE_DISTANCE) return;

    if (diffX < 0) {
      goToSong(nextSong);
      return;
    }

    goToSong(previousSong);
  }

  return (
    <>
      <div className="flex flex-col gap-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-church-navy break-words">
              {song.title}
            </h1>

            {song.artist && (
              <p className="text-gray-500 text-sm mt-1">
                {song.artist}
              </p>
            )}

            {song.tags && (
              <div className="flex gap-1 mt-2 flex-wrap">
                {song.tags.split(',').map(t => (
                  <span
                    key={t}
                    className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded"
                  >
                    {t.trim()}
                  </span>
                ))}
              </div>
            )}

            <div className="flex gap-2 flex-wrap mt-3">
              <Link to="/songs" className="btn-secondary text-xs">
                ← Back
              </Link>

              <Link to={`/songs/${id}/edit`} className="btn-secondary text-xs">
                Edit
              </Link>

              <button onClick={() => window.print()} className="btn-secondary text-xs">
                Print
              </button>

              <a href={getSongDocxExportUrl(id!)} download className="btn-secondary text-xs">
                Export DOCX
              </a>
            </div>
          </div>
        </div>

        {/* Swipe navigation */}
        {songList.length > 1 && (
          <div className="card no-print">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => goToSong(previousSong)}
                className="btn-secondary text-xs"
              >
                ← Previous
              </button>

              <div className="text-center min-w-0">
                <p className="text-xs font-bold text-primary uppercase tracking-wide">
                  Swipe Lyrics
                </p>
                <p className="text-[11px] text-gray-400">
                  Swipe left/right inside lyrics
                </p>
              </div>

              <button
                type="button"
                onClick={() => goToSong(nextSong)}
                className="btn-secondary text-xs"
              >
                Next →
              </button>
            </div>
          </div>
        )}

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
        <div
          ref={lyricsRef}
          className="card"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="mb-5 border-b border-church-border pb-3">
            <p className="text-xs font-bold text-primary uppercase tracking-wide">
              Now Singing
            </p>

            <h2 className="text-xl font-bold text-church-navy break-words mt-1">
              {song.title}
            </h2>

            {songList.length > 1 && (
              <p className="text-[11px] text-gray-400 mt-1 no-print">
                Swipe left for next song, right for previous song.
              </p>
            )}
          </div>

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

      <FloatingAutoScrollControls
        autoScroll={autoScroll}
        scrollSpeed={scrollSpeed}
        setAutoScroll={setAutoScroll}
        setScrollSpeed={setScrollSpeed}
      />
    </>
  );
}