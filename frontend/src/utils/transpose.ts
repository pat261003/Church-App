const SHARP_KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_KEYS  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const ENHARMONIC: Record<string, string> = {
  'C#': 'Db', 'Db': 'C#',
  'D#': 'Eb', 'Eb': 'D#',
  'F#': 'Gb', 'Gb': 'F#',
  'G#': 'Ab', 'Ab': 'G#',
  'A#': 'Bb', 'Bb': 'A#',
};

export const ALL_KEYS = [
  'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E',
  'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'
];

function normalizeToSharp(note: string): string {
  const idx = FLAT_KEYS.indexOf(note);
  return idx !== -1 ? SHARP_KEYS[idx] : note;
}

function transposeNote(note: string, semitones: number, preferFlat = false): string {
  // Handle slash chords like G/B, C/E, D/F#
  if (note.includes('/')) {
    const [root, bass] = note.split('/');
    return `${transposeNote(root, semitones, preferFlat)}/${transposeNote(bass, semitones, preferFlat)}`;
  }

  // Parse root note and suffix (m, maj7, 7, sus4, dim, aug, etc.)
  const match = note.match(/^([A-G][b#]?)(.*)$/);
  if (!match) return note;

  const [, root, suffix] = match;
  const sharpRoot = normalizeToSharp(root);
  const idx = SHARP_KEYS.indexOf(sharpRoot);
  if (idx === -1) return note;

  const newIdx = ((idx + semitones) % 12 + 12) % 12;
  const newRoot = preferFlat ? FLAT_KEYS[newIdx] : SHARP_KEYS[newIdx];
  return newRoot + suffix;
}

function getSemitones(fromKey: string, toKey: string): number {
  const fromSharp = normalizeToSharp(fromKey);
  const toSharp = normalizeToSharp(toKey);
  const fromIdx = SHARP_KEYS.indexOf(fromSharp);
  const toIdx = SHARP_KEYS.indexOf(toSharp);
  if (fromIdx === -1 || toIdx === -1) return 0;
  return ((toIdx - fromIdx) + 12) % 12;
}

function useFlatsForKey(key: string): boolean {
  const flatKeys = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm'];
  return flatKeys.some(k => key.startsWith(k));
}

export function transposeLyrics(content: string, fromKey: string, toKey: string): string {
  if (fromKey === toKey) return content;
  const semitones = getSemitones(fromKey, toKey);
  const preferFlat = useFlatsForKey(toKey);

  return content.replace(/\[([^\]]+)\]/g, (_, chord) => {
    return `[${transposeNote(chord, semitones, preferFlat)}]`;
  });
}

export function transposeKey(key: string, semitones: number): string {
  const sharpKey = normalizeToSharp(key);
  const idx = SHARP_KEYS.indexOf(sharpKey);
  if (idx === -1) return key;
  const newIdx = ((idx + semitones) % 12 + 12) % 12;
  return SHARP_KEYS[newIdx];
}

export function getEnharmonic(key: string): string {
  return ENHARMONIC[key] || key;
}

export function formatLyricsWithChords(content: string): React.ReactNode[] {
  // This is handled in the component with rendering logic
  return content.split('\n').map(line => line);
}
