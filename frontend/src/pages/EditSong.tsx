import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fetchSong, updateSong } from '../api/songs';
import { Song, SongSection } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import { ALL_KEYS } from '../utils/transpose';

const SECTION_TYPES = [
  'Verse 1', 'Verse 2', 'Verse 3', 'Chorus', 'Pre-Chorus',
  'Bridge', 'Ending', 'Instrumental', 'Other'
];

export default function EditSong() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [song, setSong] = useState<Song | null>(null);

  const [title, setTitle] = useState('');
  const [originalKey, setOriginalKey] = useState('G');
  const [artist, setArtist] = useState('');
  const [tags, setTags] = useState('');
  const [sections, setSections] = useState<SongSection[]>([]);

  useEffect(() => {
    if (!id) return;
    fetchSong(id)
      .then(data => {
        setSong(data);
        setTitle(data.title);
        setOriginalKey(data.original_key);
        setArtist(data.artist || '');
        setTags(data.tags || '');
        setSections(data.sections);
      })
      .catch(() => toast.error('Failed to load song'))
      .finally(() => setLoading(false));
  }, [id]);

  function updateSection(idx: number, key: keyof SongSection, value: string | number) {
    setSections(prev => prev.map((s, i) => i === idx ? { ...s, [key]: value } : s));
  }

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return toast.error('Title is required');
    if (!id) return;

    setSubmitting(true);
    try {
      const updated = await updateSong(id, {
        title,
        original_key: originalKey,
        current_key: originalKey,
        artist,
        tags,
        sections,
      });
      toast.success('Song updated!');
      navigate(`/songs/${updated.id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || 'Failed to update song');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingSpinner label="Loading song..." />;
  if (!song) return <p className="text-center text-gray-400 py-12">Song not found.</p>;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-church-navy mb-6">Edit Song</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="card flex flex-col gap-3">
          <h2 className="font-semibold text-primary">Song Info</h2>
          <div>
            <label className="text-sm font-medium text-gray-600 mb-1 block">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1 block">Key</label>
              <select value={originalKey} onChange={e => setOriginalKey(e.target.value)} className="input-field">
                {ALL_KEYS.map(k => <option key={k}>{k}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1 block">Artist</label>
              <input value={artist} onChange={e => setArtist(e.target.value)} className="input-field" placeholder="Optional" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600 mb-1 block">Tags</label>
            <input value={tags} onChange={e => setTags(e.target.value)} className="input-field" placeholder="Worship, Hymn..." />
          </div>
        </div>

        <div className="card flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-primary">Sections</h2>
            <p className="text-xs text-gray-400">Use [G] [Am] for chords</p>
          </div>

          {sections.map((s, i) => (
            <div key={i} className="border border-church-border rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <select value={s.section_type}
                    onChange={e => updateSection(i, 'section_type', e.target.value)}
                        className="input-field w-auto text-sm">
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
                    rows={5}
                    className="input-field font-mono text-sm resize-y"
                />
                </div>
            ))}

            <button type="button" onClick={addSection} className="btn-secondary text-sm w-full">
                + Add Section
            </button>
            </div>

            <div className="flex gap-3">
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
                {submitting ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" onClick={() => navigate(`/songs/${id}`)} className="btn-secondary">
                Cancel
            </button>
            </div>
        </form>
        </div>
    );
  }
    
