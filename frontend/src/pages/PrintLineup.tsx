import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchLineup } from '../api/lineups';
import { fetchSong } from '../api/songs';
import {
  LineupSongItem,
  ServiceLineup,
  Song,
  SongSection,
} from '../types';
import { formatDatePH } from '../utils/csv';

const SHARP_KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

function normalizeToSharp(note: string) {
  const index = FLAT_KEYS.indexOf(note);
  return index !== -1 ? SHARP_KEYS[index] : note;
}

function getSemitones(fromKey: string, toKey: string) {
  const fromSharp = normalizeToSharp(fromKey);
  const toSharp = normalizeToSharp(toKey);

  const fromIndex = SHARP_KEYS.indexOf(fromSharp);
  const toIndex = SHARP_KEYS.indexOf(toSharp);

  if (fromIndex === -1 || toIndex === -1) return 0;

  return ((toIndex - fromIndex) + 12) % 12;
}

function useFlatsForKey(key: string) {
  const flatKeys = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm'];
  return flatKeys.some(flatKey => key.startsWith(flatKey));
}

function transposeNote(note: string, semitones: number, preferFlat = false): string {
  if (note.includes('/')) {
    const [root, bass] = note.split('/');
    return `${transposeNote(root, semitones, preferFlat)}/${transposeNote(bass, semitones, preferFlat)}`;
  }

  const match = note.match(/^([A-G][b#]?)(.*)$/);
  if (!match) return note;

  const [, root, suffix] = match;
  const sharpRoot = normalizeToSharp(root);
  const index = SHARP_KEYS.indexOf(sharpRoot);

  if (index === -1) return note;

  const newIndex = ((index + semitones) % 12 + 12) % 12;
  const newRoot = preferFlat ? FLAT_KEYS[newIndex] : SHARP_KEYS[newIndex];

  return newRoot + suffix;
}

function isChordToken(token: string) {
  const cleaned = token
    .replace(/[()[\]{}]/g, '')
    .replace(/[|,]/g, '')
    .trim();

  if (!cleaned) return true;
  if (/^N\.?C\.?$/i.test(cleaned)) return true;

  return /^[A-G][b#]?(m|maj|min|dim|aug|sus|add)?[0-9]*(\([^)]+\))?(\/[A-G][b#]?)?$/.test(cleaned);
}

function looksLikeChordLine(line: string) {
  const trimmed = line.trim();

  if (!trimmed) return false;
  if (trimmed.includes('[') && trimmed.includes(']')) return false;

  const tokens = trimmed.split(/\s+/);
  const meaningfulTokens = tokens.filter(token => token.replace(/[|,]/g, '').trim());

  if (meaningfulTokens.length === 0) return false;

  return meaningfulTokens.every(isChordToken);
}

function transposeChordLine(line: string, fromKey: string, toKey: string) {
  if (fromKey === toKey) return line;

  const semitones = getSemitones(fromKey, toKey);
  const preferFlat = useFlatsForKey(toKey);

  return line.replace(
    /([A-G][b#]?(?:m|maj|min|dim|aug|sus|add)?[0-9]*(?:\([^)]+\))?(?:\/[A-G][b#]?)?)/g,
    chord => transposeNote(chord, semitones, preferFlat)
  );
}

function transposeBracketChords(content: string, fromKey: string, toKey: string) {
  if (fromKey === toKey) return content;

  const semitones = getSemitones(fromKey, toKey);
  const preferFlat = useFlatsForKey(toKey);

  return content.replace(/\[([^\]]+)\]/g, (_, chord) => {
    return `[${transposeNote(chord, semitones, preferFlat)}]`;
  });
}

function transposeSongContent(content: string, fromKey: string, toKey: string) {
  const withBracketChords = transposeBracketChords(content, fromKey, toKey);

  return withBracketChords
    .split('\n')
    .map(line => {
      if (looksLikeChordLine(line)) {
        return transposeChordLine(line, fromKey, toKey);
      }

      return line;
    })
    .join('\n');
}

function renderLine(line: string) {
  const parts = line.split(/(\[[^\]]+\])/g);

  return parts.map((part, index) => {
    if (part.startsWith('[') && part.endsWith(']')) {
      return (
        <span key={index} className="font-bold text-gray-900">
          {part.slice(1, -1)}
        </span>
      );
    }

    return <span key={index}>{part}</span>;
  });
}

function getLeaderKey(lineupSong: LineupSongItem, fullSong?: Song) {
  return (
    lineupSong.key_override ||
    lineupSong.current_key ||
    fullSong?.current_key ||
    lineupSong.original_key ||
    fullSong?.original_key ||
    ''
  );
}

function PrintSongLyrics({
  lineupSong,
  fullSong,
}: {
  lineupSong: LineupSongItem;
  fullSong?: Song;
}) {
  const title = fullSong?.title || lineupSong.title || 'Untitled Song';
  const artist = fullSong?.artist || lineupSong.artist;
  const originalKey = fullSong?.original_key || lineupSong.original_key || getLeaderKey(lineupSong, fullSong);
  const leaderKey = getLeaderKey(lineupSong, fullSong);
  const sections = fullSong?.sections || [];

  return (
    <div className="mt-6 pt-5 border-t border-gray-300 break-inside-auto">
      <div className="mb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
            {artist && <p className="text-sm text-gray-500">{artist}</p>}
          </div>

          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-gray-900">Leader Key: {leaderKey || '—'}</p>
            {originalKey && leaderKey && originalKey !== leaderKey && (
              <p className="text-xs text-gray-500">Original: {originalKey}</p>
            )}
          </div>
        </div>

        {lineupSong.song_link && (
          <p className="text-xs text-gray-500 mt-1 break-all">
            Link: {lineupSong.song_link}
          </p>
        )}

        {lineupSong.notes && (
          <p className="text-xs text-gray-500 mt-1">
            Notes: {lineupSong.notes}
          </p>
        )}
      </div>

      {sections.length === 0 ? (
        <p className="text-sm text-gray-400 italic">
          Lyrics not found for this song.
        </p>
      ) : (
        sections.map((section: SongSection) => {
          const transposedContent = originalKey && leaderKey
            ? transposeSongContent(section.content, originalKey, leaderKey)
            : section.content;

          return (
            <div key={section.id || section.section_type} className="mb-5 break-inside-avoid">
              <div className="inline-block bg-gray-800 text-white text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider mb-1">
                {section.section_type}
              </div>

              <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap pl-1">
                {transposedContent.split('\n').map((line, index) => (
                  <div key={index}>{renderLine(line)}</div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default function PrintLineup() {
  const { id } = useParams<{ id: string }>();
  const [lineup, setLineup] = useState<ServiceLineup | null>(null);
  const [songsById, setSongsById] = useState<Record<string, Song>>({});
  const [loading, setLoading] = useState(true);
  const printed = useRef(false);

  useEffect(() => {
    if (!id) return;

    async function loadLineupAndSongs() {
      try {
        const lineupData = await fetchLineup(id!);
        setLineup(lineupData);

        const songIds = Array.from(
          new Set(
            lineupData.sections.flatMap(section =>
              section.songs
                .map(song => song.song_id)
                .filter(Boolean)
            )
          )
        );

        const songResults = await Promise.all(
          songIds.map(async songId => {
            try {
              return await fetchSong(songId);
            } catch {
              return null;
            }
          })
        );

        const nextSongsById: Record<string, Song> = {};

        songResults.forEach(song => {
          if (song) {
            nextSongsById[song.id] = song;
          }
        });

        setSongsById(nextSongsById);
      } finally {
        setLoading(false);
      }
    }

    loadLineupAndSongs();
  }, [id]);

  useEffect(() => {
    if (!loading && lineup && !printed.current) {
      printed.current = true;
      setTimeout(() => window.print(), 600);
    }
  }, [loading, lineup]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Preparing lineup with lyrics and chords...</p>
      </div>
    );
  }

  if (!lineup) {
    return <p className="text-center py-12">Lineup not found.</p>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white text-gray-900">
      <div className="text-center border-b-2 border-gray-300 pb-4 mb-5">
        <h1 className="text-2xl font-bold">FGFT Song Lineup</h1>
        <p className="text-sm font-semibold">{lineup.title}</p>
        <p className="text-sm">
          {formatDatePH(lineup.service_date)} · Song Leader: {lineup.song_leader}
        </p>
        {lineup.notes && (
          <p className="text-sm text-gray-600 mt-1">{lineup.notes}</p>
        )}
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-2">Lineup Summary</h2>

        {lineup.sections.map(section => (
          <div key={section.id || section.section_name} className="mb-3 break-inside-avoid">
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-700 border-b border-gray-300 pb-1 mb-1">
              {section.section_name}
            </h3>

            <ol className="list-decimal list-inside text-sm">
              {section.songs.map(song => {
                const fullSong = songsById[song.song_id];
                const leaderKey = getLeaderKey(song, fullSong);

                return (
                  <li key={song.id || song.song_id} className="mb-1">
                    <span className="font-semibold">
                      {fullSong?.title || song.title || 'Untitled Song'}
                    </span>
                    <span className="text-gray-500"> — Key: {leaderKey || '—'}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-bold text-gray-900 border-b-2 border-gray-300 pb-2 mb-4">
          Lyrics and Chords
        </h2>

        {lineup.sections.map(section => (
          <div key={section.id || section.section_name} className="mb-8">
            <div className="bg-gray-100 border border-gray-300 rounded px-3 py-2 mb-3">
              <h2 className="font-bold text-gray-900">{section.section_name}</h2>
            </div>

            {section.songs.map(song => (
              <PrintSongLyrics
                key={song.id || song.song_id}
                lineupSong={song}
                fullSong={songsById[song.song_id]}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="mt-8 pt-4 border-t border-gray-300 text-xs text-gray-400 flex justify-between">
        <span>Full Gospel Faith Temple Inc.</span>
        <span>{lineup.title}</span>
      </div>

      <div className="no-print mt-6 text-center">
        <button onClick={() => window.print()} className="btn-primary">
          Print / Save as PDF
        </button>
      </div>
    </div>
  );
}