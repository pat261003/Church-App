import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fetchLineup } from '../api/lineups';
import { fetchSong } from '../api/songs';
import { ServiceLineup, Song, SongSection } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatDatePH } from '../utils/csv';
import { transposeLyrics, transposeKey, ALL_KEYS, isChordLine } from '../utils/transpose';

const SWIPE_DISTANCE = 70;
const SWIPE_VERTICAL_LIMIT = 90;

function getSongLink(songId: string, key?: string | null) {
  if (!key) return `/songs/${songId}`;

  return `/songs/${songId}?key=${encodeURIComponent(key)}`;
}

function normalizeExternalLink(link?: string | null) {
  if (!link) return '';

  const trimmed = link.trim();

  if (!trimmed) return '';

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

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

export default function LineupDetail() {
  const { id } = useParams<{ id: string }>();

  const [lineup, setLineup] = useState<ServiceLineup | null>(null);
  const [loading, setLoading] = useState(true);

  const [singingMode, setSingingMode] = useState(true);
  const [activeSongIndex, setActiveSongIndex] = useState(0);
  const [activeSongDetail, setActiveSongDetail] = useState<Song | null>(null);
  const [loadingSong, setLoadingSong] = useState(false);
  const [currentKey, setCurrentKey] = useState('');

  const [autoScroll, setAutoScroll] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(35);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  useEffect(() => {
    if (!id) return;

    fetchLineup(id)
      .then(data => {
        setLineup(data);
        setActiveSongIndex(0);
      })
      .catch(() => toast.error('Failed to load lineup'))
      .finally(() => setLoading(false));
  }, [id]);

  const lineupSongs = useMemo(() => {
    if (!lineup) return [];

    return lineup.sections.flatMap(section =>
      section.songs.map((song, index) => ({
        sectionName: section.section_name,
        song,
        indexInSection: index,
      }))
    );
  }, [lineup]);

  const activeLineupSong = lineupSongs[activeSongIndex] || null;

  useEffect(() => {
    if (!activeLineupSong) {
      setActiveSongDetail(null);
      return;
    }

    setLoadingSong(true);
    setAutoScroll(false);

    fetchSong(activeLineupSong.song.song_id)
      .then(data => {
        setActiveSongDetail(data);

        const leaderKey =
          activeLineupSong.song.key_override ||
          data.current_key ||
          data.original_key;

        setCurrentKey(leaderKey);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      })
      .catch(() => toast.error('Failed to load lineup song lyrics'))
      .finally(() => setLoadingSong(false));
  }, [activeLineupSong?.song.song_id, activeLineupSong?.song.key_override]);

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

  if (loading) return <LoadingSpinner label="Loading lineup..." />;
  if (!lineup) return <p className="text-center text-gray-400 py-12">Lineup not found.</p>;

  function goToLineupSong(direction: -1 | 1) {
    if (lineupSongs.length === 0) return;

    setAutoScroll(false);

    setActiveSongIndex(prev => {
      const next = prev + direction;

      if (next < 0) return lineupSongs.length - 1;
      if (next >= lineupSongs.length) return 0;

      return next;
    });
  }

  function handleTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e: React.TouchEvent<HTMLDivElement>) {
    if (!singingMode) return;

    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;

    const diffX = endX - touchStartX.current;
    const diffY = endY - touchStartY.current;

    if (Math.abs(diffY) > SWIPE_VERTICAL_LIMIT) return;
    if (Math.abs(diffX) < SWIPE_DISTANCE) return;

    if (diffX < 0) {
      goToLineupSong(1);
      return;
    }

    goToLineupSong(-1);
  }

  function handleTransposeUp() {
    setCurrentKey(k => transposeKey(k, 1));
  }

  function handleTransposeDown() {
    setCurrentKey(k => transposeKey(k, -1));
  }

  function handleReset() {
    if (!activeSongDetail) return;

    const leaderKey =
      activeLineupSong?.song.key_override ||
      activeSongDetail.current_key ||
      activeSongDetail.original_key;

    setCurrentKey(leaderKey);
  }

  return (
    <div
      className="max-w-3xl mx-auto flex flex-col gap-5"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-church-navy break-words">
            {lineup.title}
          </h1>

          <p className="text-gray-500 text-sm mt-1">
            {formatDatePH(lineup.service_date)} · Song Leader: {lineup.song_leader}
          </p>

          {lineup.notes && (
            <p className="text-sm text-gray-500 mt-1">
              {lineup.notes}
            </p>
          )}

          <div className="flex gap-2 flex-wrap mt-3">
            <Link to="/lineups" className="btn-secondary text-xs">
              ← Back
            </Link>

            <Link to={`/lineups/${lineup.id}/edit`} className="btn-secondary text-xs">
              Edit
            </Link>

            <Link to={`/print/lineup/${lineup.id}`} className="btn-secondary text-xs">
              Print
            </Link>

            {lineupSongs.length > 0 && (
              <button
                type="button"
                onClick={() => setSingingMode(prev => !prev)}
                className={singingMode ? 'btn-primary text-xs' : 'btn-secondary text-xs'}
              >
                {singingMode ? 'Show Lineup List' : 'Singing Mode'}
              </button>
            )}
          </div>
        </div>
      </div>

      {lineupSongs.length === 0 ? (
        <div className="card">
          <p className="text-center text-gray-400 py-6">No songs in this lineup.</p>
        </div>
      ) : singingMode ? (
        <>
          {/* Lineup song navigation */}
          <div className="card no-print">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => goToLineupSong(-1)}
                className="btn-secondary text-xs"
              >
                ← Previous
              </button>

              <div className="text-center min-w-0">
                <p className="text-xs font-bold text-primary uppercase tracking-wide">
                  Song {activeSongIndex + 1} of {lineupSongs.length}
                </p>
                <p className="text-[11px] text-gray-400">
                  Swipe left or right to switch lineup songs
                </p>
              </div>

              <button
                type="button"
                onClick={() => goToLineupSong(1)}
                className="btn-secondary text-xs"
              >
                Next →
              </button>
            </div>
          </div>

          {activeLineupSong && (
            <div className="card">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <span className="section-label mb-2 inline-block">
                    {activeLineupSong.sectionName}
                  </span>

                  <h2 className="text-xl font-bold text-church-navy break-words">
                    {activeLineupSong.song.title}
                  </h2>

                  <p className="text-xs text-gray-500 mt-1">
                    Leader Key: {currentKey || '—'}
                    {activeLineupSong.song.artist ? ` · ${activeLineupSong.song.artist}` : ''}
                  </p>

                  {activeLineupSong.song.notes && (
                    <p className="text-xs text-gray-400 mt-1">
                      {activeLineupSong.song.notes}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Link
                    to={getSongLink(activeLineupSong.song.song_id, currentKey)}
                    className="btn-secondary text-xs"
                  >
                    Open Full Song
                  </Link>

                  {normalizeExternalLink(activeLineupSong.song.song_link) && (
                    <a
                      href={normalizeExternalLink(activeLineupSong.song.song_link)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary text-xs"
                    >
                      Attached Link
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Transpose controls */}
          {activeSongDetail && (
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
                  Reset
                </button>

                <span className="text-xs text-gray-400">
                  Original: <strong>{activeSongDetail.original_key}</strong>
                </span>
              </div>
            </div>
          )}

          {/* Auto scroll controls */}
          <div className="card no-print">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="font-semibold text-primary text-sm">
                    Auto Scroll
                  </h2>
                  <p className="text-xs text-gray-400">
                    Use this while singing the lineup on mobile.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setAutoScroll(prev => !prev)}
                  className={autoScroll ? 'btn-primary text-xs' : 'btn-secondary text-xs'}
                >
                  {autoScroll ? 'Pause Scroll' : 'Start Scroll'}
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3 mb-1">
                  <label className="text-xs font-bold text-primary uppercase tracking-wide">
                    Speed
                  </label>

                  <span className="text-xs text-gray-500">
                    {scrollSpeed}px/sec
                  </span>
                </div>

                <input
                  type="range"
                  min="10"
                  max="120"
                  step="5"
                  value={scrollSpeed}
                  onChange={e => setScrollSpeed(Number(e.target.value))}
                  className="w-full accent-primary"
                />

                <div className="grid grid-cols-4 gap-2 mt-2">
                  <button type="button" onClick={() => setScrollSpeed(20)} className="btn-secondary text-[11px] px-2 py-1">
                    Slow
                  </button>
                  <button type="button" onClick={() => setScrollSpeed(35)} className="btn-secondary text-[11px] px-2 py-1">
                    Normal
                  </button>
                  <button type="button" onClick={() => setScrollSpeed(60)} className="btn-secondary text-[11px] px-2 py-1">
                    Fast
                  </button>
                  <button type="button" onClick={() => setScrollSpeed(90)} className="btn-secondary text-[11px] px-2 py-1">
                    Faster
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Lyrics */}
          <div className="card">
            {loadingSong ? (
              <LoadingSpinner label="Loading song lyrics..." />
            ) : activeSongDetail ? (
              activeSongDetail.sections.map(section => (
                <LyricsSection
                  key={section.id}
                  section={section}
                  currentKey={currentKey}
                  originalKey={activeSongDetail.original_key}
                />
              ))
            ) : (
              <p className="text-center text-gray-400 py-6">
                Lyrics not available for this song.
              </p>
            )}
          </div>
        </>
      ) : (
        <div className="card flex flex-col gap-5">
          {lineup.sections.map(section => (
            <div key={section.id}>
              <span className="section-label mb-2 inline-block">
                {section.section_name}
              </span>

              <div className="flex flex-col gap-2">
                {section.songs.map((song, index) => {
                  const leaderKey = song.key_override || song.current_key || song.original_key || '';
                  const attachedLink = normalizeExternalLink(song.song_link);

                  return (
                    <div
                      key={song.id}
                      className="bg-church-lightblue rounded-lg p-3 flex flex-col gap-3"
                    >
                      <div>
                        <Link
                          to={getSongLink(song.song_id, leaderKey)}
                          className="font-bold text-primary hover:underline text-base"
                        >
                          {index + 1}. {song.title}
                        </Link>

                        <p className="text-xs text-gray-500">
                          Leader Key: {leaderKey || '—'}
                          {song.artist ? ` · ${song.artist}` : ''}
                        </p>

                        {song.notes && (
                          <p className="text-xs text-gray-400 mt-1">{song.notes}</p>
                        )}
                      </div>

                      <div className="flex gap-2 flex-col sm:flex-row">
                        <Link
                          to={getSongLink(song.song_id, leaderKey)}
                          className="btn-secondary text-xs text-center"
                        >
                          Open Lyrics
                        </Link>

                        {attachedLink && (
                          <a
                            href={attachedLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-primary text-xs text-center"
                          >
                            Open Attached Link
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}