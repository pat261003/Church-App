import { useEffect, useState, type FormEvent } from 'react';
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
import { fetchSongs } from '../api/songs';
import { LineupSection, ServiceLineupInput, Song } from '../types';

const DEFAULT_SECTIONS = ['Opening Song', 'Fast Song', 'Slow Song'];
const OPTIONAL_SECTIONS = [
  'Offering Song',
  'Closing Song',
  'Special Number',
  'Communion Song',
  'Prayer Song',
  'Other',
];

type LineupSongItem = LineupSection['songs'][number];

type SortableLineupSong = LineupSongItem & {
  client_id?: string;
  id?: string;
};

type SortableLineupSection = Omit<LineupSection, 'songs'> & {
  client_id?: string;
  id?: string;
  songs: SortableLineupSong[];
};

type DndSensors = ReturnType<typeof useSensors>;

function makeClientId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getSectionDragId(section: SortableLineupSection, index: number) {
  return section.client_id || section.id || `section-${index}`;
}

function getSongDragId(song: SortableLineupSong, index: number) {
  return song.client_id || song.id || `song-${index}`;
}

function getSongTitle(songId: string, songs: Song[]) {
  const found = songs.find(song => song.id === songId);

  return found?.title || 'No song selected';
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getTodayDate() {
  return formatLocalDate(new Date());
}

function getNextSundayDate() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const day = today.getDay();
  const daysUntilSunday = day === 0 ? 0 : 7 - day;

  const nextSunday = new Date(today);
  nextSunday.setDate(today.getDate() + daysUntilSunday);

  return formatLocalDate(nextSunday);
}

function getDateInputValue(dateValue: string | null | undefined) {
  if (!dateValue) return getTodayDate();

  return String(dateValue).slice(0, 10);
}

function titleHasSunday(title: string) {
  return title.toLowerCase().includes('sunday');
}

function createSection(sectionName: string, order: number): SortableLineupSection {
  return {
    client_id: makeClientId(),
    section_name: sectionName,
    section_order: order,
    songs: [],
  };
}

function createSongItem(songId = '', order = 0): SortableLineupSong {
  return {
    client_id: makeClientId(),
    song_id: songId,
    song_order: order,
    key_override: '',
    song_link: '',
    notes: '',
  };
}

function withClientIds(sections: SortableLineupSection[]): SortableLineupSection[] {
  return sections.map((section, index) => ({
    ...section,
    client_id: section.client_id || section.id || makeClientId(),
    section_order: index,
    songs: section.songs.map((song, songIndex) => ({
      ...song,
      client_id: song.client_id || song.id || makeClientId(),
      song_order: songIndex,
    })),
  }));
}

function reorderSections(sections: SortableLineupSection[]) {
  return sections.map((section, index) => ({
    ...section,
    section_order: index,
    songs: section.songs.map((song, songIndex) => ({
      ...song,
      song_order: songIndex,
    })),
  }));
}

function reorderSongs(songs: SortableLineupSong[]) {
  return songs.map((song, index) => ({
    ...song,
    song_order: index,
  }));
}

function SortableReorderSong({
  song,
  songIndex,
  songs,
}: {
  song: SortableLineupSong;
  songIndex: number;
  songs: Song[];
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: getSongDragId(song, songIndex),
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border border-church-border bg-[rgb(var(--color-surface))] p-3 transition-all ${
        isDragging ? 'opacity-70 shadow-lg scale-[1.02]' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing px-3 py-3 rounded-lg bg-church-lightblue text-primary font-bold shrink-0 touch-none"
          title="Hold and drag to reorder"
        >
          ☰
        </button>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold text-primary uppercase tracking-wide">
            Song #{songIndex + 1}
          </p>

          <p className="font-bold text-church-navy break-words leading-tight">
            {getSongTitle(song.song_id, songs)}
          </p>

          {(song.key_override || song.notes) && (
            <p className="text-xs text-gray-500 mt-1 break-words">
              {song.key_override ? `Key: ${song.key_override}` : ''}
              {song.key_override && song.notes ? ' • ' : ''}
              {song.notes || ''}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function SortableReorderSection({
  section,
  sectionIndex,
  songs,
  sensors,
  handleSongDragEnd,
}: {
  section: SortableLineupSection;
  sectionIndex: number;
  songs: Song[];
  sensors: DndSensors;
  handleSongDragEnd: (sectionIndex: number, event: DragEndEvent) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: getSectionDragId(section, sectionIndex),
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-2xl border border-church-border bg-white p-3 transition-all ${
        isDragging ? 'opacity-70 shadow-xl scale-[1.01]' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing px-3 py-3 rounded-lg bg-church-lightblue text-primary font-bold shrink-0 touch-none"
          title="Hold and drag to reorder this section"
        >
          ☰
        </button>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold text-primary uppercase tracking-wide">
            Section #{sectionIndex + 1}
          </p>

          <p className="font-bold text-church-navy break-words leading-tight">
            {section.section_name || 'Untitled Section'}
          </p>

          <p className="text-xs text-gray-500 mt-1">
            {section.songs.length} song(s)
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-xl bg-church-lightblue p-3">
        <p className="text-xs font-bold text-primary mb-2">
          Songs in this section
        </p>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={event => handleSongDragEnd(sectionIndex, event)}
        >
          <SortableContext
            items={section.songs.map((song, songIndex) => getSongDragId(song, songIndex))}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-2">
              {section.songs.length === 0 ? (
                <p className="text-xs text-gray-400 py-2">
                  No songs added in this section yet.
                </p>
              ) : (
                section.songs.map((song, songIndex) => (
                  <SortableReorderSong
                    key={getSongDragId(song, songIndex)}
                    song={song}
                    songIndex={songIndex}
                    songs={songs}
                  />
                ))
              )}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}

export default function LineupForm({
  initialData,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initialData?: Partial<ServiceLineupInput>;
  submitLabel: string;
  onSubmit: (data: ServiceLineupInput) => Promise<void>;
  onCancel: () => void;
}) {
  const isEditing = Boolean(initialData?.service_date);

  const [songs, setSongs] = useState<Song[]>([]);
  const [loadingSongs, setLoadingSongs] = useState(true);

  const [title, setTitle] = useState(initialData?.title || 'Sunday Worship Service');
  const [serviceDate, setServiceDate] = useState(
    initialData?.service_date
      ? getDateInputValue(initialData.service_date)
      : titleHasSunday(initialData?.title || 'Sunday Worship Service')
        ? getNextSundayDate()
        : getTodayDate()
  );
  const [dateTouched, setDateTouched] = useState(false);

  const [songLeader, setSongLeader] = useState(initialData?.song_leader || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [sectionToAdd, setSectionToAdd] = useState('Offering Song');
  const [submitting, setSubmitting] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);

  const [sections, setSections] = useState<SortableLineupSection[]>(
    initialData?.sections?.length
      ? withClientIds(initialData.sections as SortableLineupSection[])
      : DEFAULT_SECTIONS.map((name, index) => createSection(name, index))
  );

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

  useEffect(() => {
    fetchSongs()
      .then(setSongs)
      .catch(() => toast.error('Failed to load songs'))
      .finally(() => setLoadingSongs(false));
  }, []);

  useEffect(() => {
    if (isEditing) return;
    if (dateTouched) return;

    if (titleHasSunday(title)) {
      setServiceDate(getNextSundayDate());
    }
  }, [title, isEditing, dateTouched]);

  function updateSectionName(sectionIndex: number, value: string) {
    setSections(prev =>
      prev.map((section, index) =>
        index === sectionIndex ? { ...section, section_name: value } : section
      )
    );
  }

  function addSection() {
    const name = sectionToAdd === 'Other' ? 'New Section' : sectionToAdd;

    setSections(prev =>
      reorderSections([
        ...prev,
        createSection(name, prev.length),
      ])
    );
  }

  function removeSection(sectionIndex: number) {
    setSections(prev =>
      reorderSections(prev.filter((_, index) => index !== sectionIndex))
    );
  }

  function addSongToSection(sectionIndex: number) {
    if (songs.length === 0) {
      toast.error('No songs available yet');
      return;
    }

    setSections(prev =>
      prev.map((section, index) =>
        index === sectionIndex
          ? {
              ...section,
              songs: [
                ...section.songs,
                createSongItem('', section.songs.length),
              ],
            }
          : section
      )
    );
  }

  function updateSongInSection(
    sectionIndex: number,
    songIndex: number,
    key: 'song_id' | 'key_override' | 'song_link' | 'notes',
    value: string
  ) {
    setSections(prev =>
      prev.map((section, index) =>
        index === sectionIndex
          ? {
              ...section,
              songs: section.songs.map((song, sIndex) =>
                sIndex === songIndex ? { ...song, [key]: value } : song
              ),
            }
          : section
      )
    );
  }

  function removeSongFromSection(sectionIndex: number, songIndex: number) {
    setSections(prev =>
      prev.map((section, index) =>
        index === sectionIndex
          ? {
              ...section,
              songs: reorderSongs(section.songs.filter((_, sIndex) => sIndex !== songIndex)),
            }
          : section
      )
    );
  }

  function handleSectionDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    setSections(prev => {
      const oldIndex = prev.findIndex((section, index) => getSectionDragId(section, index) === active.id);
      const newIndex = prev.findIndex((section, index) => getSectionDragId(section, index) === over.id);

      if (oldIndex === -1 || newIndex === -1) return prev;

      return reorderSections(arrayMove(prev, oldIndex, newIndex));
    });
  }

  function handleSongDragEnd(sectionIndex: number, event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    setSections(prev =>
      prev.map((section, index) => {
        if (index !== sectionIndex) return section;

        const oldIndex = section.songs.findIndex((song, songIndex) => getSongDragId(song, songIndex) === active.id);
        const newIndex = section.songs.findIndex((song, songIndex) => getSongDragId(song, songIndex) === over.id);

        if (oldIndex === -1 || newIndex === -1) return section;

        return {
          ...section,
          songs: reorderSongs(arrayMove(section.songs, oldIndex, newIndex)),
        };
      })
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!title.trim()) return toast.error('Title is required');
    if (!serviceDate) return toast.error('Service date is required');
    if (!songLeader.trim()) return toast.error('Song leader is required');

    const cleanSections = reorderSections(sections)
      .map(section => {
        const { client_id: _sectionClientId, songs: sectionSongs, ...sectionWithoutClientId } = section;

        return {
          ...sectionWithoutClientId,
          section_name: section.section_name.trim(),
          songs: sectionSongs
            .filter(song => song.song_id)
            .map((song, index) => {
              const { client_id: _songClientId, ...songWithoutClientId } = song;

              return {
                ...songWithoutClientId,
                song_order: index,
                key_override: song.key_override?.trim() || null,
                song_link: song.song_link?.trim() || null,
                notes: song.notes?.trim() || null,
              };
            }),
        };
      })
      .filter(section => section.section_name && section.songs.length > 0);

    if (cleanSections.length === 0) {
      return toast.error('Add at least one song to the lineup');
    }

    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        service_date: serviceDate,
        song_leader: songLeader.trim(),
        notes: notes.trim(),
        sections: cleanSections as LineupSection[],
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="card flex flex-col gap-3">
        <h2 className="font-semibold text-primary">Service Info</h2>

        <div>
          <label className="text-sm font-medium text-gray-600 mb-1 block">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="input-field text-base sm:text-sm"
            placeholder="Sunday Worship Service"
          />
          <p className="text-[11px] text-gray-400 mt-1">
            If the title contains “Sunday”, the date will auto-select the nearest Sunday unless you manually change it.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-gray-600 mb-1 block">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={serviceDate}
              onChange={e => {
                setDateTouched(true);
                setServiceDate(e.target.value);
              }}
              className="input-field text-base sm:text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600 mb-1 block">
              Song Leader <span className="text-red-500">*</span>
            </label>
            <input
              value={songLeader}
              onChange={e => setSongLeader(e.target.value)}
              className="input-field text-base sm:text-sm"
              placeholder="e.g. Me"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-600 mb-1 block">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            className="input-field resize-y text-base sm:text-sm"
            placeholder="Optional notes..."
          />
        </div>
      </div>

      <div className="card flex flex-col gap-4 song-lineup-bordered-fields">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-semibold text-primary">Song Lineup</h2>
            <p className="text-xs text-gray-400">
              {reorderMode
                ? 'Reorder mode is easier on phones. Hold ☰ and drag sections or songs.'
                : 'Add songs, leader keys, and optional song links.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setReorderMode(prev => !prev)}
            className={reorderMode ? 'btn-primary text-sm w-full sm:w-auto' : 'btn-secondary text-sm w-full sm:w-auto'}
          >
            {reorderMode ? 'Done Reordering' : 'Reorder Lineup'}
          </button>
        </div>

        {reorderMode ? (
          <div className="flex flex-col gap-3">
            <div className="rounded-xl bg-primary-light p-3">
              <p className="text-sm font-semibold text-church-navy">
                Reorder Mode
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Hold the ☰ button, then drag. Inputs are hidden here so dragging works better on phone.
              </p>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleSectionDragEnd}
            >
              <SortableContext
                items={sections.map((section, index) => getSectionDragId(section, index))}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col gap-3">
                  {sections.map((section, sectionIndex) => (
                    <SortableReorderSection
                      key={getSectionDragId(section, sectionIndex)}
                      section={section}
                      sectionIndex={sectionIndex}
                      songs={songs}
                      sensors={sensors}
                      handleSongDragEnd={handleSongDragEnd}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-xs text-gray-400">
                  Use Reorder Lineup if you need to rearrange sections or songs.
                </p>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <select
                  value={sectionToAdd}
                  onChange={e => setSectionToAdd(e.target.value)}
                  className="input-field text-sm flex-1 sm:w-auto"
                >
                  {[...DEFAULT_SECTIONS, ...OPTIONAL_SECTIONS].map(section => (
                    <option key={section} value={section}>{section}</option>
                  ))}
                </select>

                <button type="button" onClick={addSection} className="btn-secondary text-sm">
                  + Section
                </button>
              </div>
            </div>

            {sections.map((section, sectionIndex) => (
              <div key={getSectionDragId(section, sectionIndex)} className="border border-church-border rounded-lg p-3 bg-white">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <input
                    value={section.section_name}
                    onChange={e => updateSectionName(sectionIndex, e.target.value)}
                    className="input-field text-base sm:text-sm flex-1 min-w-40"
                    placeholder="Opening Song, Fast Song, Slow Song..."
                  />

                  <button
                    type="button"
                    onClick={() => removeSection(sectionIndex)}
                    className="text-red-400 hover:text-red-600 text-sm"
                  >
                    Remove
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  {section.songs.length === 0 ? (
                    <p className="text-xs text-gray-400 py-2">No songs added in this section yet.</p>
                  ) : (
                    section.songs.map((song, songIndex) => (
                      <div
                        key={getSongDragId(song, songIndex)}
                        className="bg-church-lightblue rounded-lg p-3 grid grid-cols-1 gap-2"
                      >
                        <select
                          value={song.song_id}
                          onChange={e => updateSongInSection(sectionIndex, songIndex, 'song_id', e.target.value)}
                          className="input-field text-base sm:text-sm"
                        >
                          <option value="">Select song...</option>
                          {songs.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.title} {s.original_key ? `(${s.original_key})` : ''}
                            </option>
                          ))}
                        </select>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            value={song.key_override || ''}
                            onChange={e => updateSongInSection(sectionIndex, songIndex, 'key_override', e.target.value)}
                            className="input-field text-base sm:text-sm"
                            placeholder="Leader key, e.g. E"
                          />

                          <input
                            value={song.song_link || ''}
                            onChange={e => updateSongInSection(sectionIndex, songIndex, 'song_link', e.target.value)}
                            className="input-field text-base sm:text-sm"
                            placeholder="Song link, e.g. YouTube or Google Drive"
                            type="url"
                          />
                        </div>

                        <input
                          value={song.notes || ''}
                          onChange={e => updateSongInSection(sectionIndex, songIndex, 'notes', e.target.value)}
                          className="input-field text-base sm:text-sm"
                          placeholder="Optional notes"
                        />

                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => removeSongFromSection(sectionIndex, songIndex)}
                            className="text-red-400 hover:text-red-600 text-sm px-2"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => addSongToSection(sectionIndex)}
                  disabled={loadingSongs}
                  className="btn-secondary text-sm w-full mt-3 py-3"
                >
                  + Add Song
                </button>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="flex gap-3 flex-col sm:flex-row">
        <button type="submit" disabled={submitting} className="btn-primary flex-1 py-3">
          {submitting ? 'Saving...' : submitLabel}
        </button>

        <button type="button" onClick={onCancel} className="btn-secondary py-3">
          Cancel
        </button>
      </div>
    </form>
  );
}