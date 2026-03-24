import { useState, useMemo, useRef, useEffect } from 'react';
import './App.css';
import type { ClusterPlan, WeeklySummaryData, GridPosition, ScheduleResponse, ChangedPosition } from './types';
import { parsePositionsToGrid, simPositionsToGrid } from './utils';
import { DataCentreGrid } from './DataCentreGrid';
import { Sidebar } from './Sidebar';
import { RackSelectorModal } from './RackSelectorModal';

const LOCAL_API  = 'http://localhost:8000';
const REMOTE_API = 'https://backend-125308697189.europe-north1.run.app';

async function getApiBase(): Promise<string> {
  try {
    const res = await fetch(`${LOCAL_API}/`, { method: 'GET', signal: AbortSignal.timeout(1000) });
    if (res.ok) return LOCAL_API;
  } catch { /* localhost not available */ }
  return REMOTE_API;
}

function computeStdDev(positions: GridPosition[], powerMap: Map<string, number>): number {
  const powers = positions
    .map(p => (p.rack_type ? (powerMap.get(p.rack_type) ?? powerMap.get(p.rack_type.toUpperCase())) : undefined) ?? 0)
    .filter(p => p > 0);
  if (!powers.length) return 0;
  const mean = powers.reduce((a, b) => a + b, 0) / powers.length;
  return Math.sqrt(powers.reduce((acc, p) => acc + (p - mean) ** 2, 0) / powers.length);
}

// ── SVG icons ────────────────────────────────────────────────────────────────
const IcoLightning = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <path d="M13 2 3.5 13.5h7L8 22l12.5-12H13L16 2z" />
  </svg>
);
const IcoSpinner = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="animate-spin">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round" />
  </svg>
);
const IcoPencil = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const IcoReset = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
  </svg>
);
const IcoChevronLeft = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m15 18-6-6 6-6" />
  </svg>
);
const IcoChevronRight = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 18 6-6-6-6" />
  </svg>
);
const IcoPlay = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4l14 8-14 8V4z" /></svg>
);
const IcoPause = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" />
  </svg>
);
const IcoActivity = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12h4l3-8 4 16 3-8h4" />
  </svg>
);
const IcoStar = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className="text-primary">
    <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74z" />
  </svg>
);
const IcoArrowRight = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

// ── App ──────────────────────────────────────────────────────────────────────
function App() {
  const [plan, setPlan]                         = useState<ClusterPlan | null>(null);
  const [selectedSuiteIndex, setSelectedSuiteIndex] = useState(0);
  const [error, setError]                       = useState('');
  const [fileName, setFileName]                 = useState('');
  const [viewMode, setViewMode]                 = useState<'type' | 'power'>('type');
  const [plannedMoves, setPlannedMoves]         = useState<{row: number; col: number; rackType: string | null}[]>([]);
  const [modalPos, setModalPos]                 = useState<{row: number; col: number} | null>(null);
  const [greenMode, setGreenMode]               = useState(false);
  const [highlightedCells, setHighlightedCells] = useState<Set<string> | null>(null);

  // Simulation state
  const [isSimulating, setIsSimulating]         = useState(false);
  const [scheduleResults, setScheduleResults]   = useState<WeeklySummaryData[] | null>(null);
  const [initialSimPositions, setInitialSimPositions] = useState<GridPosition[] | null>(null);
  const [simWeek, setSimWeek]                   = useState(0);
  const [isPlaying, setIsPlaying]               = useState(false);
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isSimMode = scheduleResults !== null;
  const totalWeeks = scheduleResults?.length ?? 0;

  // Play interval
  useEffect(() => {
    if (isPlaying && isSimMode) {
      playRef.current = setInterval(() => {
        setSimWeek(prev => {
          if (prev >= totalWeeks) { setIsPlaying(false); return prev; }
          return prev + 1;
        });
      }, 1200);
    } else {
      if (playRef.current) clearInterval(playRef.current);
    }
    return () => { if (playRef.current) clearInterval(playRef.current); };
  }, [isPlaying, isSimMode, totalWeeks]);

  // ── File upload ─────────────────────────────────────────────────────────
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(''); setSelectedSuiteIndex(0); setPlannedMoves([]);
    setScheduleResults(null); setHighlightedCells(null); setSimWeek(0);
    setIsPlaying(false); setFileName(file.name);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const api = await getApiBase();
      const res = await fetch(`${api}/upload-plan`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error(res.statusText);
      setPlan(await res.json());
    } catch {
      setError('Failed to process file. Is the backend running?');
    }
  };

  // ── Optimization ─────────────────────────────────────────────────────────
  const handleRunOptimization = async () => {
    if (!plan) return;
    setIsSimulating(true); setError('');
    try {
      const api = await getApiBase();
      const planToSend = modifiedSuite
        ? { ...plan, cluster_plans: plan.cluster_plans.map((s, i) => i === selectedSuiteIndex ? modifiedSuite : s) }
        : plan;
      const res = await fetch(`${api}/schedule?days=30`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...planToSend, optimisation_mode: greenMode ? 'green' : 'normal' }),
      });
      if (!res.ok) throw new Error(res.statusText);
      const data: ScheduleResponse = await res.json();
      setScheduleResults(data.weeks);
      setInitialSimPositions(data.initial_positions);
      setSimWeek(0); setIsPlaying(false);
    } catch (err) {
      setError('Failed to run optimization. Check backend logs.');
      console.error(err);
    } finally {
      setIsSimulating(false);
    }
  };

  // ── Grid derivation ──────────────────────────────────────────────────────
  const currentSuite = plan?.cluster_plans?.[selectedSuiteIndex];
  const baseGrid = currentSuite ? parsePositionsToGrid(currentSuite.positions) : null;

  const localGrid = useMemo(() => {
    if (!baseGrid) return null;
    const g = baseGrid.map(row => [...row]);
    plannedMoves.forEach(m => { g[m.row][m.col] = m.rackType; });
    return g;
  }, [baseGrid, plannedMoves]);

  const simGrid = useMemo(() => {
    if (!scheduleResults || !initialSimPositions) return null;
    const positions = simWeek === 0
      ? initialSimPositions
      : scheduleResults[simWeek - 1].grid_positions;
    return simPositionsToGrid(positions);
  }, [scheduleResults, simWeek, initialSimPositions]);

  const displayGrid = isSimMode ? simGrid : localGrid;

  const simChangedCells = useMemo(() => {
    if (!scheduleResults || simWeek === 0) return undefined;
    const changed: ChangedPosition[] = scheduleResults[simWeek - 1].changed_positions;
    return new Set(changed.map(p => `${p.row - 1},${p.position - 1}`));
  }, [scheduleResults, simWeek]);

  const modifiedSuite = useMemo(() => {
    if (!currentSuite || !plan || plannedMoves.length === 0) return currentSuite;
    const moveMap   = new Map(plannedMoves.map(m => [`${m.row},${m.col}`, m.rackType]));
    const specMap   = new Map(plan.rack_types.map(r => [r.name, r]));
    const positions = currentSuite.positions.map(pos => {
      const key = `${Number(pos.row)},${Number(pos.position)}`;
      return moveMap.has(key) ? { ...pos, rack_type: moveMap.get(key) ?? '' } : pos;
    });
    let totalPower = 0, compute = 0, storage = 0, ai = 0;
    positions.forEach(pos => {
      const spec = pos.rack_type ? specMap.get(pos.rack_type) : undefined;
      if (!spec) return;
      totalPower += spec.power_need;
      compute    += spec.resources.compute;
      storage    += spec.resources.storage;
      ai         += spec.resources.ai;
    });
    return { ...currentSuite, positions, total_power_usage: totalPower, compute, storage, ai };
  }, [currentSuite, plannedMoves, plan]);

  // ── Simulation stats ─────────────────────────────────────────────────────
  // Normalise keys to uppercase so lookup works regardless of backend case
  const rackPowerMap = useMemo(
    () => new Map((plan?.rack_types ?? []).map(r => [r.name.toUpperCase(), r.power_need])),
    [plan]
  );
  const currentSimPositions: GridPosition[] = useMemo(() => {
    if (!scheduleResults || !initialSimPositions) return [];
    return simWeek === 0 ? initialSimPositions : scheduleResults[simWeek - 1].grid_positions;
  }, [scheduleResults, simWeek, initialSimPositions]);

  const movesUpToNow      = useMemo(() => (scheduleResults ?? []).slice(0, simWeek).reduce((a, w) => a + w.racks_replaced, 0), [scheduleResults, simWeek]);
  const totalRacksReplaced = useMemo(() => (scheduleResults ?? []).reduce((a, w) => a + w.racks_replaced, 0), [scheduleResults]);
  const completionPct      = totalWeeks > 0 ? Math.round((simWeek / totalWeeks) * 100) : 0;
  const initialStd         = useMemo(() => computeStdDev(initialSimPositions ?? [], rackPowerMap), [initialSimPositions, rackPowerMap]);
  const currentStd         = useMemo(() => computeStdDev(currentSimPositions, rackPowerMap), [currentSimPositions, rackPowerMap]);
  const variancePct        = initialStd > 0 ? ((initialStd - currentStd) / initialStd) * 100 : 0;
  const simPowerByRow = useMemo(() => {
    const rowMap = new Map<number, number>();
    currentSimPositions.forEach(pos => {
      if (!pos.rack_type) return;
      const power = rackPowerMap.get(pos.rack_type) ?? rackPowerMap.get(pos.rack_type.toUpperCase()) ?? 0;
      rowMap.set(pos.row, (rowMap.get(pos.row) ?? 0) + power);
    });
    return Array.from(rowMap.entries()).filter(([, p]) => p > 0).sort(([a], [b]) => a - b);
  }, [currentSimPositions, rackPowerMap]);
  const simMaxRowPower = Math.max(...simPowerByRow.map(([, p]) => p), 1);
  const simTotalPower  = simPowerByRow.reduce((a, [, p]) => a + p, 0);

  const currentWeekData    = isSimMode && simWeek > 0 ? scheduleResults![simWeek - 1] : null;
  const changedPositions: ChangedPosition[] = currentWeekData?.changed_positions ?? [];
  const dailyDist = useMemo(() => {
    if (!currentWeekData) return Array(7).fill(0) as number[];
    const days = Array(7).fill(0) as number[];
    for (let i = 0; i < currentWeekData.racks_replaced; i++) days[i % 5]++;
    return days;
  }, [currentWeekData]);
  const maxPerDay = Math.max(...dailyDist, 1);
  const sliderPct = totalWeeks > 0 ? (simWeek / totalWeeks) * 100 : 0;

  const handleRackSelect = (newType: string | null) => {
    if (!modalPos || !localGrid) return;
    const currentType = localGrid[modalPos.row][modalPos.col];
    if (newType !== currentType) {
      setPlannedMoves(prev => {
        const filtered = prev.filter(m => m.row !== modalPos.row || m.col !== modalPos.col);
        return [...filtered, { row: modalPos.row, col: modalPos.col, rackType: newType }];
      });
    }
    setModalPos(null);
  };

  const rows = displayGrid?.length || 0;
  const cols = displayGrid?.[0]?.length || 0;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="px-6 py-4 min-h-screen text-white font-sans" style={{ backgroundColor: 'hsl(222 20% 8%)' }}>

      {/* ── Header ── */}
      <div className="flex justify-between items-center mb-5 pb-4 border-b border-[#1e2028]">
        <h2 className="m-0 text-lg flex items-center gap-2.5">
          <img src="/meta.png" alt="Meta" className="h-6 w-auto" />
          <span style={{ color: 'hsl(210 100% 56%)' }} className="font-semibold">Data Centre Suite</span>
          {plan && (
            <span className="text-[#555] text-[13px] font-normal border-l border-[#222] pl-3 ml-1 font-mono">
              <span className="text-[#aaa] font-semibold mr-2">{fileName}</span>
              ({rows}×{cols})
            </span>
          )}
        </h2>

        <div className="flex gap-3 items-center">
          {plan && !isSimMode && (
            <select
              value={selectedSuiteIndex}
              onChange={e => { setSelectedSuiteIndex(Number(e.target.value)); setPlannedMoves([]); setHighlightedCells(null); }}
              className="py-2 px-3.5 text-white border border-[#2a2d35] rounded-md text-[13px] font-mono"
              style={{ backgroundColor: 'hsl(222 18% 11%)' }}
            >
              {plan.cluster_plans.map((s, i) => (
                <option key={i} value={i}>{s.datacenter} – {s.suite}</option>
              ))}
            </select>
          )}

          {isSimMode ? (
            <button
              onClick={() => { setScheduleResults(null); setSimWeek(0); setIsPlaying(false); }}
              className="py-2 px-4 rounded-md text-[13px] font-semibold border border-[#2a2d35] text-[#aaa] hover:text-white hover:border-[#444] transition-colors flex items-center gap-2"
            >
              <IcoPencil /> Edit Mode
            </button>
          ) : (
            <>
              {/* Normal / Green toggle */}
              <div className="flex items-center gap-2 border border-[#2a2d35] rounded-md px-3 py-1.5" style={{ backgroundColor: 'hsl(222 18% 11%)' }}>
                <span className={`text-[12px] font-semibold ${!greenMode ? 'text-white' : 'text-[#555]'}`}>Normal</span>
                <button
                  onClick={() => setGreenMode(p => !p)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${greenMode ? 'bg-[#22C55E]' : 'bg-[#333]'}`}
                  aria-label="Toggle green mode"
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${greenMode ? 'translate-x-5' : ''}`} />
                </button>
                <span className={`text-[12px] font-semibold ${greenMode ? 'text-[#22C55E]' : 'text-[#555]'}`}>Green</span>
              </div>

              {/* Run Optimization */}
              <button
                onClick={handleRunOptimization}
                disabled={isSimulating || !plan}
                className={`py-2 px-4 rounded-md text-[13px] font-semibold flex items-center gap-2 transition-colors border
                  ${isSimulating || !plan
                    ? 'border-[#2a2d35] text-[#555] cursor-not-allowed'
                    : 'border-[#22C55E] text-[#22C55E] hover:bg-[#22C55E]/10'}`}
              >
                {isSimulating ? <><IcoSpinner /> Running…</> : <><IcoLightning /> Run Optimization</>}
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div className="text-red-400 mb-4 text-sm">{error}</div>}

      {/* ── Main content ── */}
      {plan && currentSuite && displayGrid ? (
        <div className="flex gap-4 items-start">

          {/* ── Left: Grid card ── */}
          <div className="flex-1 min-w-0 flex flex-col gap-4">
            <div className="rounded-xl border border-[#1e2028] overflow-hidden" style={{ backgroundColor: 'hsl(222 18% 11%)' }}>

              {/* Grid card header */}
              <div className="flex justify-between items-center px-5 pt-5 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-[15px] font-semibold text-[#ccc]">Suite Layout</span>
                  {isSimMode && (
                    <>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full font-mono"
                        style={{ backgroundColor: 'hsl(210 100% 56% / 0.15)', color: 'hsl(210 100% 56%)' }}>
                        Week {simWeek}
                      </span>
                      <span className="text-[11px] text-[#555] border border-[#2a2d35] px-2.5 py-0.5 rounded-full">Read-only</span>
                      {movesUpToNow > 0 && (
                        <span className="text-[13px] font-semibold" style={{ color: 'hsl(160 84% 45%)' }}>
                          {movesUpToNow} changes
                        </span>
                      )}
                    </>
                  )}
                  {!isSimMode && highlightedCells && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-400 border border-amber-400/30 bg-amber-400/8 px-2 py-1 rounded-full">
                      <span>{highlightedCells.size} highlighted</span>
                      <button onClick={() => setHighlightedCells(null)} className="hover:text-white">✕</button>
                    </div>
                  )}
                </div>

                {/* Rack / Power toggle */}
                <div className="flex border border-[#2a2d35] rounded overflow-hidden">
                  <button
                    onClick={() => setViewMode('type')}
                    className={`px-3 py-1 text-[11px] font-mono font-semibold transition-colors ${viewMode === 'type' ? 'text-white' : 'text-[#555] hover:text-[#888]'}`}
                    style={viewMode === 'type' ? { backgroundColor: 'hsl(222 15% 18%)' } : {}}
                  >
                    Rack View
                  </button>
                  <div className="w-px bg-[#2a2d35]" />
                  <button
                    onClick={() => setViewMode('power')}
                    className={`px-3 py-1 text-[11px] font-mono font-semibold transition-colors ${viewMode === 'power' ? 'text-white' : 'text-[#555] hover:text-[#888]'}`}
                    style={viewMode === 'power' ? { backgroundColor: 'hsl(222 15% 18%)' } : {}}
                  >
                    Power Heatmap
                  </button>
                </div>
              </div>

              {/* Grid */}
              <div className="px-5 py-4">
                <DataCentreGrid
                  grid={displayGrid}
                  title=""
                  viewMode={viewMode}
                  rackTypes={plan.rack_types}
                  onCellClick={isSimMode ? undefined : (row, col) => setModalPos({ row, col })}
                  highlightedCells={isSimMode ? simChangedCells : (highlightedCells ?? undefined)}
                />
              </div>
            </div>

            {/* Planned modifications (edit mode only) */}
            {!isSimMode && plannedMoves.length > 0 && (
              <div className="rounded-xl border border-[#1e2028] p-5" style={{ backgroundColor: 'hsl(222 18% 11%)' }}>
                <div className="flex justify-between items-center mb-4">
                  <span className="font-semibold text-[14px]">Planned Modifications ({plannedMoves.length})</span>
                  <button onClick={() => setPlannedMoves([])}
                    className="text-xs text-red-400 bg-red-500/10 px-3 py-1 rounded border border-red-500/30 hover:bg-red-500/20 transition-colors">
                    Clear All
                  </button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {plannedMoves.map((m, i) => (
                    <div key={i} className="bg-[#0d1017] px-3 py-2 rounded border border-[#1e2028] text-sm flex justify-between items-center">
                      <span className="flex items-center gap-2">
                        <span className="text-[#555] font-mono">R{m.row.toString().padStart(2,'0')} P{m.col}</span>
                        <IcoArrowRight />
                        <span className="font-mono font-semibold" style={{ color: m.rackType ? 'hsl(210 100% 56%)' : 'hsl(160 84% 45%)' }}>
                          {m.rackType || 'EMPTY'}
                        </span>
                      </span>
                      <button onClick={() => setPlannedMoves(prev => prev.filter((_, idx) => idx !== i))}
                        className="text-[#555] hover:text-white text-xs transition-colors">Undo</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Right: Sidebar ── */}
          {isSimMode ? (
            /* Simulation stats sidebar */
            <div className="w-80 shrink-0 flex flex-col gap-3">

              {/* Timeline card */}
              <div className="rounded-xl border border-[#1e2028] p-5" style={{ backgroundColor: 'hsl(222 18% 11%)' }}>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[11px] font-bold tracking-widest uppercase" style={{ color: 'hsl(210 100% 56%)' }}>Timeline</span>
                  <span className="text-[14px] font-semibold text-white">
                    Week <span className="font-bold" style={{ color: 'hsl(210 100% 56%)' }}>{simWeek}</span> of {totalWeeks}
                  </span>
                </div>

                <input
                  type="range" min={0} max={totalWeeks} value={simWeek}
                  onChange={e => { setIsPlaying(false); setSimWeek(Number(e.target.value)); }}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer mb-1.5"
                  style={{
                    background: `linear-gradient(to right, hsl(210 100% 56%) 0%, hsl(210 100% 56%) ${sliderPct}%, hsl(222 15% 20%) ${sliderPct}%, hsl(222 15% 20%) 100%)`,
                  }}
                />
                <div className="flex justify-between px-0.5 mb-5">
                  {Array.from({ length: totalWeeks + 1 }, (_, i) => (
                    <span key={i} className="text-[10px] text-[#444] font-mono">{i}</span>
                  ))}
                </div>

                <div className="flex items-center justify-center gap-3">
                  {/* Reset */}
                  <button onClick={() => { setIsPlaying(false); setSimWeek(0); }}
                    className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#2a2d35] text-[#666] hover:text-white hover:border-[#444] transition-colors">
                    <IcoReset />
                  </button>
                  {/* Prev */}
                  <button onClick={() => { setIsPlaying(false); setSimWeek(w => Math.max(0, w - 1)); }}
                    disabled={simWeek === 0}
                    className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#2a2d35] text-white disabled:text-[#2a2d35] disabled:border-[#1e2028] hover:bg-[#2a2d35] transition-colors">
                    <IcoChevronLeft />
                  </button>
                  {/* Play/Pause */}
                  <button
                    onClick={() => { if (simWeek >= totalWeeks) setSimWeek(0); setIsPlaying(p => !p); }}
                    className="w-12 h-12 flex items-center justify-center rounded-xl transition-colors text-white"
                    style={{ backgroundColor: isPlaying ? 'hsl(210 60% 28%)' : 'hsl(210 100% 56%)' }}
                  >
                    {isPlaying ? <IcoPause /> : <IcoPlay />}
                  </button>
                  {/* Next */}
                  <button onClick={() => { setIsPlaying(false); setSimWeek(w => Math.min(totalWeeks, w + 1)); }}
                    disabled={simWeek === totalWeeks}
                    className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#2a2d35] text-white disabled:text-[#2a2d35] disabled:border-[#1e2028] hover:bg-[#2a2d35] transition-colors">
                    <IcoChevronRight />
                  </button>
                </div>
              </div>

              {/* Plan quality */}
              <div className="rounded-xl border border-[#1e2028] p-5" style={{ backgroundColor: 'hsl(222 18% 11%)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <IcoStar />
                  <span className="text-[11px] text-[#aaa] uppercase font-bold tracking-widest">Plan Quality</span>
                </div>

                {/* Completion */}
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[12px] text-[#666]">Completion</span>
                  <span className="text-[12px] font-bold text-white">{completionPct}%</span>
                </div>
                <div className="h-1.5 bg-[#1e2028] rounded-full mb-5">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${completionPct}%`,
                      backgroundColor: completionPct === 100 ? 'hsl(160 84% 45%)' : 'hsl(210 100% 56%)',
                    }} />
                </div>

                {/* Duration + Total Moves */}
                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div>
                    <div className="flex items-center gap-1.5 text-[10px] text-[#444] uppercase font-bold tracking-wider mb-2">
                      {/* calendar icon */}
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      Duration
                    </div>
                    <div className="text-[20px] font-bold text-white leading-none">
                      {totalWeeks} <span className="text-[11px] text-[#444] font-normal">weeks</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-[10px] text-[#444] uppercase font-bold tracking-wider mb-2">
                      {/* pick/tool icon */}
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                      </svg>
                      Total Moves
                    </div>
                    <div className="text-[20px] font-bold text-white leading-none">
                      {movesUpToNow} <span className="text-[11px] text-[#444] font-normal">/ {totalRacksReplaced}</span>
                    </div>
                  </div>
                </div>

                {/* Power Variance */}
                <div className="flex items-center gap-1.5 text-[10px] text-[#444] uppercase font-bold tracking-wider mb-2">
                  {/* trend-down icon */}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>
                  </svg>
                  Power Variance
                </div>
                {initialStd > 0 ? (
                  <>
                    <div className="text-[24px] font-bold leading-none mb-1"
                      style={{ color: variancePct > 0 ? 'hsl(160 84% 45%)' : variancePct < 0 ? 'hsl(0 72% 55%)' : 'white' }}>
                      {variancePct > 0 ? '−' : variancePct < 0 ? '+' : ''}{Math.abs(variancePct).toFixed(1)}%
                    </div>
                    <div className="text-[11px] text-[#444] font-mono mb-2">
                      {initialStd.toFixed(1)} → {currentStd.toFixed(1)} kW std
                    </div>
                    {variancePct > 5 && (
                      <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'hsl(160 84% 45%)' }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        Row power distribution optimized
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-[13px] text-[#444]">
                    All rack types have equal power — variance is uniform.
                  </div>
                )}
              </div>

              {/* Moves this week */}
              <div className="rounded-xl border border-[#1e2028] p-5" style={{ backgroundColor: 'hsl(222 18% 11%)' }}>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <IcoActivity />
                    <span className="text-[11px] text-[#aaa] uppercase font-bold tracking-widest">Moves This Week</span>
                  </div>
                  {currentWeekData && (
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border font-mono"
                      style={{ color: 'hsl(210 100% 56%)', borderColor: 'hsl(210 100% 56% / 0.35)', backgroundColor: 'hsl(210 100% 56% / 0.10)' }}>
                      {currentWeekData.racks_replaced} moves
                    </span>
                  )}
                </div>

                {currentWeekData ? (
                  <>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[11px] text-[#555]">Daily distribution</span>
                      <span className="text-[11px] text-[#444]">max {maxPerDay}/day</span>
                    </div>
                    <div className="flex gap-1 items-end h-8 mb-1">
                      {dailyDist.map((count, i) => (
                        <div key={i} className="flex-1 flex items-end h-full">
                          <div className="w-full rounded-sm transition-all"
                            style={{
                              height: `${count > 0 ? Math.max((count / maxPerDay) * 100, 20) : 12}%`,
                              opacity: count > 0 ? 1 : 0.25,
                              backgroundColor: count > 0 ? 'hsl(210 100% 56%)' : 'hsl(222 15% 20%)',
                            }} />
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-1 mb-4">
                      {['M','T','W','T','F','S','S'].map((d, i) => (
                        <div key={i} className="flex-1 text-center text-[9px] text-[#444]">{d}</div>
                      ))}
                    </div>
                    <div className="space-y-1.5 max-h-52 overflow-y-auto">
                      {changedPositions.map((p, i) => (
                        <div key={i} className="flex items-center gap-2 text-[11px] text-[#666]">
                          <IcoArrowRight />
                          <span>
                            <span className="font-mono text-[#888]">{p.old_rack}</span>
                            <span className="mx-1.5 text-[#444]">→</span>
                            <span className="font-mono text-[#ccc]">{p.new_rack}</span>
                            <span className="ml-2 text-[#444] font-mono">R{String(p.row).padStart(2,'0')}P{p.position}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-[12px] text-[#444]">Press play or drag the slider to begin.</p>
                )}
              </div>

              {/* Power by Row */}
              {simPowerByRow.length > 0 && (
                <div className="rounded-xl border border-[#1e2028] p-5" style={{ backgroundColor: 'hsl(222 18% 11%)' }}>
                  <div className="text-[10px] text-[#444] uppercase font-bold tracking-widest mb-4">
                    Power by Row (kW)
                  </div>
                  <div className="space-y-1.25 max-h-64 overflow-y-auto pr-1">
                    {simPowerByRow.map(([row, power]) => (
                      <div key={row} className="flex items-center gap-3">
                        <span className="text-[11px] text-[#444] font-mono w-8 shrink-0 text-right">
                          R{row.toString().padStart(2, '0')}
                        </span>
                        <div className="flex-1 h-6 bg-[#1e2028] rounded overflow-hidden">
                          <div
                            className="h-full rounded transition-all duration-300"
                            style={{
                              width: `${(power / simMaxRowPower) * 100}%`,
                              background: 'linear-gradient(to right, #1D4ED8, #60A5FA)',
                            }}
                          />
                        </div>
                        <span className="text-[11px] text-[#666] font-mono w-9 text-right shrink-0">{power}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-4 pt-3 border-t border-[#1e2028] text-[11px] text-[#444]">
                    <span>Total: {simTotalPower.toLocaleString()} kW</span>
                    <span>Max row: {simMaxRowPower} kW</span>
                  </div>
                </div>
              )}

              <button
                onClick={() => { setScheduleResults(null); setSimWeek(0); setIsPlaying(false); }}
                className="text-[12px] text-[#444] hover:text-white text-center py-2 transition-colors"
              >
                ← Back to Edit Mode
              </button>
            </div>
          ) : (
            /* Normal edit sidebar */
            <Sidebar suite={modifiedSuite!} constraints={plan.constraints} viewMode={viewMode} rackTypes={plan.rack_types} />
          )}
        </div>
      ) : (
        /* Upload prompt */
        <div className="flex flex-col items-center justify-center mt-20 p-16 rounded-xl border border-dashed border-[#2a2d35] max-w-[560px] mx-auto text-center"
          style={{ backgroundColor: 'hsl(222 18% 11%)' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#333] mb-4">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <h3 className="text-[17px] font-semibold mb-2 text-[#ccc]">Upload a configuration to begin</h3>
          <p className="text-[13px] text-[#444] mb-6">Accepts JSON cluster plan files</p>
          <label className="py-2.5 px-6 rounded-md cursor-pointer font-semibold text-[13px] text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: 'hsl(210 100% 56%)' }}>
            Choose JSON File
            <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      )}

      {plan && modalPos && localGrid && (
        <RackSelectorModal
          isOpen={!!modalPos}
          onClose={() => setModalPos(null)}
          onSelect={handleRackSelect}
          position={modalPos}
          currentType={localGrid[modalPos.row][modalPos.col]}
          rackTypes={plan.rack_types}
        />
      )}
    </div>
  );
}

export default App;
