import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SongSection } from '../types';

const SECTION_SUGGESTIONS = [
  'Verse 1',
  'Verse 2',
  'Verse 3',
  'Verse 4',
  'Chorus',
  'Chorus 2',
  'Pre-Chorus',
  'Pre-Chorus 2',
  'Bridge',
  'Bridge 2',
  'Ending',
  'Instrumental',
  'Intro',
  'Outro',
  'Tag',
  'Refrain',
  'Other',
];

function makeClientId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `section-${Date.now()}-${Math.random().toString(36).slice(2)}`;
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

function getSectionId(section: SongSection, index: number) {
  return section.client_id || section.id || `section-${index}`;
}

function SortableSection({
  section,
  index,
  total,
  updateSection,
  removeSection,
}: {
  section: SongSection;
  index: number;
  total: number;
  updateSection: (index: number, key: keyof SongSection, value: string | number) => void;
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
    id: getSectionId(section, index),
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border border-church-border rounded-lg p-3 bg-white ${
        isDragging ? 'opacity-70 shadow-lg' : ''
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing bg-primary-light text-primary px-2 py-2 rounded-lg text-xs font-bold touch-none"
          title="Long press and drag to reorder"
          {...attributes}
          {...listeners}
        >
          ☰
        </button>

        <input
          list="section-suggestions"
          value={section.section_type}
          onChange={e => updateSection(index, 'section_type', e.target.value)}
          className="input-field text-sm flex-1"
          placeholder="Verse 1, Verse 4, Chorus 2, Bridge..."
        />

        {total > 1 && (
          <button
            type="button"
            onClick={() => removeSection(index)}
            className="text-red-400 hover:text-red-600 text-sm"
          >
            Remove
          </button>
        )}
      </div>

      <textarea
        value={section.content}
        onChange={e => updateSection(index, 'content', e.target.value)}
        placeholder={`      G      G7       C          G
Through many dangers, toils and snares
           A    D
We have already come`}
        rows={6}
        className="input-field font-mono text-sm resize-y"
      />
    </div>
  );
}

export default function SongSectionsEditor({
  sections,
  setSections,
}: {
  sections: SongSection[];
  setSections: React.Dispatch<React.SetStateAction<SongSection[]>>;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const ids = sections.map(getSectionId);

  function reorderWithCorrectOrder(items: SongSection[]) {
    return items.map((section, index) => ({
      ...section,
      section_order: index,
    }));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));

    if (oldIndex === -1 || newIndex === -1) return;

    setSections(prev => reorderWithCorrectOrder(arrayMove(prev, oldIndex, newIndex)));
  }

  function updateSection(index: number, key: keyof SongSection, value: string | number) {
    setSections(prev =>
      prev.map((section, i) =>
        i === index ? { ...section, [key]: value } : section
      )
    );
  }

  function removeSection(index: number) {
    setSections(prev =>
      reorderWithCorrectOrder(prev.filter((_, i) => i !== index))
    );
  }

  function addSection() {
    setSections(prev =>
      reorderWithCorrectOrder([
        ...prev,
        createSection(`Verse ${prev.length + 1}`, prev.length),
      ])
    );
  }

  return (
    <div className="card flex flex-col gap-4">
      <datalist id="section-suggestions">
        {SECTION_SUGGESTIONS.map(type => (
          <option key={type} value={type} />
        ))}
      </datalist>

      <div className="flex justify-between items-center gap-3">
        <div>
          <h2 className="font-semibold text-primary">Lyrics &amp; Chords</h2>
          <p className="text-xs text-gray-400">
            Long press ☰ and drag to reorder. You can type custom labels like Verse 4 or Chorus 2.
          </p>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-3">
            {sections.map((section, index) => (
              <SortableSection
                key={getSectionId(section, index)}
                section={section}
                index={index}
                total={sections.length}
                updateSection={updateSection}
                removeSection={removeSection}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <button type="button" onClick={addSection} className="btn-secondary text-sm w-full">
        + Add Section
      </button>
    </div>
  );
}