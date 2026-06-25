import { useEffect, useState, type FormEvent } from 'react';
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

  function moveSection(sectionIndex: number, direction: -1 | 1) {
    setSections(prev => {
      const next = [...prev];
      const targetIndex = sectionIndex + direction;

      if (targetIndex < 0 || targetIndex >= next.length) return prev;

      const [removed] = next.splice(sectionIndex, 1);
      next.splice(targetIndex, 0, removed);

      return reorderSections(next);
    });
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

  function moveSong(sectionIndex: number, songIndex: number, direction: -1 | 1) {
    setSections(prev =>
      prev.map((section, index) => {
        if (index !== sectionIndex) return section;

        const nextSongs = [...section.songs];
        const targetIndex = songIndex + direction;

        if (targetIndex < 0 || targetIndex >= nextSongs.length) return section;

        const [removed] = nextSongs.splice(songIndex, 1);
        nextSongs.splice(targetIndex, 0, removed);

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

      <div className="card flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-semibold text-primary">Song Lineup</h2>
            <p className="text-xs text-gray-400">
              Add songs, leader keys, and optional song links.
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
          <div key={sectionIndex} className="border border-church-border rounded-lg p-3 bg-white">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <input
                value={section.section_name}
                onChange={e => updateSectionName(sectionIndex, e.target.value)}
                className="input-field text-base sm:text-sm flex-1 min-w-40"
                placeholder="Opening Song, Fast Song, Slow Song..."
              />

              <button
                type="button"
                onClick={() => moveSection(sectionIndex, -1)}
                disabled={sectionIndex === 0}
                className="btn-secondary text-xs disabled:opacity-40"
              >
                ↑
              </button>

              <button
                type="button"
                onClick={() => moveSection(sectionIndex, 1)}
                disabled={sectionIndex === sections.length - 1}
                className="btn-secondary text-xs disabled:opacity-40"
              >
                ↓
              </button>

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

                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => moveSong(sectionIndex, songIndex, -1)}
                        disabled={songIndex === 0}
                        className="btn-secondary text-xs disabled:opacity-40 flex-1 sm:flex-none"
                      >
                        ↑ Move Up
                      </button>

                      <button
                        type="button"
                        onClick={() => moveSong(sectionIndex, songIndex, 1)}
                        disabled={songIndex === section.songs.length - 1}
                        className="btn-secondary text-xs disabled:opacity-40 flex-1 sm:flex-none"
                      >
                        ↓ Move Down
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