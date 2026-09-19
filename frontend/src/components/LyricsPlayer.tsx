import { useEffect, useRef, useState } from 'react';
import { fetchSong } from '../api/songs';
import { Song } from '../types';
import { ALL_KEYS, isChordLine, transposeLyrics } from '../utils/transpose';
import './LyricsPlayer.css';

type Entry = { id: string; key?: string | null };
type Piece = { chord: string; lyric: string };

// Split before transposing so a longer chord name cannot move its lyric anchor.
function splitLines(content: string): Piece[][] {
  const lines = content.split('\n');
  return lines.reduce<Piece[][]>((rows, line, index) => {
    if (index > 0 && isChordLine(lines[index - 1]) && !isChordLine(line)) return rows;
    if (isChordLine(line)) {
      const lyric = lines[index + 1] && !isChordLine(lines[index + 1]) ? lines[index + 1] : '';
      const matches = [...line.matchAll(/\S+/g)];
      const pieces: Piece[] = [];
      if (matches[0].index! > 0) pieces.push({ chord: '', lyric: lyric.slice(0, matches[0].index) });
      matches.forEach((match, i) => pieces.push({
        chord: match[0], lyric: lyric.slice(match.index, matches[i + 1]?.index),
      }));
      rows.push(pieces);
    } else {
      const pieces: Piece[] = [];
      const pattern = /\[([^\]]+)\]/g;
      let start = 0;
      let chord = '';
      for (const match of line.matchAll(pattern)) {
        pieces.push({ chord, lyric: line.slice(start, match.index) });
        chord = match[1];
        start = match.index! + match[0].length;
      }
      pieces.push({ chord, lyric: line.slice(start) });
      rows.push(pieces);
    }
    return rows;
  }, []);
}

export default function LyricsPlayer({ initialSong, entries, initialIndex, initialKey, onClose }: {
  initialSong: Song; entries: Entry[]; initialIndex: number; initialKey: string; onClose: () => void;
}) {
  const playlist = entries.length ? entries : [{ id: initialSong.id }];
  const [index, setIndex] = useState(Math.max(0, initialIndex));
  const [song, setSong] = useState(initialSong);
  const [key, setKey] = useState(initialKey);
  const [chords, setChords] = useState(true);
  const [preview, setPreview] = useState(false);
  const [menu, setMenu] = useState(true);
  const [size, setSize] = useState(24);
  const [speed, setSpeed] = useState(35);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const previousScroll = useRef(0);
  const request = useRef(0);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.showModal();
    return () => { document.body.style.overflow = previousOverflow; request.current++; };
  }, []);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = performance.now();
    let position = scroller.current?.scrollTop || 0;
    const tick = (now: number) => {
      const element = scroller.current;
      if (!element) return;
      position += speed * Math.min(now - last, 100) / 1000;
      element.scrollTop = position;
      last = now;
      if (element.scrollTop + element.clientHeight >= element.scrollHeight - 1) {
        setPlaying(false);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed]);

  async function move(direction: number) {
    if (playlist.length < 2 || loading) return;
    const next = (index + direction + playlist.length) % playlist.length;
    const token = ++request.current;
    setPlaying(false);
    setLoading(true);
    setError('');
    try {
      const data = await fetchSong(playlist[next].id);
      if (request.current !== token) return;
      setSong(data);
      setKey(playlist[next].key || data.current_key || data.original_key);
      setIndex(next);
      if (scroller.current) scroller.current.scrollTop = 0;
      previousScroll.current = 0;
      setMenu(true);
    } catch {
      if (request.current === token) setError('Could not load the song. Please try Previous or Next again.');
    } finally {
      if (request.current === token) setLoading(false);
    }
  }

  const sections = song.sections.map(section => ({ ...section, rows: splitLines(section.content) }));
  const transpose = (chord: string) => chord ? transposeLyrics(`[${chord}]`, song.original_key, key).slice(1, -1) : '';

  return (
    <dialog ref={dialog} className="lyrics-player" aria-label="Fullscreen lyrics" onCancel={onClose}
      onKeyDown={event => {
        if ((event.target as HTMLElement).closest('button, select, input')) return;
        if (event.key === 'ArrowLeft') { event.preventDefault(); void move(-1); }
        if (event.key === 'ArrowRight') { event.preventDefault(); void move(1); }
      }}>
      <div className="player-scroll" ref={scroller} tabIndex={0}
        onWheel={() => setPlaying(false)}
        onScroll={event => {
          const top = event.currentTarget.scrollTop;
          if (Math.abs(top - previousScroll.current) > 8) {
            setMenu(top < previousScroll.current || top < 20);
            previousScroll.current = top;
          }
        }}
        onTouchStart={event => {
          setPlaying(false);
          touch.current = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
        }}
        onTouchCancel={() => { touch.current = null; }}
        onTouchEnd={event => {
          const start = touch.current;
          touch.current = null;
          if (!start) return;
          const dx = event.changedTouches[0].clientX - start.x;
          const dy = event.changedTouches[0].clientY - start.y;
          if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) void move(dx < 0 ? 1 : -1);
        }}>
        <main className="player-content" style={{ fontSize: size }} aria-busy={loading}>
          <p className="player-meta">Song {index + 1} of {playlist.length} · Key {key}</p>
          <h1>{song.title}</h1>
          {song.artist && <p className="player-meta">{song.artist}</p>}
          <p className="player-meta">Swipe left / right to change songs. Scroll up to show controls.</p>
          {loading && <p role="status">Loading next song…</p>}
          {error && <p role="alert">{error}</p>}
          {preview && <aside className="player-preview" aria-label="Musician chord preview">
            <h2>Musician chord preview · {key}</h2>
            {sections.map((section, i) => <div key={i}>
              <strong>{section.section_type}</strong>
              <p>{section.rows.flat().filter(piece => piece.chord).map(piece => transpose(piece.chord)).join('  ·  ') || 'No chords entered'}</p>
            </div>)}
          </aside>}
          {sections.length === 0 && <p>No lyrics have been entered for this song.</p>}
          {sections.map((section, i) => <section key={i} className="player-section">
            <h2>{section.section_type}</h2>
            {section.rows.map((row, j) => <div key={j} className="player-line">
              {row.map((piece, k) => <span key={k} className="player-piece">
                {chords && <span className="player-chord">{transpose(piece.chord) || '\u00a0'}</span>}
                <span>{piece.lyric || (piece.chord ? '' : '\u00a0')}</span>
              </span>)}
            </div>)}
          </section>)}
        </main>
      </div>
      <div className="player-menu-toggle">
        <button onClick={() => setMenu(value => !value)} aria-expanded={menu} aria-controls="player-controls">{menu ? 'Hide menu' : 'Show menu'}</button>
        <button onClick={onClose}>Exit fullscreen</button>
      </div>
      {menu && <nav id="player-controls" className="player-controls" aria-label="Lyrics controls">
        <button disabled={loading || playlist.length < 2} onClick={() => void move(-1)}>← Previous</button>
        <button disabled={loading || playlist.length < 2} onClick={() => void move(1)}>Next →</button>
        <label>Key <select value={key} onChange={e => setKey(e.target.value)}>{ALL_KEYS.map(value => <option key={value}>{value}</option>)}</select></label>
        <button aria-pressed={chords} onClick={() => setChords(value => !value)}>{chords ? 'With chords' : 'Lyrics only'}</button>
        <button aria-pressed={preview} onClick={() => {
          setPreview(value => !value);
          setPlaying(false);
          scroller.current?.scrollTo({ top: 0 });
        }}>Chord preview</button>
        <label>Text <select value={size} onChange={e => setSize(Number(e.target.value))}>{[18, 24, 32, 40].map(value => <option key={value}>{value}</option>)}</select></label>
        <button disabled={loading} aria-pressed={playing} onClick={() => setPlaying(value => !value)}>{playing ? 'Pause' : 'Auto-scroll'}</button>
        <label>Speed <select value={speed} onChange={e => setSpeed(Number(e.target.value))}>{[15, 25, 35, 50, 75].map(value => <option key={value} value={value}>{value} px/s</option>)}</select></label>
      </nav>}
    </dialog>
  );
}
