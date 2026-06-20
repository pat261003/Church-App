import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchLineup } from '../api/lineups';
import { ServiceLineup } from '../types';
import { formatDatePH } from '../utils/csv';

export default function PrintLineup() {
  const { id } = useParams<{ id: string }>();
  const [lineup, setLineup] = useState<ServiceLineup | null>(null);
  const [loading, setLoading] = useState(true);
  const printed = useRef(false);

  useEffect(() => {
    if (!id) return;

    fetchLineup(id)
      .then(setLineup)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!loading && lineup && !printed.current) {
      printed.current = true;
      setTimeout(() => window.print(), 400);
    }
  }, [loading, lineup]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Preparing lineup for print...</p>
      </div>
    );
  }

  if (!lineup) return <p className="text-center text-gray-400 py-12">Lineup not found.</p>;

  return (
    <div className="p-8 max-w-2xl mx-auto font-sans">
      <div className="border-b-2 border-gray-300 pb-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{lineup.title}</h1>
        <p className="text-sm text-gray-600">{formatDatePH(lineup.service_date)}</p>
        <p className="text-sm text-gray-600">Song Leader: {lineup.song_leader}</p>
        {lineup.notes && <p className="text-sm text-gray-500 mt-2">{lineup.notes}</p>}
      </div>

      <div className="flex flex-col gap-6">
        {lineup.sections.map(section => (
          <div key={section.id}>
            <h2 className="text-lg font-bold text-gray-900 border-b border-gray-300 mb-2">
              {section.section_name}
            </h2>

            <ol className="list-decimal pl-6 flex flex-col gap-1">
              {section.songs.map(song => (
                <li key={song.id} className="text-base">
                  <span className="font-semibold">{song.title}</span>
                  <span className="text-gray-500 text-sm">
                    {' '}— Key: {song.key_override || song.current_key || song.original_key || '—'}
                  </span>
                  {song.artist && (
                    <span className="text-gray-500 text-sm"> · {song.artist}</span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>

      <div className="mt-8 pt-4 border-t border-gray-300 text-xs text-gray-400 flex justify-between">
        <span>Full Gospel Faith Temple Inc.</span>
        <span>{lineup.title}</span>
      </div>

      <div className="mt-6 text-center no-print">
        <button onClick={() => window.print()} className="btn-primary">
          Print
        </button>
      </div>
    </div>
  );
}