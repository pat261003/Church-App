import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { fetchAttendance } from '../api/attendance';

type WheelResult = {
  id: string;
  value: string;
  source: string;
  created_at: string;
};

const WHEEL_COLORS = [
  '#0B1957',
  '#FA9EBC',
  '#FFDBD1',
  '#5B7FA6',
  '#F8F3EA',
  '#7C3AED',
  '#F59E0B',
  '#10B981',
  '#EF4444',
  '#3B82F6',
];

function getTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function parseEntries(text: string) {
  return text
    .split(/[\n,]+/)
    .map(item => item.trim())
    .filter(Boolean);
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180;

  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeSlice(startAngle: number, endAngle: number) {
  const centerX = 160;
  const centerY = 160;
  const radius = 150;

  const start = polarToCartesian(centerX, centerY, radius, endAngle);
  const end = polarToCartesian(centerX, centerY, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return [
    `M ${centerX} ${centerY}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    'Z',
  ].join(' ');
}

function getShortLabel(value: string) {
  if (value.length <= 14) return value;
  return `${value.slice(0, 13)}…`;
}

function getTextColor(color: string) {
  const lightColors = ['#FFDBD1', '#F8F3EA'];
  return lightColors.includes(color) ? '#0B1957' : '#FFFFFF';
}

export default function Wheel() {
  const [entryText, setEntryText] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(getTodayDate());
  const [sourceLabel, setSourceLabel] = useState('Manual');
  const [removeWinner, setRemoveWinner] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winner, setWinner] = useState('');
  const [results, setResults] = useState<WheelResult[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('wheel-results') || '[]');
    } catch {
      return [];
    }
  });

  const timeoutRef = useRef<number | null>(null);

  const entries = useMemo(() => parseEntries(entryText), [entryText]);
  const sliceAngle = entries.length > 0 ? 360 / entries.length : 360;

  useEffect(() => {
    localStorage.setItem('wheel-results', JSON.stringify(results));
  }, [results]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  async function loadAttendanceNames(mode: 'replace' | 'append') {
    try {
      const records = await fetchAttendance(attendanceDate);
      const names = records
        .map(record => record.full_name?.trim())
        .filter(Boolean);

      if (names.length === 0) {
        toast.error('No attendees found for this date');
        return;
      }

      if (mode === 'replace') {
        setEntryText(names.join('\n'));
      } else {
        const current = parseEntries(entryText);
        setEntryText([...current, ...names].join('\n'));
      }

      setSourceLabel(`Attendance ${attendanceDate}`);
      toast.success(`${names.length} attendee name(s) loaded`);
    } catch {
      toast.error('Failed to load attendance names');
    }
  }

  function addQuickEntry() {
    const value = prompt('Enter name or number');

    if (!value?.trim()) return;

    const current = parseEntries(entryText);
    setEntryText([...current, value.trim()].join('\n'));
    setSourceLabel('Manual');
  }

  function removeOneEntry(value: string) {
    const current = parseEntries(entryText);
    let removed = false;

    const next = current.filter(item => {
      if (!removed && item === value) {
        removed = true;
        return false;
      }

      return true;
    });

    setEntryText(next.join('\n'));
  }

  function spinWheel() {
    if (spinning) return;

    if (entries.length < 2) {
      toast.error('Add at least 2 names or numbers');
      return;
    }

    const chosenIndex = Math.floor(Math.random() * entries.length);
    const chosenValue = entries[chosenIndex];

    const segmentCenterAngle = chosenIndex * sliceAngle + sliceAngle / 2;
    const currentRotation = ((rotation % 360) + 360) % 360;
    const targetBaseRotation = (360 - segmentCenterAngle) % 360;
    const extraRotation = (targetBaseRotation - currentRotation + 360) % 360;
    const fullSpins = 6 * 360;
    const nextRotation = rotation + fullSpins + extraRotation;

    setSpinning(true);
    setWinner('');
    setRotation(nextRotation);

    timeoutRef.current = window.setTimeout(() => {
      const result: WheelResult = {
        id: `${Date.now()}-${Math.random()}`,
        value: chosenValue,
        source: sourceLabel,
        created_at: new Date().toISOString(),
      };

      setWinner(chosenValue);
      setResults(prev => [result, ...prev]);
      setSpinning(false);

      if (removeWinner) {
        removeOneEntry(chosenValue);
      }

      toast.success(`Winner: ${chosenValue}`);
    }, 5200);
  }

  function clearWheel() {
    if (!confirm('Clear all names/numbers from the wheel?')) return;

    setEntryText('');
    setWinner('');
    setSourceLabel('Manual');
  }

  function clearResults() {
    if (!confirm('Clear all wheel results?')) return;

    setResults([]);
    setWinner('');
  }

  function removeResult(id: string) {
    setResults(prev => prev.filter(result => result.id !== id));
  }

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-church-navy">
            Wheel of Names
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Use this for Christmas, games, raffles, special numbers, or random picking.
          </p>
        </div>

        <button
          type="button"
          onClick={addQuickEntry}
          className="btn-primary text-sm"
        >
          + Quick Add
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.15fr_1fr] gap-4 items-start">
        {/* Names input */}
        <div className="card flex flex-col gap-4">
          <div>
            <h2 className="font-bold text-primary">
              Names / Numbers
            </h2>

            <p className="text-xs text-gray-500 mt-1">
              Type one per line. You can also separate using commas.
            </p>
          </div>

          <textarea
            value={entryText}
            onChange={e => {
              setEntryText(e.target.value);
              setSourceLabel('Manual');
            }}
            placeholder={`Juan Dela Cruz\nMaria Santos\n1\n2\n3`}
            className="input-field min-h-[260px] text-sm"
          />

          <div className="rounded-xl bg-primary-light p-3">
            <p className="text-xs font-bold text-primary uppercase tracking-wide">
              Attendance Import
            </p>

            <label className="text-xs text-gray-500 mt-2 block">
              Attendance date
            </label>

            <input
              type="date"
              value={attendanceDate}
              onChange={e => setAttendanceDate(e.target.value)}
              className="input-field mt-1 text-sm"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
              <button
                type="button"
                onClick={() => loadAttendanceNames('replace')}
                className="btn-secondary text-xs"
              >
                Replace with Attendees
              </button>

              <button
                type="button"
                onClick={() => loadAttendanceNames('append')}
                className="btn-secondary text-xs"
              >
                Add Attendees
              </button>
            </div>
          </div>

          <label className="flex items-start gap-2 text-sm text-church-navy">
            <input
              type="checkbox"
              checked={removeWinner}
              onChange={e => setRemoveWinner(e.target.checked)}
              className="mt-1"
            />

            <span>
              Remove winner after every spin
              <span className="block text-xs text-gray-500">
                Turn this on if the same name should not win again.
              </span>
            </span>
          </label>

          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={clearWheel}
              className="btn-secondary text-xs"
            >
              Clear Wheel
            </button>

            <span className="text-xs text-gray-400 self-center">
              {entries.length} item(s) in wheel
            </span>
          </div>
        </div>

        {/* Wheel */}
        <div className="card flex flex-col items-center gap-5 overflow-hidden">
          <div className="text-center">
            <h2 className="font-bold text-primary">
              Random Wheel
            </h2>

            <p className="text-xs text-gray-500 mt-1">
              Source: {sourceLabel}
            </p>
          </div>

          <button
            type="button"
            onClick={spinWheel}
            disabled={spinning || entries.length < 2}
            aria-label="Spin the wheel"
            title="Click to spin the wheel"
            className="relative w-[300px] h-[300px] sm:w-[360px] sm:h-[360px] flex items-center justify-center bg-transparent border-0 p-0 rounded-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
            >
            {/* Pointer */}
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                <div className="w-0 h-0 border-l-[16px] border-r-[16px] border-t-[30px] border-l-transparent border-r-transparent border-t-primary drop-shadow" />
            </div>

            <div
                className="w-[280px] h-[280px] sm:w-[330px] sm:h-[330px] rounded-full transition-transform ease-out pointer-events-none"
                style={{
                transform: `rotate(${rotation}deg)`,
                transitionDuration: spinning ? '5.2s' : '0ms',
                }}
            >
            
              <svg viewBox="0 0 320 320" className="w-full h-full drop-shadow-lg">
                <circle cx="160" cy="160" r="154" fill="rgb(var(--color-surface))" />

                {entries.length === 0 ? (
                  <>
                    <circle cx="160" cy="160" r="150" fill="rgb(var(--color-primary-light))" />
                    <text
                      x="160"
                      y="150"
                      textAnchor="middle"
                      className="fill-primary text-sm font-bold"
                    >
                      Add names
                    </text>
                    <text
                      x="160"
                      y="172"
                      textAnchor="middle"
                      className="fill-primary text-xs"
                    >
                      or load attendees
                    </text>
                  </>
                ) : entries.length === 1 ? (
                  <>
                    <circle cx="160" cy="160" r="150" fill={WHEEL_COLORS[0]} />
                    <text
                      x="160"
                      y="165"
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize="16"
                      fontWeight="700"
                    >
                      {getShortLabel(entries[0])}
                    </text>
                  </>
                ) : (
                  entries.map((entry, index) => {
                    const startAngle = index * sliceAngle;
                    const endAngle = startAngle + sliceAngle;
                    const middleAngle = startAngle + sliceAngle / 2;
                    const labelPosition = polarToCartesian(160, 160, 92, middleAngle);
                    const color = WHEEL_COLORS[index % WHEEL_COLORS.length];

                    return (
                      <g key={`${entry}-${index}`}>
                        <path
                          d={describeSlice(startAngle, endAngle)}
                          fill={color}
                          stroke="white"
                          strokeWidth="2"
                        />

                        {entries.length <= 30 && (
                          <text
                            x={labelPosition.x}
                            y={labelPosition.y}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill={getTextColor(color)}
                            fontSize={entries.length > 14 ? '9' : '11'}
                            fontWeight="700"
                            transform={`rotate(${middleAngle}, ${labelPosition.x}, ${labelPosition.y})`}
                          >
                            {getShortLabel(entry)}
                          </text>
                        )}
                      </g>
                    );
                  })
                )}

                <circle cx="160" cy="160" r="35" fill="white" stroke="rgb(var(--color-primary))" strokeWidth="4" />
                <text
                  x="160"
                  y="165"
                  textAnchor="middle"
                  fill="rgb(var(--color-primary))"
                  fontSize="13"
                  fontWeight="800"
                >
                  SPIN
                </text>
              </svg>
            </div>
        </button>


          <button
            type="button"
            onClick={spinWheel}
            disabled={spinning || entries.length < 2}
            className="btn-primary w-full sm:w-auto text-base px-8 py-3"
          >
            {spinning ? 'Spinning...' : 'Spin the Wheel'}
          </button>

          {winner && (
            <div className="w-full rounded-2xl bg-primary-light border border-church-border p-4 text-center">
              <p className="text-xs font-bold text-primary uppercase tracking-wide">
                Selected
              </p>

              <p className="text-2xl font-bold text-church-navy break-words mt-1">
                {winner}
              </p>
            </div>
          )}

          <p className="text-xs text-gray-400 text-center">
            Tip: If you want numbers only, type one number per line.
          </p>
        </div>

        {/* Results */}
        <div className="card flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-primary">
                Results
              </h2>

              <p className="text-xs text-gray-500">
                Latest winners will appear here.
              </p>
            </div>

            {results.length > 0 && (
              <button
                type="button"
                onClick={clearResults}
                className="btn-secondary text-xs"
              >
                Clear
              </button>
            )}
          </div>

          {results.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-2">🎁</p>
              <p className="text-sm">No results yet.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-[520px] overflow-y-auto pr-1">
              {results.map((result, index) => (
                <div
                  key={result.id}
                  className="rounded-xl border border-church-border bg-[rgb(var(--color-surface))] p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-primary uppercase tracking-wide">
                        Result #{results.length - index}
                      </p>

                      <p className="font-bold text-church-navy break-words">
                        {result.value}
                      </p>

                      <p className="text-[11px] text-gray-400 mt-1">
                        {result.source} · {formatDateTime(result.created_at)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeResult(result.id)}
                      className="text-xs text-red-500 hover:underline shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}