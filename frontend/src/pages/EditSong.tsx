import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fetchSong, updateSong } from '../api/songs';
import { Song, SongSection } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import { ALL_KEYS } from '../utils/transpose';
import SongSectionsEditor, { withClientIds } from '../components/SongSectionsEditor';

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
        setSections(withClientIds(data.sections));
      })
      .catch(() => toast.error('Failed to load song'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return toast.error('Title is required');
    if (!id) return;
    if (sections.some(s => !s.content.trim())) return toast.error('All sections need content');

    setSubmitting(true);
    try {
      const updated = await updateSong(id, {
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
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1 block">Key</label>
              <select
                value={originalKey}
                onChange={e => setOriginalKey(e.target.value)}
                className="input-field"
              >
                {ALL_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600 mb-1 block">Artist</label>
              <input
                value={artist}
                onChange={e => setArtist(e.target.value)}
                className="input-field"
                placeholder="Optional"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600 mb-1 block">Tags</label>
            <input
              value={tags}
              onChange={e => setTags(e.target.value)}
              className="input-field"
              placeholder="Worship, Hymn..."
            />
          </div>
        </div>

        <SongSectionsEditor sections={sections} setSections={setSections} />

        <div className="flex gap-3">
          <button type="submit" disabled={submitting} className="btn-primary flex-1">
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>

          <button
            type="button"
            onClick={() => navigate(`/songs/${id}`)}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}