import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { addSong } from '../api/songs';
import { SongSection } from '../types';
import { ALL_KEYS } from '../utils/transpose';
import SongSectionsEditor, { createSection } from '../components/SongSectionsEditor';

export default function AddSong() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [originalKey, setOriginalKey] = useState('G');
  const [artist, setArtist] = useState('');
  const [tags, setTags] = useState('');
  const [sections, setSections] = useState<SongSection[]>([
    createSection('Verse 1', 0),
    createSection('Chorus', 1),
  ]);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
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
        sections: sections.map((section, index) => ({
          ...section,
          section_order: index,
        })),
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
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Amazing Grace"
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1 block">
                Key <span className="text-red-500">*</span>
              </label>
              <select
                value={originalKey}
                onChange={e => setOriginalKey(e.target.value)}
                className="input-field"
              >
                {ALL_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600 mb-1 block">Artist / Source</label>
              <input
                value={artist}
                onChange={e => setArtist(e.target.value)}
                placeholder="Optional"
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600 mb-1 block">
              Tags <span className="text-xs text-gray-400">(comma-separated)</span>
            </label>
            <input
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="e.g. Worship, Hymn, Fast"
              className="input-field"
            />
          </div>
        </div>

        {/* Sections */}
        <SongSectionsEditor sections={sections} setSections={setSections} />

        <div className="flex gap-3">
          <button type="submit" disabled={submitting} className="btn-primary flex-1">
            {submitting ? 'Saving...' : 'Save Song'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/songs')}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}