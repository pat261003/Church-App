import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import toast from 'react-hot-toast';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SongSection } from '../types';

const SECTION_SUGGESTIONS = [
  'Intro',
  'Verse 1',
  'Verse 2',
  'Verse 3',
  'Verse 4',
  'Pre-Chorus',
  'Chorus',
  'Chorus 2',
  'Bridge',
  'Bridge 2',
  'Tag',
  'Ending',
  'Outro',
  'Instrumental',
];

const PASTE_DRAFT_KEY = 'church-app-song-paste-draft';

type EditorMode = 'edit' | 'preview' | 'lyrics-only';

function makeClientId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createSection(sectionType = 'Verse 1', order = 0): SongSection {
  return {
    client_id: makeClientId(),
    section_type: sectionType,
    section_order: order,
    content: '',
  };
}

export function withClientIds(sections: SongSection[]): SongSection[] {
  return sections.map((section, index) => ({
    ...section,
    client_id: section.client_id || section.id || makeClientId(),
    section_order: index,
  }));
}

function reorderSections(sections: SongSection[]) {
  return sections.map((section, index) => ({
    ...section,
    section_order: index,
  }));
}

function cleanHeading(line: string) {
  return line
    .trim()
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .replace(/:$/, '')
    .trim();
}

function detectSectionHeading(line: string) {
  const trimmedLine = line.trim();
  const cleaned = cleanHeading(line);
  const lower = cleaned.toLowerCase();

  if (!cleaned) return null;

  const isBracketedHeading = /^\[[^\]]+\]$/.test(trimmedLine);

  if (/^(intro|introduction)$/.test(lower)) return 'Intro';

  const verseMatch = lower.match(/^verse\s*(\d+)?$/);
  if (verseMatch) {
    return verseMatch[1] ? `Verse ${verseMatch[1]}` : 'Verse';
  }

  if (/^(pre[-\s]?chorus|pre chorus)$/.test(lower)) return 'Pre-Chorus';

  const chorusMatch = lower.match(/^(chorus|refrain)\s*(\d+)?$/);
  if (chorusMatch) {
    return chorusMatch[2] ? `Chorus ${chorusMatch[2]}` : 'Chorus';
  }

  const bridgeMatch = lower.match(/^bridge\s*(\d+)?$/);
  if (bridgeMatch) {
    return bridgeMatch[1] ? `Bridge ${bridgeMatch[1]}` : 'Bridge';
  }

  if (/^(tag)$/.test(lower)) return 'Tag';
  if (/^(ending|end)$/.test(lower)) return 'Ending';
  if (/^(outro)$/.test(lower)) return 'Outro';
  if (/^(instrumental|interlude)$/.test(lower)) return 'Instrumental';

  /*
    Short forms are only allowed when bracketed.

    [V1] = Verse 1
    [C2] = Chorus 2
    [BR] = Bridge
    [BR2] = Bridge 2

    Plain B or C is NOT treated as Bridge or Chorus,
    because B and C are common chords.
  */
  if (isBracketedHeading) {
    const shortVerseMatch = lower.match(/^v\s*(\d+)$/);
    if (shortVerseMatch) return `Verse ${shortVerseMatch[1]}`;

    const shortChorusMatch = lower.match(/^c\s*(\d+)$/);
    if (shortChorusMatch) return `Chorus ${shortChorusMatch[1]}`;

    const shortBridgeMatch = lower.match(/^br\s*(\d+)?$/);
    if (shortBridgeMatch) {
      return shortBridgeMatch[1] ? `Bridge ${shortBridgeMatch[1]}` : 'Bridge';
    }
  }

  return null;
}

function uniqueSectionName(baseName: string, existingNames: string[]) {
  if (baseName === 'Verse') {
    const verseCount = existingNames.filter(name =>
      name.toLowerCase().startsWith('verse')
    ).length;

    return `Verse ${verseCount + 1}`;
  }

  if (!existingNames.includes(baseName)) {
    return baseName;
  }

  let count = 2;
  let nextName = `${baseName} ${count}`;

  while (existingNames.includes(nextName)) {
    count++;
    nextName = `${baseName} ${count}`;
  }

  return nextName;
}

function isLikelyChordToken(token: string) {
  return /^[A-G](?:#|b)?(?:maj|min|m|dim|aug|sus|add|M)?[0-9]*(?:sus[0-9]*)?(?:add[0-9]*)?(?:[#b][0-9]+)*(?:\/[A-G](?:#|b)?)?$/.test(token);
}

function isLikelyChordLine(line: string) {
  const trimmed = line.trim();

  if (!trimmed) return false;

  const tokens = trimmed.split(/\s+/);

  return tokens.length > 0 && tokens.every(isLikelyChordToken);
}

function cleanSectionContent(linesToClean: string[]) {
  /*
    Do not use .trim() on the joined lyrics/chords content.

    .trim() removes spaces from the first chord line, for example:
        D             G

    We only remove empty lines at the start and end.
    We keep all real chord spacing.
  */
  let start = 0;
  let end = linesToClean.length;

  while (start < end && linesToClean[start].trim() === '') {
    start++;
  }

  while (end > start && linesToClean[end - 1].trim() === '') {
    end--;
  }

  return linesToClean.slice(start, end).join('\n');
}

function normalizeSongTextPreserveSpacing(text: string) {
  const normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u00A0/g, ' ')
    .replace(/\t/g, '    ')
    .split('\n')
    .map(line => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/\n{4,}/g, '\n\n\n');

  return cleanSectionContent(normalized.split('\n'));
}

function getLyricsOnlyText(content: string) {
  return content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter(line => !isLikelyChordLine(line))
    .map(line => line.replace(/\[[^\]]+\]/g, '').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function shiftChordLines(text: string, direction: -1 | 1) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(line => {
      if (!isLikelyChordLine(line)) return line;

      if (direction === 1) {
        return ` ${line}`;
      }

      if (line.startsWith(' ')) {
        return line.slice(1);
      }

      return line;
    })
    .join('\n');
}

function sectionsToFullSongText(sections: SongSection[]) {
  return sections
    .map(section => {
      const heading = `[${section.section_type || 'Verse'}]`;
      const content = normalizeSongTextPreserveSpacing(section.content || '');

      return `${heading}\n${content}`;
    })
    .join('\n\n');
}

function parseFullSong(rawText: string): SongSection[] {
  const cleanedRawText = normalizeSongTextPreserveSpacing(rawText);
  const lines = cleanedRawText.split('\n');

  const parsedSections: SongSection[] = [];
  let currentSectionName = '';
  let currentLines: string[] = [];

  function saveCurrentSection() {
    const content = cleanSectionContent(currentLines);

    if (!content.trim()) return;

    const existingNames = parsedSections.map(section => section.section_type);
    const finalName = uniqueSectionName(currentSectionName || 'Verse', existingNames);

    parsedSections.push({
      client_id: makeClientId(),
      section_type: finalName,
      section_order: parsedSections.length,
      content,
    });

    currentLines = [];
  }

  for (const line of lines) {
    const heading = detectSectionHeading(line);

    if (heading) {
      saveCurrentSection();
      currentSectionName = heading;
      continue;
    }

    currentLines.push(line);
  }

  saveCurrentSection();

  if (parsedSections.length > 0) {
    return parsedSections;
  }

  const fallbackContent = cleanSectionContent(lines);

  if (!fallbackContent.trim()) return [];

  return [
    {
      client_id: makeClientId(),
      section_type: 'Verse 1',
      section_order: 0,
      content: fallbackContent,
    },
  ];
}

function getChordWrapColumnLimit() {
  if (typeof window === 'undefined') return 64;

  const width = window.innerWidth;

  if (width <= 340) return 28;
  if (width <= 380) return 32;
  if (width <= 430) return 36;
  if (width <= 640) return 44;
  if (width <= 768) return 56;

  return 72;
}

function isInsideChordToken(chordLine: string, index: number) {
  const currentChar = chordLine[index] || '';
  const previousChar = chordLine[index - 1] || '';

  return /\S/.test(currentChar) && /\S/.test(previousChar);
}

function findSafeChordLineBreak(
  lyricLine: string,
  chordLine: string,
  start: number,
  maxColumns: number,
  maxLength: number
) {
  const hardEnd = Math.min(start + maxColumns, maxLength);

  if (hardEnd >= maxLength) return maxLength;

  for (let i = hardEnd; i > start + 8; i--) {
    if (/\s/.test(lyricLine[i] || '') && !isInsideChordToken(chordLine, i)) {
      return i;
    }
  }

  for (let i = hardEnd; i < maxLength; i++) {
    if (/\s/.test(lyricLine[i] || '') && !isInsideChordToken(chordLine, i)) {
      return i;
    }
  }

  return maxLength;
}

function wrapChordLyricPair(chordLine: string, lyricLine: string) {
  const maxLength = Math.max(chordLine.length, lyricLine.length);
  const maxColumns = getChordWrapColumnLimit();

  const paddedChordLine = chordLine.padEnd(maxLength, ' ');
  const paddedLyricLine = lyricLine.padEnd(maxLength, ' ');

  const chunks: { chord: string; lyric: string }[] = [];
  let start = 0;

  while (start < maxLength) {
    const end = findSafeChordLineBreak(
      paddedLyricLine,
      paddedChordLine,
      start,
      maxColumns,
      maxLength
    );

    const chord = paddedChordLine.slice(start, end).trimEnd();
    const lyric = paddedLyricLine.slice(start, end).trimEnd();

    if (chord || lyric) {
      chunks.push({
        chord,
        lyric,
      });
    }

    start = end;

    while (
      start < maxLength &&
      paddedLyricLine[start] === ' ' &&
      paddedChordLine[start] === ' '
    ) {
      start++;
    }
  }

  return chunks;
}

function renderChordOverLyric(chordLine: string, lyricLine: string, keyPrefix: string) {
  const chunks = wrapChordLyricPair(chordLine, lyricLine);

  return (
    <div key={keyPrefix} className="accurate-wrapped-pair">
      {chunks.map((chunk, index) => (
        <div key={`${keyPrefix}-${index}`} className="accurate-wrapped-chunk">
          <div className="accurate-chord-line">
            {chunk.chord || ' '}
          </div>

          <div className="accurate-lyric-line">
            {chunk.lyric || ' '}
          </div>
        </div>
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
      isLikelyChordLine(currentLine) &&
      nextLine !== undefined &&
      !isLikelyChordLine(nextLine)
    ) {
      rendered.push(renderChordOverLyric(currentLine, nextLine, `pair-${i}`));
      i++;
      continue;
    }

    if (isLikelyChordLine(currentLine)) {
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

function CountSummary({
  content,
}: {
  content: string;
}) {
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const chordLines = lines.filter(line => isLikelyChordLine(line)).length;
  const lyricLines = lines.filter(line => line.trim() && !isLikelyChordLine(line)).length;

  return (
    <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
      <div className="rounded-lg border border-slate-300 bg-white/70 p-2">
        <p className="font-bold text-primary">{lines.filter(line => line.trim()).length}</p>
        <p className="text-gray-500">Lines</p>
      </div>

      <div className="rounded-lg border border-slate-300 bg-white/70 p-2">
        <p className="font-bold text-primary">{chordLines}</p>
        <p className="text-gray-500">Chord</p>
      </div>

      <div className="rounded-lg border border-slate-300 bg-white/70 p-2">
        <p className="font-bold text-primary">{lyricLines}</p>
        <p className="text-gray-500">Lyrics</p>
      </div>
    </div>
  );
}

function ModeTabs({
  mode,
  onChange,
}: {
  mode: EditorMode;
  onChange: (mode: EditorMode) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-xl bg-church-lightblue p-1 border border-slate-300">
      <button
        type="button"
        onClick={() => onChange('edit')}
        className={`rounded-lg py-2.5 px-2 text-[11px] sm:text-xs font-bold transition-colors ${
          mode === 'edit'
            ? 'bg-primary text-white'
            : 'text-primary hover:bg-primary-light'
        }`}
      >
        Edit Chords
      </button>

      <button
        type="button"
        onClick={() => onChange('preview')}
        className={`rounded-lg py-2.5 px-2 text-[11px] sm:text-xs font-bold transition-colors ${
          mode === 'preview'
            ? 'bg-primary text-white'
            : 'text-primary hover:bg-primary-light'
        }`}
      >
        Preview
      </button>

      <button
        type="button"
        onClick={() => onChange('lyrics-only')}
        className={`rounded-lg py-2.5 px-2 text-[11px] sm:text-xs font-bold transition-colors ${
          mode === 'lyrics-only'
            ? 'bg-primary text-white'
            : 'text-primary hover:bg-primary-light'
        }`}
      >
        Lyrics Only
      </button>
    </div>
  );
}

function ChordSpacingButtons({
  onShiftLeft,
  onShiftRight,
}: {
  onShiftLeft: () => void;
  onShiftRight: () => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={onShiftLeft}
        className="btn-secondary text-xs py-2"
      >
        Move Chord Lines ←
      </button>

      <button
        type="button"
        onClick={onShiftRight}
        className="btn-secondary text-xs py-2"
      >
        Move Chord Lines →
      </button>
    </div>
  );
}

function SavedLookPreview({
  sections,
  mode,
}: {
  sections: SongSection[];
  mode: EditorMode;
}) {
  if (sections.length === 0) {
    return (
      <div className="rounded-xl border border-slate-300 bg-church-lightblue p-4 text-gray-400">
        No song content yet.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-300 bg-white p-3 sm:p-4">
      <div className="flex flex-col gap-5">
        {sections.map((section, index) => {
          const content = normalizeSongTextPreserveSpacing(section.content || '');
          const lyricsOnly = getLyricsOnlyText(content);

          return (
            <div key={section.client_id || section.id || index}>
              <span className="section-label mb-2 inline-block">
                {section.section_type}
              </span>

              {mode === 'lyrics-only' ? (
                <div className="chord-lyrics-box text-[15px] sm:text-base bg-church-lightblue rounded-lg p-4 max-w-full whitespace-pre-wrap leading-8">
                  {lyricsOnly || (
                    <span className="text-gray-400">
                      No lyrics found for this section.
                    </span>
                  )}
                </div>
              ) : (
                <div className="chord-lyrics-box font-mono text-[12px] sm:text-sm bg-church-lightblue rounded-lg p-3 max-w-full">
                  {renderSongLines(content)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SectionDetectionPreview({
  sections,
}: {
  sections: SongSection[];
}) {
  if (sections.length === 0) {
    return (
      <div className="rounded-xl border border-slate-300 bg-white/70 p-3 text-xs text-gray-500">
        No sections detected yet. Use headings like Verse 1, Chorus, Bridge, Intro, Ending.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-300 bg-white/70 p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-xs font-bold text-primary uppercase tracking-wide">
          Detected Sections
        </p>

        <span className="text-[11px] text-gray-500">
          {sections.length} section{sections.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
        {sections.map((section, index) => {
          const lyricPreview = getLyricsOnlyText(section.content)
            .split('\n')
            .find(line => line.trim()) || 'No lyric line preview';

          return (
            <div
              key={`${section.section_type}-${index}`}
              className="rounded-lg border border-slate-200 bg-white p-2"
            >
              <p className="text-sm font-bold text-church-navy">
                {index + 1}. {section.section_type}
              </p>

              <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">
                {lyricPreview}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SortableSection({
  section,
  index,
  editorMode,
  updateSectionType,
  updateSectionContent,
  shiftSectionChordLines,
  removeSection,
}: {
  section: SongSection;
  index: number;
  editorMode: EditorMode;
  updateSectionType: (index: number, value: string) => void;
  updateSectionContent: (index: number, value: string) => void;
  shiftSectionChordLines: (index: number, direction: -1 | 1) => void;
  removeSection: (index: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: section.client_id || section.id || String(index),
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border border-slate-300 rounded-2xl p-3 sm:p-4 bg-white ${
        isDragging ? 'opacity-70 shadow-lg' : ''
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing px-3 py-3 rounded-xl bg-church-lightblue text-primary font-bold shrink-0 touch-none border border-slate-300"
          title="Hold and drag to reorder"
        >
          ☰
        </button>

        <input
          list="section-suggestions"
          value={section.section_type}
          onChange={e => updateSectionType(index, e.target.value)}
          className="input-field flex-1 text-base sm:text-sm min-h-11 border border-slate-300"
          placeholder="Verse 1, Chorus, Bridge..."
        />

        <button
          type="button"
          onClick={() => removeSection(index)}
          className="text-red-500 hover:text-red-600 text-xs sm:text-sm font-semibold px-2 shrink-0"
        >
          Remove
        </button>
      </div>

      {editorMode === 'edit' ? (
        <>
          <textarea
            value={section.content}
            onChange={e => updateSectionContent(index, e.target.value)}
            className="input-field min-h-[45vh] sm:min-h-44 font-mono text-[16px] sm:text-sm resize-y leading-7 p-3 border border-slate-300"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            placeholder={`Example:

    D             G
O Diyos, Ikaw ang tunay na
   A            D
Dakila sa mundo`}
          />

          <div className="mt-3 flex flex-col gap-2">
            <ChordSpacingButtons
              onShiftLeft={() => shiftSectionChordLines(index, -1)}
              onShiftRight={() => shiftSectionChordLines(index, 1)}
            />

            <p className="text-[11px] text-gray-400">
              Tip: Keep the spaces before chords. Do not remove spaces before the first chord.
            </p>
          </div>
        </>
      ) : (
        <SavedLookPreview sections={[section]} mode={editorMode} />
      )}
    </div>
  );
}

export default function SongSectionsEditor({
  sections,
  setSections,
}: {
  sections: SongSection[];
  setSections: Dispatch<SetStateAction<SongSection[]>>;
}) {
  const [newSectionName, setNewSectionName] = useState('Verse 1');
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [fullSongText, setFullSongText] = useState('');
  const [editorMode, setEditorMode] = useState<EditorMode>('edit');
  const [pasteMode, setPasteMode] = useState<EditorMode>('edit');
  const [savedDraft, setSavedDraft] = useState('');

  const hasExistingSongContent = sections.some(section => section.content.trim());

  useEffect(() => {
    if (sections.some(section => !section.client_id)) {
      setSections(prev => withClientIds(prev));
    }
  }, [sections, setSections]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PASTE_DRAFT_KEY) || '';
      setSavedDraft(saved);
    } catch {
      // Ignore localStorage errors.
    }
  }, []);

  useEffect(() => {
    try {
      if (fullSongText.trim()) {
        localStorage.setItem(PASTE_DRAFT_KEY, fullSongText);
        setSavedDraft(fullSongText);
      }
    } catch {
      // Ignore localStorage errors.
    }
  }, [fullSongText]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const detectedSections = useMemo(() => {
    if (!fullSongText.trim()) return [];

    return parseFullSong(fullSongText);
  }, [fullSongText]);

  function updateSectionType(index: number, value: string) {
    setSections(prev =>
      prev.map((section, sectionIndex) =>
        sectionIndex === index ? { ...section, section_type: value } : section
      )
    );
  }

  function updateSectionContent(index: number, value: string) {
    setSections(prev =>
      prev.map((section, sectionIndex) =>
        sectionIndex === index ? { ...section, content: value } : section
      )
    );
  }

  function shiftSectionChordLines(index: number, direction: -1 | 1) {
    setSections(prev =>
      prev.map((section, sectionIndex) =>
        sectionIndex === index
          ? { ...section, content: shiftChordLines(section.content, direction) }
          : section
      )
    );
  }

  function removeSection(index: number) {
    setSections(prev => reorderSections(prev.filter((_, sectionIndex) => sectionIndex !== index)));
  }

  function addSection() {
    const sectionName = newSectionName.trim();

    if (!sectionName) {
      toast.error('Section name is required');
      return;
    }

    setSections(prev =>
      reorderSections([
        ...prev,
        createSection(sectionName, prev.length),
      ])
    );
  }

  function openFullSongEditor() {
    if (hasExistingSongContent) {
      setFullSongText(sectionsToFullSongText(sections));
      setPasteMode('edit');
      setShowPasteBox(true);
      return;
    }

    if (!fullSongText && savedDraft) {
      setFullSongText(savedDraft);
    }

    setPasteMode('edit');
    setShowPasteBox(true);
  }

  function handleCleanPaste() {
    const cleaned = normalizeSongTextPreserveSpacing(fullSongText);

    setFullSongText(cleaned);
    toast.success('Paste cleaned while keeping chord spacing');
  }

  function handleClearPaste() {
    setFullSongText('');
    setSavedDraft('');

    try {
      localStorage.removeItem(PASTE_DRAFT_KEY);
    } catch {
      // Ignore localStorage errors.
    }
  }

  function handleRestoreDraft() {
    if (!savedDraft) return;

    setFullSongText(savedDraft);
    setShowPasteBox(true);
    toast.success('Draft restored');
  }

  function handleAutoSplitSong() {
    const parsed = parseFullSong(fullSongText);

    if (parsed.length === 0) {
      toast.error('Paste a song first');
      return;
    }

    setSections(parsed);
    setShowPasteBox(false);
    setFullSongText('');
    setSavedDraft('');
    setEditorMode('edit');

    try {
      localStorage.removeItem(PASTE_DRAFT_KEY);
    } catch {
      // Ignore localStorage errors.
    }

    toast.success(`Updated ${parsed.length} section${parsed.length > 1 ? 's' : ''}`);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    setSections(prev => {
      const oldIndex = prev.findIndex(section => (section.client_id || section.id) === active.id);
      const newIndex = prev.findIndex(section => (section.client_id || section.id) === over.id);

      if (oldIndex === -1 || newIndex === -1) return prev;

      return reorderSections(arrayMove(prev, oldIndex, newIndex));
    });
  }

  return (
    <div className="card flex flex-col gap-4">
      <datalist id="section-suggestions">
        {SECTION_SUGGESTIONS.map(section => (
          <option key={section} value={section} />
        ))}
      </datalist>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-semibold text-primary">Song Sections</h2>
          <p className="text-xs text-gray-400">
            Paste or edit the full song, preview the saved look, then save the song.
          </p>
        </div>

        <div className="flex gap-2 flex-col sm:flex-row w-full sm:w-auto">
          {savedDraft && !fullSongText && !hasExistingSongContent && (
            <button
              type="button"
              onClick={handleRestoreDraft}
              className="btn-secondary text-sm py-3"
            >
              Restore Draft
            </button>
          )}

          <button
            type="button"
            onClick={showPasteBox ? () => setShowPasteBox(false) : openFullSongEditor}
            className="btn-primary sm:btn-secondary text-sm w-full sm:w-auto py-3"
          >
            {showPasteBox
              ? 'Hide Full Song Editor'
              : hasExistingSongContent
                ? 'Edit Full Song'
                : 'Paste Full Song'}
          </button>
        </div>
      </div>

      {showPasteBox && (
        <div className="fixed inset-0 z-[80] overflow-y-auto bg-church-lightblue p-3 sm:static sm:z-auto sm:overflow-visible sm:bg-transparent sm:p-0">
          <div className="border border-slate-300 bg-primary-light rounded-2xl p-3 sm:p-4 flex flex-col gap-3 min-h-full sm:min-h-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-church-navy text-base sm:text-sm">
                  {hasExistingSongContent ? 'Edit the full song here' : 'Paste the whole song here'}
                </h3>

                <p className="text-xs text-gray-500">
                  Only the Edit Chords tab is editable. Preview and Lyrics Only are read-only.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowPasteBox(false)}
                className="btn-secondary text-xs sm:hidden"
              >
                Close
              </button>
            </div>

            <ModeTabs mode={pasteMode} onChange={setPasteMode} />

            {pasteMode === 'edit' ? (
              <>
                <textarea
                  value={fullSongText}
                  onChange={e => setFullSongText(e.target.value)}
                  className="input-field min-h-[62vh] sm:min-h-72 font-mono text-[16px] sm:text-sm resize-y bg-white leading-7 p-3 border border-slate-300"
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                  placeholder={`Example:

[Verse 1]
    D             G
O Diyos, Ikaw ang tunay na
   A            D
Dakila sa mundo

[Chorus]
G        D
How great is our God
A        Bm
Sing with me how great is our God`}
                />

                <ChordSpacingButtons
                  onShiftLeft={() => setFullSongText(prev => shiftChordLines(prev, -1))}
                  onShiftRight={() => setFullSongText(prev => shiftChordLines(prev, 1))}
                />

                <p className="text-[11px] text-gray-500">
                  Draft auto-saves on this device while you type. The clean button keeps chord spacing.
                </p>
              </>
            ) : (
              <SavedLookPreview
                sections={detectedSections}
                mode={pasteMode}
              />
            )}

            <CountSummary content={fullSongText} />

            <SectionDetectionPreview sections={detectedSections} />

            <div className="sticky bottom-0 sm:static bg-primary-light pt-2 pb-2 flex gap-2 flex-col sm:flex-row">
              <button
                type="button"
                onClick={handleAutoSplitSong}
                className="btn-primary text-sm flex-1 py-3"
              >
                {hasExistingSongContent ? 'Update Sections from Full Song' : 'Auto Split to Sections'}
              </button>

              <button
                type="button"
                onClick={handleCleanPaste}
                className="btn-secondary text-sm py-3"
              >
                Clean Paste
              </button>

              <button
                type="button"
                onClick={handleClearPaste}
                className="btn-secondary text-sm py-3"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      <ModeTabs mode={editorMode} onChange={setEditorMode} />

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={sections.map(section => section.client_id || section.id || '')}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-3">
            {sections.map((section, index) => (
              <SortableSection
                key={section.client_id || section.id || index}
                section={section}
                index={index}
                editorMode={editorMode}
                updateSectionType={updateSectionType}
                updateSectionContent={updateSectionContent}
                shiftSectionChordLines={shiftSectionChordLines}
                removeSection={removeSection}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex gap-2 flex-col sm:flex-row">
        <input
          list="section-suggestions"
          value={newSectionName}
          onChange={e => setNewSectionName(e.target.value)}
          className="input-field flex-1 min-w-40 text-base sm:text-sm min-h-11 border border-slate-300"
          placeholder="Verse 1, Chorus, Bridge..."
        />

        <button type="button" onClick={addSection} className="btn-secondary py-3">
          + Add Section
        </button>
      </div>
    </div>
  );
}