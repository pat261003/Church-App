import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { fetchAttendance } from '../api/attendance';

type WheelResult = {
  id: string;
  value: string;
  source: string;
  created_at: string;
};

type WheelData = {
  id: string;
  title: string;
  entryText: string;
  attendanceDate: string;
  sourceLabel: string;
  removeWinner: boolean;
  spinning: boolean;
  rotation: number;
  winner: string;
  results: WheelResult[];
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

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

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

function removeOneEntryFromText(text: string, value: string) {
  const current = parseEntries(text);
  let removed = false;

  const next = current.filter(item => {
    if (!removed && item === value) {
      removed = true;
      return false;
    }

    return true;
  });

  return next.join('\n');
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

function getWheelFontSize(count: number) {
  if (count <= 6) return '12';
  if (count <= 10) return '10';
  if (count <= 16) return '8.5';
  if (count <= 24) return '7';
  if (count <= 40) return '5.8';
  return '5';
}

function getWheelLabelRadius(count: number) {
  if (count <= 6) return 86;
  if (count <= 12) return 96;
  if (count <= 24) return 106;
  return 114;
}

function getWheelTextRotation(angle: number) {
  let rotation = angle - 90;

  if (angle > 180) {
    rotation += 180;
  }

  return rotation;
}

function createWheel(index: number, overrides?: Partial<WheelData>): WheelData {
  return {
    id: createId('wheel'),
    title: `Wheel ${index}`,
    entryText: '',
    attendanceDate: getTodayDate(),
    sourceLabel: 'Manual',
    removeWinner: false,
    spinning: false,
    rotation: 0,
    winner: '',
    results: [],
    ...overrides,
  };
}

function getInitialWheels(): WheelData[] {
  try {
    const saved = localStorage.getItem('wheel-list');

    if (saved) {
      const parsed = JSON.parse(saved);

      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((wheel, index) => ({
          ...createWheel(index + 1),
          ...wheel,
          title: wheel.title || `Wheel ${index + 1}`,
          attendanceDate: wheel.attendanceDate || getTodayDate(),
          sourceLabel: wheel.sourceLabel || 'Manual',
          removeWinner: Boolean(wheel.removeWinner),
          spinning: false,
          results: Array.isArray(wheel.results) ? wheel.results : [],
        }));
      }
    }
  } catch {
    // Ignore bad saved data and use fallback below.
  }

  let oldResults: WheelResult[] = [];

  try {
    oldResults = JSON.parse(localStorage.getItem('wheel-results') || '[]');
  } catch {
    oldResults = [];
  }

  return [
    createWheel(1, {
      title: 'Wheel 1',
      entryText: localStorage.getItem('wheel-entry-text') || '',
      attendanceDate: localStorage.getItem('wheel-attendance-date') || getTodayDate(),
      sourceLabel: localStorage.getItem('wheel-source-label') || 'Manual',
      removeWinner: localStorage.getItem('wheel-remove-winner') === 'true',
      results: oldResults,
    }),
  ];
}

export default function Wheel() {
  const [wheels, setWheels] = useState<WheelData[]>(() => getInitialWheels());
  const timeoutRefs = useRef<Record<string, number>>({});

  useEffect(() => {
    const safeWheels = wheels.map(wheel => ({
      ...wheel,
      spinning: false,
    }));

    localStorage.setItem('wheel-list', JSON.stringify(safeWheels));
  }, [wheels]);

  useEffect(() => {
    return () => {
      Object.values(timeoutRefs.current).forEach(timeoutId => {
        window.clearTimeout(timeoutId);
      });
    };
  }, []);

  function updateWheel(wheelId: string, updater: Partial<WheelData> | ((wheel: WheelData) => WheelData)) {
    setWheels(prev =>
      prev.map(wheel => {
        if (wheel.id !== wheelId) return wheel;

        if (typeof updater === 'function') {
          return updater(wheel);
        }

        return {
          ...wheel,
          ...updater,
        };
      })
    );
  }

  function addWheel() {
    setWheels(prev => [
      ...prev,
      createWheel(prev.length + 1, {
        title: `Wheel ${prev.length + 1}`,
      }),
    ]);

    toast.success('New wheel added');
  }

  function removeWheel(wheelId: string) {
    const target = wheels.find(wheel => wheel.id === wheelId);

    if (!target) return;

    if (!confirm(`Remove "${target.title}"? Its names and results will be deleted.`)) return;

    if (timeoutRefs.current[wheelId]) {
      window.clearTimeout(timeoutRefs.current[wheelId]);
      delete timeoutRefs.current[wheelId];
    }

    setWheels(prev => prev.filter(wheel => wheel.id !== wheelId));
    toast.success('Wheel removed');
  }

  async function loadAttendanceNames(wheelId: string, mode: 'replace' | 'append') {
    const wheel = wheels.find(item => item.id === wheelId);

    if (!wheel) return;

    try {
      const records = await fetchAttendance(wheel.attendanceDate);
      const names = records
        .map(record => record.full_name?.trim())
        .filter(Boolean);

      if (names.length === 0) {
        toast.error('No attendees found for this date');
        return;
      }

      updateWheel(wheelId, currentWheel => {
        const current = parseEntries(currentWheel.entryText);

        return {
          ...currentWheel,
          entryText: mode === 'replace'
            ? names.join('\n')
            : [...current, ...names].join('\n'),
          sourceLabel: `Attendance ${currentWheel.attendanceDate}`,
        };
      });

      toast.success(`${names.length} attendee name(s) loaded`);
    } catch {
      toast.error('Failed to load attendance names');
    }
  }

  function spinWheel(wheelId: string) {
    const wheel = wheels.find(item => item.id === wheelId);

    if (!wheel || wheel.spinning) return;

    const entries = parseEntries(wheel.entryText);
    const sliceAngle = entries.length > 0 ? 360 / entries.length : 360;

    if (entries.length < 2) {
      toast.error('Add at least 2 names or numbers');
      return;
    }

    const chosenIndex = Math.floor(Math.random() * entries.length);
    const chosenValue = entries[chosenIndex];

    const segmentCenterAngle = chosenIndex * sliceAngle + sliceAngle / 2;
    const currentRotation = ((wheel.rotation % 360) + 360) % 360;
    const targetBaseRotation = (360 - segmentCenterAngle) % 360;
    const extraRotation = (targetBaseRotation - currentRotation + 360) % 360;
    const fullSpins = 6 * 360;
    const nextRotation = wheel.rotation + fullSpins + extraRotation;

    updateWheel(wheelId, {
      spinning: true,
      winner: '',
      rotation: nextRotation,
    });

    if (timeoutRefs.current[wheelId]) {
      window.clearTimeout(timeoutRefs.current[wheelId]);
    }

    timeoutRefs.current[wheelId] = window.setTimeout(() => {
      const result: WheelResult = {
        id: createId('result'),
        value: chosenValue,
        source: wheel.sourceLabel,
        created_at: new Date().toISOString(),
      };

      setWheels(prev =>
        prev.map(currentWheel => {
          if (currentWheel.id !== wheelId) return currentWheel;

          return {
            ...currentWheel,
            winner: chosenValue,
            results: [result, ...currentWheel.results],
            spinning: false,
            entryText: currentWheel.removeWinner
              ? removeOneEntryFromText(currentWheel.entryText, chosenValue)
              : currentWheel.entryText,
          };
        })
      );

      delete timeoutRefs.current[wheelId];
      toast.success(`Winner: ${chosenValue}`);
    }, 5200);
  }

  function clearWheel(wheelId: string) {
    const wheel = wheels.find(item => item.id === wheelId);

    if (!wheel) return;

    if (!confirm(`Clear all names/numbers from "${wheel.title}"?`)) return;

    updateWheel(wheelId, {
      entryText: '',
      winner: '',
      sourceLabel: 'Manual',
    });
  }

  function clearResults(wheelId: string) {
    const wheel = wheels.find(item => item.id === wheelId);

    if (!wheel) return;

    if (!confirm(`Clear all results from "${wheel.title}"?`)) return;

    updateWheel(wheelId, {
      results: [],
      winner: '',
    });
  }

  function removeResult(wheelId: string, resultId: string) {
    updateWheel(wheelId, currentWheel => ({
      ...currentWheel,
      results: currentWheel.results.filter(result => result.id !== resultId),
    }));
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
          onClick={addWheel}
          className="btn-primary text-sm"
        >
          + Add Wheel
        </button>
      </div>

      <div className="flex flex-col gap-6">
        {wheels.map((wheel, wheelIndex) => {
          const entries = parseEntries(wheel.entryText);
          const sliceAngle = entries.length > 0 ? 360 / entries.length : 360;

          return (
            <section key={wheel.id} className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <input
                    value={wheel.title}
                    onChange={e => updateWheel(wheel.id, { title: e.target.value || `Wheel ${wheelIndex + 1}` })}
                    className="bg-transparent text-xl font-bold text-church-navy focus:outline-none focus:ring-2 focus:ring-primary rounded-lg px-2 py-1 -ml-2 max-w-full"
                    aria-label="Wheel title"
                  />

                  <p className="text-xs text-gray-500">
                    {entries.length} item(s) · {wheel.results.length} result(s)
                  </p>
                </div>

                {wheels.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeWheel(wheel.id)}
                    className="btn-secondary text-xs text-red-500"
                  >
                    Remove Wheel
                  </button>
                )}
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
                    value={wheel.entryText}
                    onChange={e => {
                      updateWheel(wheel.id, {
                        entryText: e.target.value,
                        sourceLabel: 'Manual',
                      });
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
                      value={wheel.attendanceDate}
                      onChange={e => updateWheel(wheel.id, { attendanceDate: e.target.value })}
                      className="input-field mt-1 text-sm"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                      <button
                        type="button"
                        onClick={() => loadAttendanceNames(wheel.id, 'replace')}
                        className="btn-secondary text-xs"
                      >
                        Replace with Attendees
                      </button>

                      <button
                        type="button"
                        onClick={() => loadAttendanceNames(wheel.id, 'append')}
                        className="btn-secondary text-xs"
                      >
                        Add Attendees
                      </button>
                    </div>
                  </div>

                  <label className="flex items-start gap-2 text-sm text-church-navy">
                    <input
                      type="checkbox"
                      checked={wheel.removeWinner}
                      onChange={e => updateWheel(wheel.id, { removeWinner: e.target.checked })}
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
                      onClick={() => clearWheel(wheel.id)}
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
                      Source: {wheel.sourceLabel}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => spinWheel(wheel.id)}
                    disabled={wheel.spinning || entries.length < 2}
                    aria-label="Spin the wheel"
                    title="Click to spin the wheel"
                    className={`relative w-[300px] h-[300px] sm:w-[360px] sm:h-[360px] flex items-center justify-center bg-transparent border-0 p-0 rounded-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-70 transition-transform ${
                      wheel.spinning ? 'wheel-zooming' : 'hover:scale-[1.03] active:scale-95'
                    }`}
                  >
                    {/* Pointer */}
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                      <div className="w-0 h-0 border-l-[16px] border-r-[16px] border-t-[30px] border-l-transparent border-r-transparent border-t-primary drop-shadow" />
                    </div>

                    {wheel.spinning && (
                      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-30 pointer-events-none rounded-full bg-white/95 border border-church-border px-3 py-1 shadow-md">
                        <p className="text-[11px] font-bold text-primary whitespace-nowrap">
                          Selecting...
                        </p>
                      </div>
                    )}

                    <div
                      className="w-[280px] h-[280px] sm:w-[330px] sm:h-[330px] rounded-full transition-transform ease-out pointer-events-none"
                      style={{
                        transform: `rotate(${wheel.rotation}deg)`,
                        transitionDuration: wheel.spinning ? '5.2s' : '0ms',
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
                            const labelRadius = getWheelLabelRadius(entries.length);
                            const labelPosition = polarToCartesian(160, 160, labelRadius, middleAngle);
                            const color = WHEEL_COLORS[index % WHEEL_COLORS.length];
                            const fontSize = getWheelFontSize(entries.length);
                            const textRotation = getWheelTextRotation(middleAngle);

                            return (
                              <g key={`${entry}-${index}`}>
                                <path
                                  d={describeSlice(startAngle, endAngle)}
                                  fill={color}
                                  stroke="white"
                                  strokeWidth="2"
                                />

                                <text
                                  x={labelPosition.x}
                                  y={labelPosition.y}
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                  fill={getTextColor(color)}
                                  fontSize={fontSize}
                                  fontWeight="800"
                                  letterSpacing="0.2"
                                  transform={`rotate(${textRotation}, ${labelPosition.x}, ${labelPosition.y})`}
                                >
                                  {getShortLabel(entry)}
                                </text>
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
                    onClick={() => spinWheel(wheel.id)}
                    disabled={wheel.spinning || entries.length < 2}
                    className="btn-primary w-full sm:w-auto text-base px-8 py-3"
                  >
                    {wheel.spinning ? 'Spinning...' : 'Spin the Wheel'}
                  </button>

                  {wheel.winner && (
                    <div className="w-full rounded-2xl bg-primary-light border border-church-border p-4 text-center">
                      <p className="text-xs font-bold text-primary uppercase tracking-wide">
                        Selected
                      </p>

                      <p className="text-2xl font-bold text-church-navy break-words mt-1">
                        {wheel.winner}
                      </p>
                    </div>
                  )}

                  <p className="text-xs text-gray-400 text-center">
                    Tap the wheel itself or press the button to spin.
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
                        Latest winners for this wheel.
                      </p>
                    </div>

                    {wheel.results.length > 0 && (
                      <button
                        type="button"
                        onClick={() => clearResults(wheel.id)}
                        className="btn-secondary text-xs"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {wheel.results.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <p className="text-4xl mb-2">🎁</p>
                      <p className="text-sm">No results yet.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-[520px] overflow-y-auto pr-1">
                      {wheel.results.map((result, index) => (
                        <div
                          key={result.id}
                          className="rounded-xl border border-church-border bg-[rgb(var(--color-surface))] p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold text-primary uppercase tracking-wide">
                                Result #{wheel.results.length - index}
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
                              onClick={() => removeResult(wheel.id, result.id)}
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
            </section>
          );
        })}
      </div>
    </div>
  );
}