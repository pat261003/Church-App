import { useEffect, useRef, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
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

const LONG_PRESS_MS = 280;

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

function createSection(sectionName: string, order: number): LineupSection {
  return {
    section_name: sectionName,
    section_order: order,
    songs: [],
  };
}

function createSongItem(songId = '', order = 0) {
  return {
    song_id: songId,
    song_order: order,
    key_override: '',
    song_link: '',
    notes: '',
  };
}

function reorderSections(sections: LineupSection[]) {
  return sections.map((section, index) => ({
    ...section,
    section_order: index,
    songs: section.songs.map((song, songIndex) => ({
      ...song,
      song_order: songIndex,
    })),
  }));
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

  const [sections, setSections] = useState<LineupSection[]>(
    initialData?.sections?.length
      ? reorderSections(initialData.sections)
      : DEFAULT_SECTIONS.map((name, index) => createSection(name, index))
  );

  const [draggingSectionIndex, setDraggingSectionIndex] = useState<number | null>(null);
  const [draggingSong, setDraggingSong] = useState<{
    sectionIndex: number;
    songIndex: number;
  } | null>(null);

  const longPressTimerRef = useRef<number | null>(null);
  const draggingSectionIndexRef = useRef<number | null>(null);
  const draggingSongRef = useRef<{
    sectionIndex: number;
    songIndex: number;
  } | null>(null);

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

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      if (draggingSectionIndexRef.current !== null) {
        event.preventDefault();

        const element = document.elementFromPoint(event.clientX, event.clientY);
        const target = element?.closest('[data-lineup-section-index]') as HTMLElement | null;

        if (!target) return;

        const targetIndex = Number(target.dataset.lineupSectionIndex);
        const currentIndex = draggingSectionIndexRef.current;

        if (Number.isNaN(targetIndex)) return;
        if (targetIndex === currentIndex) return;

        reorderSectionByDrag(currentIndex, targetIndex);
        return;
      }

      if (draggingSongRef.current !== null) {
        event.preventDefault();

        const element = document.elementFromPoint(event.clientX, event.clientY);
        const target = element?.closest('[data-lineup-song-index]') as HTMLElement | null;

        if (!target) return;

        const targetSectionIndex = Number(target.dataset.lineupSongSectionIndex);
        const targetSongIndex = Number(target.dataset.lineupSongIndex);
        const currentDrag = draggingSongRef.current;

        if (Number.isNaN(targetSectionIndex) || Number.isNaN(targetSongIndex)) return;
        if (targetSectionIndex !== currentDrag.sectionIndex) return;
        if (targetSongIndex === currentDrag.songIndex) return;

        reorderSongByDrag(currentDrag.sectionIndex, currentDrag.songIndex, targetSongIndex);
      }
    }

    function handlePointerUp() {
      finishDrag();
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, []);

  function clearLongPressTimer() {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function finishDrag() {
    clearLongPressTimer();

    draggingSectionIndexRef.current = null;
    draggingSongRef.current = null;

    setDraggingSectionIndex(null);
    setDraggingSong(null);
  }

  function startSectionLongPress(sectionIndex: number) {
    clearLongPressTimer();

    longPressTimerRef.current = window.setTimeout(() => {
      draggingSectionIndexRef.current = sectionIndex;
      draggingSongRef.current = null;

      setDraggingSectionIndex(sectionIndex);
      setDraggingSong(null);
    }, LONG_PRESS_MS);
  }

  function startSongLongPress(sectionIndex: number, songIndex: number) {
    clearLongPressTimer();

    longPressTimerRef.current = window.setTimeout(() => {
      draggingSongRef.current = {
        sectionIndex,
        songIndex,
      };
      draggingSectionIndexRef.current = null;

      setDraggingSong({
        sectionIndex,
        songIndex,
      });
      setDraggingSectionIndex(null);
    }, LONG_PRESS_MS);
  }

  function reorderSectionByDrag(fromIndex: number, toIndex: number) {
    setSections(prev => {
      if (fromIndex < 0 || fromIndex >= prev.length) return prev;
      if (toIndex < 0 || toIndex >= prev.length) return prev;

      const next = [...prev];
      const [removed] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, removed);

      draggingSectionIndexRef.current = toIndex;
      setDraggingSectionIndex(toIndex);

      return reorderSections(next);
    });
  }

  function reorderSongByDrag(sectionIndex: number, fromIndex: number, toIndex: number) {
    setSections(prev =>
      prev.map((section, index) => {
        if (index !== sectionIndex) return section;
        if (fromIndex < 0 || fromIndex >= section.songs.length) return section;
        if (toIndex < 0 || toIndex >= section.songs.length) return section;

        const nextSongs = [...section.songs];
        const [removed] = nextSongs.splice(fromIndex, 1);
        nextSongs.splice(toIndex, 0, removed);

        draggingSongRef.current = {
          sectionIndex,
          songIndex: toIndex,
        };

        setDraggingSong({
          sectionIndex,
          songIndex: toIndex,
        });

        return {
          ...section,
          songs: nextSongs.map((song, newIndex) => ({
            ...song,
            song_order: newIndex,
          })),
        };
      })
    );
  }

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
              songs: section.songs
                .filter((_, sIndex) => sIndex !== songIndex)
                .map((song, newIndex) => ({ ...song, song_order: newIndex })),
            }
          : section
      )
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!title.trim()) return toast.error('Title is required');
    if (!serviceDate) return toast.error('Service date is required');
    if (!songLeader.trim()) return toast.error('Song leader is required');

    const cleanSections = reorderSections(sections)
      .map(section => ({
        ...section,
        section_name: section.section_name.trim(),
        songs: section.songs
          .filter(song => song.song_id)
          .map((song, index) => ({
            ...song,
            song_order: index,
            key_override: song.key_override?.trim() || null,
            song_link: song.song_link?.trim() || null,
            notes: song.notes?.trim() || null,
          })),
      }))
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
        sections: cleanSections,
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
              Add songs, leader keys, and optional song links. Long press the handle to reorder.
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
          <div
            key={sectionIndex}
            data-lineup-section-index={sectionIndex}
            className={`border border-church-border rounded-lg p-3 bg-white transition-all ${
              draggingSectionIndex === sectionIndex
                ? 'ring-2 ring-primary shadow-md scale-[1.01]'
                : ''
            }`}
          >
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <button
                type="button"
                onPointerDown={e => {
                  e.preventDefault();
                  startSectionLongPress(sectionIndex);
                }}
                onPointerUp={finishDrag}
                onPointerCancel={finishDrag}
                className="btn-secondary text-xs cursor-grab active:cursor-grabbing select-none"
                style={{ touchAction: 'none' }}
                title="Long press and drag to reorder this section"
              >
                ☰ Hold
              </button>

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
                    key={songIndex}
                    data-lineup-song-section-index={sectionIndex}
                    data-lineup-song-index={songIndex}
                    className={`bg-church-lightblue rounded-lg p-3 grid grid-cols-1 gap-2 transition-all ${
                      draggingSong?.sectionIndex === sectionIndex && draggingSong.songIndex === songIndex
                        ? 'ring-2 ring-primary shadow-md scale-[1.01]'
                        : ''
                    }`}
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

                    <div className="flex gap-1 items-center">
                      <button
                        type="button"
                        onPointerDown={e => {
                          e.preventDefault();
                          startSongLongPress(sectionIndex, songIndex);
                        }}
                        onPointerUp={finishDrag}
                        onPointerCancel={finishDrag}
                        className="btn-secondary text-xs cursor-grab active:cursor-grabbing select-none flex-1 sm:flex-none"
                        style={{ touchAction: 'none' }}
                        title="Long press and drag to reorder this song"
                      >
                        ☰ Hold & Drag
                      </button>

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