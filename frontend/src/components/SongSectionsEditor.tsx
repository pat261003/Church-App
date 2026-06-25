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

function parseFullSong(rawText: string): SongSection[] {
  const lines = rawText.replace(/\r\n/g, '\n').split('\n');

  const parsedSections: SongSection[] = [];
  let currentSectionName = '';
  let currentLines: string[] = [];

  function saveCurrentSection() {
    const content = currentLines.join('\n').trim();

    if (!content) return;

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

  const fallbackContent = rawText.trim();

  if (!fallbackContent) return [];

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
  updateSectionType,
  updateSectionContent,
  removeSection,
}: {
  section: SongSection;
  index: number;
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border border-church-border rounded-xl p-3 bg-white ${
        isDragging ? 'opacity-70 shadow-lg' : ''
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing px-3 py-3 rounded-lg bg-church-lightblue text-primary font-bold shrink-0"
          title="Hold and drag to reorder"
        >
          ☰
        </button>

        <input
          list="section-suggestions"
          value={section.section_type}
          onChange={e => updateSectionType(index, e.target.value)}
          className="input-field flex-1 text-base sm:text-sm"
          placeholder="Verse 1, Chorus, Bridge..."
        />

        <button
          type="button"
          onClick={() => removeSection(index)}
          className="text-red-400 hover:text-red-600 text-sm font-semibold px-2 shrink-0"
        >
          Remove
        </button>
      </div>

      <textarea
        value={section.content}
        onChange={e => updateSectionContent(index, e.target.value)}
        className="input-field min-h-52 sm:min-h-40 font-mono text-base sm:text-sm resize-y leading-7"
        placeholder={`Example:

G        C
Amazing grace how sweet the sound
G        D
That saved a wretch like me`}
      />
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
            Add sections manually or paste a full song and auto-split it.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowPasteBox(prev => !prev)}
          className="btn-primary sm:btn-secondary text-sm w-full sm:w-auto"
        >
          {showPasteBox ? 'Hide Paste Box' : 'Paste Full Song'}
        </button>
      </div>

      {showPasteBox && (
        <div className="border border-primary/20 bg-primary-light rounded-xl p-3 flex flex-col gap-3">
          <div>
            <h3 className="font-semibold text-church-navy text-sm">
              Paste the whole song here
            </h3>
            <p className="text-xs text-gray-500">
              Use headings like Verse 1, Chorus, Bridge, Intro, Outro, Tag.
            </p>
          </div>

          <textarea
            value={fullSongText}
            onChange={e => setFullSongText(e.target.value)}
            className="input-field min-h-[55vh] sm:min-h-64 font-mono text-base sm:text-sm resize-y bg-white leading-7"
            placeholder={`Example:

Verse 1
G        C
Amazing grace how sweet the sound
G        D
That saved a wretch like me

Chorus
C        G
How great is our God
D        Em
Sing with me how great is our God

Bridge
Em       C
Name above all names
G        D
Worthy of all praise`}
          />

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
          className="input-field flex-1 min-w-40 text-base sm:text-sm"
          placeholder="Verse 1, Chorus, Bridge..."
        />

        <button type="button" onClick={addSection} className="btn-secondary py-3">
          + Add Section
        </button>
      </div>
    </div>
  );
}