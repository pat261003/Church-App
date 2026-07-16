import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
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

type EditorMode = 'with-chords' | 'lyrics-only';

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
  const cleaned = cleanHeading(line);
  const lower = cleaned.toLowerCase();

  if (!cleaned) return null;

  if (/^(intro|introduction)$/.test(lower)) return 'Intro';

  const verseMatch = lower.match(/^(verse|v)\s*(\d+)?$/);
  if (verseMatch) {
    return verseMatch[2] ? `Verse ${verseMatch[2]}` : 'Verse';
  }

  if (/^(pre[-\s]?chorus|pre chorus)$/.test(lower)) return 'Pre-Chorus';

  const chorusMatch = lower.match(/^(chorus|refrain|c)\s*(\d+)?$/);
  if (chorusMatch) {
    return chorusMatch[2] ? `Chorus ${chorusMatch[2]}` : 'Chorus';
  }

  const bridgeMatch = lower.match(/^(bridge|b)\s*(\d+)?$/);
  if (bridgeMatch) {
    return bridgeMatch[2] ? `Bridge ${bridgeMatch[2]}` : 'Bridge';
  }

  if (/^(tag)$/.test(lower)) return 'Tag';
  if (/^(ending|end)$/.test(lower)) return 'Ending';
  if (/^(outro)$/.test(lower)) return 'Outro';
  if (/^(instrumental|interlude)$/.test(lower)) return 'Instrumental';

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
  return /^[A-G](?:#|b)?(?:m|maj|min|dim|aug|sus|add|M)?[0-9]*(?:sus[0-9])?(?:add[0-9])?(?:\/[A-G](?:#|b)?)?$/.test(token);
}

function isLikelyChordLine(line: string) {
  const trimmed = line.trim();

  if (!trimmed) return false;

  const tokens = trimmed.split(/\s+/);

  return tokens.length > 0 && tokens.every(isLikelyChordToken);
}

function cleanSectionContent(linesToClean: string[]) {
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

function parseFullSong(rawText: string): SongSection[] {
  const lines = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

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

function SortableSection({
  section,
  index,
  editorMode,
  updateSectionType,
  updateSectionContent,
  removeSection,
}: {
  section: SongSection;
  index: number;
  editorMode: EditorMode;
  updateSectionType: (index: number, value: string) => void;
  updateSectionContent: (index: number, value: string) => void;
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

  const lyricsOnlyContent = getLyricsOnlyText(section.content);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border border-church-border rounded-2xl p-3 sm:p-4 bg-white ${
        isDragging ? 'opacity-70 shadow-lg' : ''
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing px-3 py-3 rounded-xl bg-church-lightblue text-primary font-bold shrink-0 touch-none"
          title="Hold and drag to reorder"
        >
          ☰
        </button>

        <input
          list="section-suggestions"
          value={section.section_type}
          onChange={e => updateSectionType(index, e.target.value)}
          className="input-field flex-1 text-base sm:text-sm min-h-11"
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

      {editorMode === 'with-chords' ? (
        <>
          <textarea
            value={section.content}
            onChange={e => updateSectionContent(index, e.target.value)}
            className="input-field min-h-[45vh] sm:min-h-44 font-mono text-[15px] sm:text-sm resize-y leading-7 p-3"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            placeholder={`Example:

G        C
Amazing grace how sweet the sound
G        D
That saved a wretch like me`}
          />

          <p className="text-[11px] text-gray-400 mt-2">
            Tip: Keep the spaces before chords. Do not remove spaces before the first chord.
          </p>
        </>
      ) : (
        <div className="rounded-xl bg-church-lightblue p-4 min-h-40 whitespace-pre-wrap text-[15px] sm:text-sm leading-8 text-church-navy">
          {lyricsOnlyContent || (
            <span className="text-gray-400">
              No lyrics preview yet. Type or paste lyrics with chords first.
            </span>
          )}
        </div>
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
  const [editorMode, setEditorMode] = useState<EditorMode>('with-chords');
  const [pasteMode, setPasteMode] = useState<EditorMode>('with-chords');

  useEffect(() => {
    if (sections.some(section => !section.client_id)) {
      setSections(prev => withClientIds(prev));
    }
  }, [sections, setSections]);

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

  function handleAutoSplitSong() {
    const parsed = parseFullSong(fullSongText);

    if (parsed.length === 0) {
      toast.error('Paste a song first');
      return;
    }

    setSections(parsed);
    setShowPasteBox(false);
    setFullSongText('');
    setEditorMode('with-chords');
    toast.success(`Created ${parsed.length} section${parsed.length > 1 ? 's' : ''}`);
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

  const pasteLyricsOnlyPreview = getLyricsOnlyText(fullSongText);

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
            Paste a full song, split it into sections, then preview with chords or lyrics only.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowPasteBox(prev => !prev)}
          className="btn-primary sm:btn-secondary text-sm w-full sm:w-auto py-3"
        >
          {showPasteBox ? 'Hide Paste Box' : 'Paste Full Song'}
        </button>
      </div>

      {showPasteBox && (
        <div className="border border-primary/20 bg-primary-light rounded-2xl p-3 sm:p-4 flex flex-col gap-3">
          <div>
            <h3 className="font-semibold text-church-navy text-sm">
              Paste the whole song here
            </h3>
            <p className="text-xs text-gray-500">
              Use headings like Verse 1, Chorus, Bridge, Intro, Outro, Tag.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 bg-white/70 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setPasteMode('with-chords')}
              className={`rounded-lg py-2 text-xs font-bold ${
                pasteMode === 'with-chords'
                  ? 'bg-primary text-white'
                  : 'text-primary hover:bg-primary-light'
              }`}
            >
              With Chords
            </button>

            <button
              type="button"
              onClick={() => setPasteMode('lyrics-only')}
              className={`rounded-lg py-2 text-xs font-bold ${
                pasteMode === 'lyrics-only'
                  ? 'bg-primary text-white'
                  : 'text-primary hover:bg-primary-light'
              }`}
            >
              Lyrics Only Preview
            </button>
          </div>

          {pasteMode === 'with-chords' ? (
            <textarea
              value={fullSongText}
              onChange={e => setFullSongText(e.target.value)}
              className="input-field min-h-[62vh] sm:min-h-72 font-mono text-[15px] sm:text-sm resize-y bg-white leading-7 p-3"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              placeholder={`Example:

Verse 1
    D             G
O Diyos, Ikaw ang tunay na
   A            D
Dakila sa mundo

Chorus
G        D
How great is our God
A        Bm
Sing with me how great is our God`}
            />
          ) : (
            <div className="rounded-xl bg-white p-4 min-h-[45vh] whitespace-pre-wrap text-[15px] sm:text-sm leading-8 text-church-navy overflow-y-auto">
              {pasteLyricsOnlyPreview || (
                <span className="text-gray-400">
                  Paste a song with chords first, then this will show lyrics only.
                </span>
              )}
            </div>
          )}

          <p className="text-[11px] text-gray-500">
            The lyrics-only preview does not delete your chords. It only hides chord lines for easier reading.
          </p>

          <div className="sticky bottom-24 sm:static bg-primary-light pt-2 flex gap-2 flex-col sm:flex-row">
            <button
              type="button"
              onClick={handleAutoSplitSong}
              className="btn-primary text-sm flex-1 py-3"
            >
              Auto Split to Sections
            </button>

            <button
              type="button"
              onClick={() => setFullSongText('')}
              className="btn-secondary text-sm py-3"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 bg-church-lightblue rounded-xl p-1">
        <button
          type="button"
          onClick={() => setEditorMode('with-chords')}
          className={`rounded-lg py-2.5 text-xs font-bold ${
            editorMode === 'with-chords'
              ? 'bg-primary text-white'
              : 'text-primary hover:bg-primary-light'
          }`}
        >
          Edit With Chords
        </button>

        <button
          type="button"
          onClick={() => setEditorMode('lyrics-only')}
          className={`rounded-lg py-2.5 text-xs font-bold ${
            editorMode === 'lyrics-only'
              ? 'bg-primary text-white'
              : 'text-primary hover:bg-primary-light'
          }`}
        >
          Lyrics Only Preview
        </button>
      </div>

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
          className="input-field flex-1 min-w-40 text-base sm:text-sm min-h-11"
          placeholder="Verse 1, Chorus, Bridge..."
        />

        <button type="button" onClick={addSection} className="btn-secondary py-3">
          + Add Section
        </button>
      </div>
    </div>
  );
}