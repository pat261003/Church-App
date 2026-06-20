import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { addSong } from '../api/songs';
import { SongSection } from '../types';
import { ALL_KEYS } from '../utils/transpose';

const SECTION_TYPES = [
  'Verse 1', 'Verse 2', 'Verse 3', 'Chorus', 'Pre-Chorus',
  'Bridge', 'Ending', 'Instrumental', 'Other'
];

export default function AddSong() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [originalKey, setOriginalKey] = useState('G');
  const [artist, setArtist] = useState('');
  const [tags, setTags] = useState('');
  const [sections, setSections] = useState<SongSection[]>([
    { section_type: 'Verse 1', section_order: 0, content: '' },
    { section_type: 'Chorus', section_order: 1, content: '' },
  ]);
  const [submitting, setSubmitting] = useState(false);

  function addSection() {
    setSections(prev => [
      ...prev,
      { section_type: 'Verse 1', section_order: prev.length, content: '' }
    ]);
  }

  function removeSection(idx: number) {
    setSections(prev => prev.filter((_, i) => i !== idx)
      .map((s, i) => ({ ...s, section_order: i })));
  }

  function updateSection(idx: number, key: keyof SongSection, value: string | number) {
    setSections(prev => prev.map((s, i) => i === idx ? { ...s, [key]: value } : s));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return toast.error('Song title is required');
    if (sections.some(s => !s.content.trim())) return toast.error('All sections need content');

    setSubmitting(true);
    try {
      const song = await addSong({
        title,
        original_key: originalKey,
        current_key: originalKey,
        artist,
        tags,
        sections,
      });
      toast.success(`"${song.title}" added!`);
      navigate(`/songs/${song.id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || 'Failed to add song');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-church-navy mb-6">Add New Song</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Song info */}
        <div className="card flex flex-col gap-3">
          <h2 className="font-semibold text-primary">Song Info</h2>
          <div>
            <label className="text-sm font-medium text-gray-600 mb-1 block">
              Title <span className="text-red-500">*</span>
            </label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Amazing Grace" className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1 block">
                Key <span className="text-red-500">*</span>
              </label>
              <select value={originalKey} onChange={e => setOriginalKey(e.target.value)}
                className="input-field">
                {ALL_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1 block">Artist / Source</label>
              <input value={artist} onChange={e => setArtist(e.target.value)}
                placeholder="Optional" className="input-field" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600 mb-1 block">
              Tags <span className="text-xs text-gray-400">(comma-separated)</span>
            </label>
            <input value={tags} onChange={e => setTags(e.target.value)}
              placeholder="e.g. Worship, Hymn, Fast" className="input-field" />
          </div>
        </div>

        {/* Sections */}
        <div className="card flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-primary">Lyrics &amp; Chords</h2>
            <p className="text-xs text-gray-400">Use [G] [Am] for chords</p>
          </div>

          {sections.map((s, i) => (
            <div key={i} className="border border-church-border rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <select
                  value={s.section_type}
                  onChange={e => updateSection(i, 'section_type', e.target.value)}
                  className="input-field w-auto text-sm"
                >
                  {SECTION_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
                {sections.length > 1 && (
                  <button type="button" onClick={() => removeSection(i)}
                    className="text-red-400 hover:text-red-600 text-sm ml-auto">
                    Remove
                  </button>
                )}
              </div>
              <textarea
                value={s.content}
                onChange={e => updateSection(i, 'content', e.target.value)}
                placeholder={`[G]Amazing grace how [C]sweet the [G]sound\n[G]That saved a [D]wretch like [G]me`}
                rows={5}
                className="input-field font-mono text-sm resize-y"
              />
            </div>
          ))}

          <button type="button" onClick={addSection}
            className="btn-secondary text-sm w-full">
            + Add Section
          </button>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={submitting} className="btn-primary flex-1">
            {submitting ? 'Saving...' : 'Save Song'}
          </button>
          <button type="button" onClick={() => navigate('/songs')}
            className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
