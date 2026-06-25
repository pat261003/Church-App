import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fetchLineup } from '../api/lineups';
import { ServiceLineup } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatDatePH } from '../utils/csv';

function getSongLink(songId: string, key?: string | null) {
  if (!key) return `/songs/${songId}`;

  return `/songs/${songId}?key=${encodeURIComponent(key)}`;
}

function normalizeExternalLink(link?: string | null) {
  if (!link) return '';

  const trimmed = link.trim();

  if (!trimmed) return '';

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

export default function LineupDetail() {
  const { id } = useParams<{ id: string }>();
  const [lineup, setLineup] = useState<ServiceLineup | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    fetchLineup(id)
      .then(setLineup)
      .catch(() => toast.error('Failed to load lineup'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner label="Loading lineup..." />;
  if (!lineup) return <p className="text-center text-gray-400 py-12">Lineup not found.</p>;

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-church-navy break-words">
            {lineup.title}
          </h1>

          <p className="text-gray-500 text-sm mt-1">
            {formatDatePH(lineup.service_date)} · Song Leader: {lineup.song_leader}
          </p>

          {lineup.notes && (
            <p className="text-sm text-gray-500 mt-1">
              {lineup.notes}
            </p>
          )}

          <div className="flex gap-2 flex-wrap mt-3">
            <Link to="/lineups" className="btn-secondary text-xs">
              ← Back
            </Link>

            <Link to={`/lineups/${lineup.id}/edit`} className="btn-secondary text-xs">
              Edit
            </Link>

            <Link to={`/print/lineup/${lineup.id}`} className="btn-secondary text-xs">
              Print
            </Link>
          </div>
        </div>
      </div>

      <div className="card flex flex-col gap-5">
        {lineup.sections.length === 0 ? (
          <p className="text-center text-gray-400 py-6">No songs in this lineup.</p>
        ) : (
          lineup.sections.map(section => (
            <div key={section.id}>
              <span className="section-label mb-2 inline-block">
                {section.section_name}
              </span>

              <div className="flex flex-col gap-2">
                {section.songs.map((song, index) => {
                  const leaderKey = song.key_override || song.current_key || song.original_key || '';
                  const attachedLink = normalizeExternalLink(song.song_link);

                  return (
                    <div
                      key={song.id}
                      className="bg-church-lightblue rounded-lg p-3 flex flex-col gap-3"
                    >
                      <div>
                        <Link
                          to={getSongLink(song.song_id, leaderKey)}
                          className="font-bold text-primary hover:underline text-base"
                        >
                          {index + 1}. {song.title}
                        </Link>

                        <p className="text-xs text-gray-500">
                          Leader Key: {leaderKey || '—'}
                          {song.artist ? ` · ${song.artist}` : ''}
                        </p>

                        {song.notes && (
                          <p className="text-xs text-gray-400 mt-1">{song.notes}</p>
                        )}
                      </div>

                      <div className="flex gap-2 flex-col sm:flex-row">
                        <Link
                          to={getSongLink(song.song_id, leaderKey)}
                          className="btn-secondary text-xs text-center"
                        >
                          Open Lyrics
                        </Link>

                        {attachedLink && (
                          <a
                            href={attachedLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-primary text-xs text-center"
                          >
                            Open Attached Link
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}