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
  previewWinner: string;
  results: WheelResult[];
};

type FullscreenTarget = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => void;
};

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  msFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
  msExitFullscreen?: () => void;
};

function getFullscreenElement() {
  const doc = document as FullscreenDocument;

  return (
    document.fullscreenElement ||
    doc.webkitFullscreenElement ||
    doc.msFullscreenElement ||
    null
  );
}

async function requestPageFullscreen(element: HTMLElement) {
  const target = element as FullscreenTarget;

  if (target.requestFullscreen) {
    await target.requestFullscreen();
    return;
  }

  if (target.webkitRequestFullscreen) {
    await target.webkitRequestFullscreen();
    return;
  }

  if (target.msRequestFullscreen) {
    target.msRequestFullscreen();
    return;
  }

  throw new Error('Fullscreen is not supported');
}

async function exitPageFullscreen() {
  const doc = document as FullscreenDocument;

  if (document.exitFullscreen) {
    await document.exitFullscreen();
    return;
  }

  if (doc.webkitExitFullscreen) {
    await doc.webkitExitFullscreen();
    return;
  }

  if (doc.msExitFullscreen) {
    doc.msExitFullscreen();
    return;
  }

  throw new Error('Fullscreen is not supported');
}

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

function getPreviewCandidates(entries: string[], chosenIndex: number, chosenValue: string) {
  const maxPossible = Math.max(entries.length - 1, 0);

  if (maxPossible === 0) return [];

  const desiredCount = Math.min(
    maxPossible,
    3 + Math.floor(Math.random() * 3)
  );

  const candidates: string[] = [];

  for (let offset = desiredCount; offset >= 1; offset--) {
    const index = (chosenIndex - offset + entries.length) % entries.length;
    const value = entries[index];

    if (value !== chosenValue && !candidates.includes(value)) {
      candidates.push(value);
    }
  }

  if (candidates.length < desiredCount) {
    entries.forEach(value => {
      if (
        value !== chosenValue &&
        !candidates.includes(value) &&
        candidates.length < desiredCount
      ) {
        candidates.push(value);
      }
    });
  }

  return candidates;
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
    previewWinner: '',
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
          previewWinner: '',
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [wheelSize, setWheelSize] = useState(() => {
    const savedSize = Number(localStorage.getItem('wheel-size') || 520);

    if (Number.isNaN(savedSize)) return 520;

    return Math.min(Math.max(savedSize, 320), 680);
  });
  const wheelPageRef = useRef<HTMLDivElement | null>(null);
  const timeoutRefs = useRef<Record<string, number>>({});
  const previewTimeoutRefs = useRef<Record<string, number>>({});
  const previewIntervalRefs = useRef<Record<string, number>>({});

  useEffect(() => {
    const safeWheels = wheels.map(wheel => ({
      ...wheel,
      spinning: false,
      previewWinner: '',
    }));

    localStorage.setItem('wheel-list', JSON.stringify(safeWheels));
  }, [wheels]);

  useEffect(() => {
    localStorage.setItem('wheel-size', String(wheelSize));
  }, [wheelSize]);

  useEffect(() => {
    return () => {
      Object.values(timeoutRefs.current).forEach(timeoutId => {
        window.clearTimeout(timeoutId);
      });

      Object.values(previewTimeoutRefs.current).forEach(timeoutId => {
        window.clearTimeout(timeoutId);
      });

      Object.values(previewIntervalRefs.current).forEach(intervalId => {
        window.clearInterval(intervalId);
      });
    };
  }, []);

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(Boolean(getFullscreenElement()));
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  async function toggleFullscreen() {
    try {
      if (getFullscreenElement()) {
        await exitPageFullscreen();
        return;
      }

      if (!wheelPageRef.current) return;

      await requestPageFullscreen(wheelPageRef.current);
    } catch {
      toast.error('Fullscreen is not supported on this browser');
    }
  }

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

    if (previewTimeoutRefs.current[wheelId]) {
      window.clearTimeout(previewTimeoutRefs.current[wheelId]);
      delete previewTimeoutRefs.current[wheelId];
    }

    if (previewIntervalRefs.current[wheelId]) {
      window.clearInterval(previewIntervalRefs.current[wheelId]);
      delete previewIntervalRefs.current[wheelId];
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
    const previewCandidates = getPreviewCandidates(entries, chosenIndex, chosenValue);

    updateWheel(wheelId, {
      spinning: true,
      winner: '',
      previewWinner: '',
      rotation: nextRotation,
    });

    if (timeoutRefs.current[wheelId]) {
      window.clearTimeout(timeoutRefs.current[wheelId]);
    }

    if (previewTimeoutRefs.current[wheelId]) {
      window.clearTimeout(previewTimeoutRefs.current[wheelId]);
    }

    if (previewIntervalRefs.current[wheelId]) {
      window.clearInterval(previewIntervalRefs.current[wheelId]);
    }

    let previewIndex = 0;

    previewTimeoutRefs.current[wheelId] = window.setTimeout(() => {
      if (previewCandidates.length === 0) return;

      updateWheel(wheelId, {
        previewWinner: previewCandidates[previewIndex],
      });

      previewIntervalRefs.current[wheelId] = window.setInterval(() => {
        previewIndex = (previewIndex + 1) % previewCandidates.length;

        updateWheel(wheelId, {
          previewWinner: previewCandidates[previewIndex],
        });
      }, 430);

      delete previewTimeoutRefs.current[wheelId];
    }, 3000);

    timeoutRefs.current[wheelId] = window.setTimeout(() => {
      const result: WheelResult = {
        id: createId('result'),
        value: chosenValue,
        source: wheel.sourceLabel,
        created_at: new Date().toISOString(),
      };

      if (previewIntervalRefs.current[wheelId]) {
        window.clearInterval(previewIntervalRefs.current[wheelId]);
        delete previewIntervalRefs.current[wheelId];
      }

      if (previewTimeoutRefs.current[wheelId]) {
        window.clearTimeout(previewTimeoutRefs.current[wheelId]);
        delete previewTimeoutRefs.current[wheelId];
      }

      setWheels(prev =>
        prev.map(currentWheel => {
          if (currentWheel.id !== wheelId) return currentWheel;

          return {
            ...currentWheel,
            winner: chosenValue,
            previewWinner: '',
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
      previewWinner: '',
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
      previewWinner: '',
    });
  }

  function removeResult(wheelId: string, resultId: string) {
    updateWheel(wheelId, currentWheel => ({
      ...currentWheel,
      results: currentWheel.results.filter(result => result.id !== resultId),
    }));
  }

  return (
    <div
      ref={wheelPageRef}
      className={`w-full flex flex-col gap-5 px-3 sm:px-5 lg:px-8 py-4 sm:py-5 overflow-x-hidden bg-church-lightblue ${
        isFullscreen
          ? 'min-h-screen h-screen overflow-y-auto'
          : 'min-h-[calc(100vh-5rem)]'
      }`}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-church-navy">
            Wheel of Names
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Use this for Christmas, games, raffles, special numbers, or random picking.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
          <div className="rounded-xl bg-[rgb(var(--color-surface))] px-3 py-2 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-1">
              <label className="text-xs font-bold text-primary uppercase tracking-wide">
                Wheel Size
              </label>

              <span className="text-xs font-bold text-church-navy">
                {wheelSize}px
              </span>
            </div>

            <input
              type="range"
              min="320"
              max="680"
              step="20"
              value={wheelSize}
              onChange={e => setWheelSize(Number(e.target.value))}
              className="w-48 max-w-full accent-primary"
            />

            <div className="grid grid-cols-3 gap-1 mt-2">
              <button
                type="button"
                onClick={() => setWheelSize(400)}
                className="btn-secondary text-[11px] px-2 py-1"
              >
                Small
              </button>

              <button
                type="button"
                onClick={() => setWheelSize(520)}
                className="btn-secondary text-[11px] px-2 py-1"
              >
                Medium
              </button>

              <button
                type="button"
                onClick={() => setWheelSize(640)}
                className="btn-secondary text-[11px] px-2 py-1"
              >
                Large
              </button>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={toggleFullscreen}
              className="btn-secondary text-sm"
            >
              {isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
            </button>

            <button
              type="button"
              onClick={addWheel}
              className="btn-primary text-sm"
            >
              + Add Wheel
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        {wheels.map((wheel, wheelIndex) => {
          const entries = parseEntries(wheel.entryText);
          const sliceAngle = entries.length > 0 ? 360 / entries.length : 360;

          return (
            <section key={wheel.id} className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <input
                    value={wheel.title}
                    onChange={e =>
                      updateWheel(wheel.id, {
                        title: e.target.value,
                      })
                    }
                    onBlur={() => {
                      if (!wheel.title.trim()) {
                        updateWheel(wheel.id, {
                          title: `Wheel ${wheelIndex + 1}`,
                        });
                      }
                    }}
                    placeholder={`Wheel ${wheelIndex + 1}`}
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

              <div className="grid grid-cols-1 xl:grid-cols-[minmax(230px,0.65fr)_minmax(360px,1.9fr)_minmax(230px,0.65fr)] 2xl:grid-cols-[minmax(260px,0.6fr)_minmax(520px,2.2fr)_minmax(260px,0.6fr)] gap-4 items-start">
                {/* Names input */}
                <div className="card !p-3 flex flex-col gap-3 min-w-0">
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
                    className="input-field min-h-[220px] xl:min-h-[300px] text-sm"
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

                    <div className="grid grid-cols-1 gap-2 mt-3">
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
                <div className="card !p-3 sm:!p-4 flex flex-col items-center gap-3 overflow-hidden min-w-0">
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
                    className={`relative max-w-full flex items-center justify-center bg-transparent border-0 p-0 rounded-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-70 transition-transform ${
                      wheel.spinning ? 'wheel-zooming' : 'hover:scale-[1.03] active:scale-95'
                    }`}
                    style={{
                      width: wheelSize,
                      height: wheelSize,
                      maxWidth: 'calc(100vw - 2rem)',
                      maxHeight: 'calc(100vw - 2rem)',
                    }}
                  >
                    {/* Pointer */}
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                      <div className="w-0 h-0 border-l-[16px] border-r-[16px] border-t-[30px] border-l-transparent border-r-transparent border-t-primary drop-shadow" />
                    </div>

                    {wheel.spinning && (
                      <div className="absolute top-5 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                        <div className="wheel-winner-preview rounded-2xl bg-white/95 border-2 border-primary px-4 py-2 shadow-xl text-center min-w-[170px]">
                          <p className="text-[10px] font-bold text-primary uppercase tracking-wide whitespace-nowrap">
                            {wheel.previewWinner ? 'Near the arrow...' : 'Selecting...'}
                          </p>

                          <p className="text-sm font-extrabold text-church-navy break-words leading-tight mt-0.5">
                            {wheel.previewWinner || 'Slowing down'}
                          </p>
                        </div>
                      </div>
                    )}

                    <div
                      className="max-w-full rounded-full transition-transform ease-out pointer-events-none"
                      style={{
                        width: Math.max(wheelSize - 30, 280),
                        height: Math.max(wheelSize - 30, 280),
                        maxWidth: 'calc(100vw - 3rem)',
                        maxHeight: 'calc(100vw - 3rem)',
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
                            const isPreviewWinner = wheel.previewWinner === entry;

                            return (
                              <g key={`${entry}-${index}`}>
                                <path
                                  d={describeSlice(startAngle, endAngle)}
                                  fill={color}
                                  stroke={isPreviewWinner ? '#FFFFFF' : 'white'}
                                  strokeWidth={isPreviewWinner ? '6' : '2'}
                                  opacity={wheel.previewWinner && !isPreviewWinner ? 0.72 : 1}
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
                <div className="card !p-3 flex flex-col gap-3 min-w-0">
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
                    <div className="flex flex-col gap-2 max-h-[320px] xl:max-h-[520px] overflow-y-auto pr-1">
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