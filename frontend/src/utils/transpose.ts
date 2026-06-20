const SHARP_KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const ENHARMONIC: Record<string, string> = {
  C: 'C',
  'C#': 'Db',
  Db: 'C#',
  D: 'D',
  'D#': 'Eb',
  Eb: 'D#',
  E: 'E',
  F: 'F',
  'F#': 'Gb',
  Gb: 'F#',
  G: 'G',
  'G#': 'Ab',
  Ab: 'G#',
  A: 'A',
  'A#': 'Bb',
  Bb: 'A#',
  B: 'B',
};

export const ALL_KEYS = [
  'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E',
  'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'
];

function normalizeToSharp(note: string): string {
  const idx = FLAT_KEYS.indexOf(note);
  return idx !== -1 ? SHARP_KEYS[idx] : note;
}

function useFlatsForKey(key: string): boolean {
  return ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'].includes(key);
}

function getSemitones(fromKey: string, toKey: string): number {
  const fromSharp = normalizeToSharp(fromKey);
  const toSharp = normalizeToSharp(toKey);

  const fromIdx = SHARP_KEYS.indexOf(fromSharp);
  const toIdx = SHARP_KEYS.indexOf(toSharp);

  if (fromIdx === -1 || toIdx === -1) return 0;

  return ((toIdx - fromIdx) + 12) % 12;
}

function transposeRoot(root: string, semitones: number, preferFlat: boolean): string {
  const sharpRoot = normalizeToSharp(root);
  const idx = SHARP_KEYS.indexOf(sharpRoot);

  if (idx === -1) return root;

  const newIdx = ((idx + semitones) % 12 + 12) % 12;
  return preferFlat ? FLAT_KEYS[newIdx] : SHARP_KEYS[newIdx];
}

export function transposeChord(chord: string, semitones: number, preferFlat = false): string {
  const match = chord.match(/^([A-G](?:#|b)?)(.*)$/);

  if (!match) return chord;

  const root = match[1];
  let suffix = match[2] || '';

  suffix = suffix.replace(/\/([A-G](?:#|b)?)/g, (_full, bass) => {
    return '/' + transposeRoot(bass, semitones, preferFlat);
  });

  return transposeRoot(root, semitones, preferFlat) + suffix;
}

function isValidChord(token: string): boolean {
  return /^[A-G](?:#|b)?(?:m|maj|min|dim|aug|sus|add)?\d*(?:sus\d*)?(?:add\d*)?(?:\/[A-G](?:#|b)?)?$/.test(token);
}

export function isChordLine(line: string): boolean {
  const trimmed = line.trim();

  if (!trimmed) return false;

  const tokens = trimmed.split(/\s+/);

  return tokens.length > 0 && tokens.every(isValidChord);
}

export function transposeLyrics(content: string, fromKey: string, toKey: string): string {
  if (fromKey === toKey) return content;

  const semitones = getSemitones(fromKey, toKey);
  const preferFlat = useFlatsForKey(toKey);

  return content
    .split('\n')
    .map(line => {
      // New format:
      //      G      G7       C          G
      // Through many dangers, toils and snares
      if (isChordLine(line)) {
        return line.replace(/[A-G](?:#|b)?(?:m|maj|min|dim|aug|sus|add)?\d*(?:sus\d*)?(?:add\d*)?(?:\/[A-G](?:#|b)?)?/g, chord => {
          return transposeChord(chord, semitones, preferFlat);
        });
      }

      // Old format:
      // [G]Amazing grace how [C]sweet the [G]sound
      return line.replace(/\[([^\]]+)\]/g, (_full, chord) => {
        return `[${transposeChord(chord, semitones, preferFlat)}]`;
      });
    })
    .join('\n');
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