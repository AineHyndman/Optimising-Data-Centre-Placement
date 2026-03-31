import { useState, useMemo, useRef, useEffect } from 'react';
import './App.css';
import type { ClusterPlan, WeeklySummaryData, GridPosition, ScheduleResponse, ChangedPosition } from './types';
import { parsePositionsToGrid, simPositionsToGrid, computeStdDev } from './utils';
import { DataCentreGrid } from './DataCentreGrid';
import { Sidebar } from './Sidebar';
import { RackSelectorModal } from './RackSelectorModal';
import { OptimizationModal } from './OptimizationModal';
import { PlannedModifications } from './PlannedModifications';
import { SimPanel } from './SimPanel';
import { IcoLightning, IcoSpinner, IcoPencil, IcoAddFile, IcoDownload } from './icons';

const LOCAL_API  = 'http://localhost:8000';
const REMOTE_API = 'https://backend-125308697189.europe-north1.run.app';

async function getApiBase(): Promise<string> {
  try {
    const res = await fetch(`${LOCAL_API}/`, { method: 'GET', signal: AbortSignal.timeout(1000) });
    if (res.ok) return LOCAL_API;
  } catch { /* localhost not available */ }
  return REMOTE_API;
}



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

  // Optimization config modal
  const [showOptModal, setShowOptModal]         = useState(false);
  const [optWeeks, setOptWeeks]                 = useState(4);
  const [optMaxPerDay, setOptMaxPerDay]         = useState(32);
  const [simTab, setSimTab]                     = useState<'sim' | 'metrics'>('sim');

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
  const handleRunOptimization = async (weeks: number, maxPerDay: number) => {
    if (!plan) return;
    setShowOptModal(false);
    setIsSimulating(true); setError('');
    try {
      const api = await getApiBase();
      const planToSend = modifiedSuite
        ? { ...plan, cluster_plans: plan.cluster_plans.map((s, i) => i === selectedSuiteIndex ? modifiedSuite : s) }
        : plan;
      const res = await fetch(`${api}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...planToSend,
          optimisation_mode: greenMode ? 'green' : 'normal',
          weeks,
          max_moves_per_day: maxPerDay,
        }),
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
    return new Set(changed.map(p => `${p.row},${p.position - 1}`));
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
  const rackPowerMap = useMemo(
    () => new Map((plan?.rack_types ?? []).map(r => [r.name.toUpperCase(), r.power_need])),
    [plan]
  );
  const currentSimPositions: GridPosition[] = useMemo(() => {
    if (!scheduleResults || !initialSimPositions) return [];
    return simWeek === 0 ? initialSimPositions : scheduleResults[simWeek - 1].grid_positions;
  }, [scheduleResults, simWeek, initialSimPositions]);

  const movesUpToNow       = useMemo(() => (scheduleResults ?? []).slice(0, simWeek).reduce((a, w) => a + w.racks_replaced, 0), [scheduleResults, simWeek]);
  const totalRacksReplaced = useMemo(() => (scheduleResults ?? []).reduce((a, w) => a + w.racks_replaced, 0), [scheduleResults]);
  const completionPct      = totalWeeks > 0 ? Math.round((simWeek / totalWeeks) * 100) : 0;
  const initialStd         = useMemo(() => computeStdDev(initialSimPositions ?? [], rackPowerMap), [initialSimPositions, rackPowerMap]);
  const currentStd         = useMemo(() => computeStdDev(currentSimPositions, rackPowerMap), [currentSimPositions, rackPowerMap]);
  const variancePct        = initialStd > 0 ? ((initialStd - currentStd) / initialStd) * 100 : 0;
  const weeklyStd          = useMemo(() => {
    if (!initialSimPositions || !scheduleResults) return [];
    const result = [computeStdDev(initialSimPositions, rackPowerMap)];
    scheduleResults.forEach(w => result.push(computeStdDev(w.grid_positions, rackPowerMap)));
    return result;
  }, [initialSimPositions, scheduleResults, rackPowerMap]);
  const weeklyPower        = useMemo(() => {
    if (!initialSimPositions || !scheduleResults) return [];
    const week0 = initialSimPositions.reduce((sum, p) =>
      sum + (p.rack_type ? (rackPowerMap.get(p.rack_type.toUpperCase()) ?? 0) : 0), 0);
    return [week0, ...scheduleResults.map(w => w.total_power_usage)];
  }, [initialSimPositions, scheduleResults, rackPowerMap]);
  const weeklyReplacements = useMemo(
    () => (scheduleResults ?? []).map(w => w.racks_replaced),
    [scheduleResults]
  );
  const sliderPct          = totalWeeks > 0 ? (simWeek / totalWeeks) * 100 : 0;

  const currentWeekData    = isSimMode && simWeek > 0 ? scheduleResults![simWeek - 1] : null;
  const changedPositions: ChangedPosition[] = currentWeekData?.changed_positions ?? [];
  const dailyDist = useMemo(() => {
    if (!currentWeekData) return Array(7).fill(0) as number[];
    const days = Array(7).fill(0) as number[];
    for (let i = 0; i < currentWeekData.racks_replaced; i++) days[i % 5]++;
    return days;
  }, [currentWeekData]);
  const maxPerDay = Math.max(...dailyDist, 1);


  // ── Rack selection ───────────────────────────────────────────────────────
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

  // ── Download ─────────────────────────────────────────────────────────────
  const handleDownloadResults = () => {
    if (!plan || !scheduleResults) return;
    const finalPositions = scheduleResults[scheduleResults.length - 1].grid_positions;
    const optimizedPositions = finalPositions
      .filter(p => p.rack_type !== null)
      .map(p => ({ rack_type: p.rack_type as string, row: String(p.row), position: String(p.position) }));
    const optimizedSuite = {
      ...(modifiedSuite ?? currentSuite ?? plan.cluster_plans[selectedSuiteIndex]),
      positions: optimizedPositions,
    };
    const planToExport: ClusterPlan = {
      ...plan,
      cluster_plans: plan.cluster_plans.map((s, i) => i === selectedSuiteIndex ? optimizedSuite : s),
    };
    const blob = new Blob([JSON.stringify(planToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cluster-plan_${fileName.replace('.json', '')}_optimized.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const rows = displayGrid?.length || 0;
  const cols = displayGrid?.[0]?.length || 0;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="px-6 py-4 min-h-screen text-white font-sans" style={{ backgroundColor: 'hsl(222 20% 8%)' }}>

      {/* ── Header ── */}
      <div className="flex justify-between items-center mb-5">
        <h2 className="m-0 text-lg flex items-center gap-2.5">
          <button
            onClick={() => {
              setPlan(null);
              setFileName('');
              setPlannedMoves([]);
              setScheduleResults(null);
              setSimWeek(0);
              setIsPlaying(false);
              setHighlightedCells(null);
              setError('');
            }}
            className="flex items-center gap-2.5 cursor-pointer bg-transparent border-none p-0 hover:brightness-125 transition-all"
          >
            <img src="/meta.png" alt="Meta" className="h-6 w-auto" />
            <span style={{ 
              color: '#3B82F6',
              fontFamily: 'MyFont',
              fontSize: '1.5rem',
            }} className="font-semibold">OptiSuite</span>
          </button>
          {plan && (
            <span className="text-[#555] text-[13px] font-normal pl-3 ml-1 font-mono">
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
            <>
              <label className="cursor-pointer py-2 px-3.5 rounded-md text-[13px] font-semibold border border-[#3B82F6]/50 text-[#3B82F6] hover:bg-[#3B82F6]/10 transition-colors flex items-center gap-2">
                <IcoAddFile /> Upload File
                <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
              </label>
              <button
                onClick={handleDownloadResults}
                className="cursor-pointer py-2 px-3.5 rounded-md text-[13px] font-semibold border border-[#22C55E]/50 text-[#22C55E] hover:bg-[#22C55E]/10 transition-colors flex items-center gap-2"
              >
                <IcoDownload /> Download JSON
              </button>
              <button
                onClick={() => { setScheduleResults(null); setSimWeek(0); setIsPlaying(false); }}
                className="cursor-pointer py-2 px-3.5 rounded-md text-[13px] font-semibold border border-[#2a2d35] text-[#aaa] hover:text-white hover:border-[#444] transition-colors flex items-center gap-2"
              >
                <IcoPencil /> Edit Mode
              </button>
            </>
          ) : plan ? (
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

              <label className="cursor-pointer py-2 px-3.5 rounded-md text-[13px] font-semibold border border-[#3B82F6]/50 text-[#3B82F6] hover:bg-[#3B82F6]/10 transition-colors flex items-center gap-2">
                <IcoAddFile /> Upload File
                <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
              </label>
              {/* Run Optimization */}
              <button
                onClick={() => setShowOptModal(true)}
                disabled={isSimulating}
                className={`cursor-pointer py-2 px-3.5 rounded-md text-[13px] font-semibold flex items-center gap-2 transition-colors border
                  ${isSimulating
                    ? 'border-[#2a2d35] text-[#555] cursor-not-allowed'
                    : 'border-[#22C55E] text-[#22C55E] hover:bg-[#22C55E]/10'}`}
              >
                {isSimulating ? <><IcoSpinner /> Running…</> : <><IcoLightning /> Run Optimization</>}
              </button>
            </>
          ) : (
            <label className="cursor-pointer py-2 px-3.5 rounded-md text-[13px] font-semibold border border-[#3B82F6]/50 text-[#3B82F6] hover:bg-[#3B82F6]/10 transition-colors flex items-center gap-2"
              style={{ fontFamily: 'MyFont' }}>
              <IcoAddFile /> Upload Plan
              <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
            </label>
          )}
        </div>

      </div>

      {/* Neon LED bar */}
        <div className="w-full mb-4" style={{ height: '6px', position: 'relative' }}>
          {/* Outer soft glow */}
          <div style={{
            position: 'absolute', inset: '-6px 0',
            background: 'linear-gradient(90deg, transparent 0%, #1d6fce 20%, #3B82F6 50%, #1d6fce 80%, transparent 100%)',
            filter: 'blur(8px)', opacity: 0.6,
          }} />
          {/* Mid glow */}
          <div style={{
            position: 'absolute', inset: '-2px 0',
            background: 'linear-gradient(90deg, transparent 0%, #2563eb 15%, #60a5fa 50%, #2563eb 85%, transparent 100%)',
            filter: 'blur(3px)', opacity: 0.9,
          }} />
          {/* Core bright line */}
          <div style={{
            position: 'absolute', inset: '1px 4px',
            background: 'linear-gradient(90deg, transparent 0%, #bfdbfe 20%, #ffffff 50%, #bfdbfe 80%, transparent 100%)',
            borderRadius: '9999px',
          }} />
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
              <PlannedModifications
                moves={plannedMoves}
                onClear={() => setPlannedMoves([])}
                onUndo={i => setPlannedMoves(prev => prev.filter((_, idx) => idx !== i))}
              />
            )}
          </div>

          {/* ── Right: sidebar ── */}
          <div className="w-80 shrink-0 flex flex-col gap-3">

            {/* Tab bar — sim mode only */}
            {isSimMode && (
              <div className="flex rounded-lg border border-[#1e2028] overflow-hidden" style={{ backgroundColor: 'hsl(222 18% 11%)' }}>
                {(['sim', 'metrics'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setSimTab(tab)}
                    className={`flex-1 py-2 text-[12px] font-semibold tracking-wide transition-colors cursor-pointer ${
                      simTab === tab
                        ? 'text-white'
                        : 'text-[#555] hover:text-[#aaa]'
                    }`}
                    style={simTab === tab ? { backgroundColor: 'hsl(222 15% 18%)' } : {}}
                  >
                    {tab === 'sim' ? 'Simulation' : 'Metrics'}
                  </button>
                ))}
              </div>
            )}

            {/* Simulation tab */}
            {(!isSimMode || simTab === 'sim') && isSimMode && (
              <SimPanel
                simWeek={simWeek}
                setSimWeek={setSimWeek}
                isPlaying={isPlaying}
                setIsPlaying={setIsPlaying}
                totalWeeks={totalWeeks}
                sliderPct={sliderPct}
                movesUpToNow={movesUpToNow}
                totalRacksReplaced={totalRacksReplaced}
                completionPct={completionPct}
                variancePct={variancePct}
                initialStd={initialStd}
                currentStd={currentStd}
                currentWeekData={currentWeekData}
                changedPositions={changedPositions}
                dailyDist={dailyDist}
                maxPerDay={maxPerDay}
                weeklyStd={weeklyStd}
                weeklyPower={weeklyPower}
                weeklyReplacements={weeklyReplacements}
                onOpenSettings={() => setShowOptModal(true)}
              />
            )}

            {/* Metrics tab (always shown in edit mode, tab-gated in sim mode) */}
            {(!isSimMode || simTab === 'metrics') && (
              <Sidebar
                suite={modifiedSuite ?? currentSuite!}
                constraints={plan.constraints}
                viewMode={viewMode}
                rackTypes={plan.rack_types}
                currentWeekData={currentWeekData}
                className="flex flex-col gap-3"
              />
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center mt-16 max-w-[700px] mx-auto text-center">
          <div className="flex items-center gap-3 mb-3">
            <img src="/meta.png" alt="Meta" className="h-10 w-auto" />
            <span style={{ 
              color: '#ffffff', 
              fontFamily: 'MyFont', 
              textShadow: '0 0 2px #fff ,0 0 25px #3B82F6, 0 0 50px #3B82F6, 0 0 90px #3B82F6, 0 0 140px #2563eb', 
              fontSize: '2.5rem',
              }} className="font-semibold">OptiSuite</span>
          </div>
          <p style={{fontFamily: 'MyFont'}} className="text-[#888] text-sm mb-10 max-w-[480px]">
            Visualise rack layouts, run weekly optimisation schedules, and track hardware upgrades across your data centre fleet.
          </p>

          <div className="w-full grid grid-cols-3 gap-4 mb-10">
            <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-lg p-5 text-left" style={{
              border: "1px solid #5d9bffaa",
              boxShadow: "0 0 12px 3px #3B82F644, 0 0 24px 6px #3B82F622, inset 0 0 16px 2px #3B82F620",
            }}>
              <div style={{fontFamily: 'MyFont', fontSize: '1.3rem'}}className="flex items-center justify-center">Upload</div>
              <div style={{fontFamily: 'MyFont'}} className="text-xs text-center text-[#888]">Import a cluster plan JSON file generated by the placement optimiser</div>
            </div>
            <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-lg p-5 text-left" style={{
              border: "1px solid #5d9bffaa",
              boxShadow: "0 0 12px 3px #3B82F644, 0 0 24px 6px #3B82F622, inset 0 0 16px 2px #3B82F620",
            }}>
              <div style={{fontFamily: 'MyFont', fontSize: '1.3rem'}} className="flex items-center justify-center">Inspect</div>
              <div style={{fontFamily: 'MyFont'}} className="text-xs text-center text-[#888]">Browse suites, view rack types and power heatmaps, and make manual edits</div>
            </div>
            <div className="bg-[#1a1d24] border border-[#2a2d35] rounded-lg p-5 text-left" style={{
              border: "1px solid #5d9bffaa",
              boxShadow: "0 0 12px 3px #3B82F644, 0 0 24px 6px #3B82F622, inset 0 0 16px 2px #3B82F620",
            }}>
              <div style={{fontFamily: 'MyFont', fontSize: '1.3rem'}} className="flex items-center justify-center">Optimise</div>
              <div style={{fontFamily: 'MyFont'}} className="text-xs text-center text-[#888]">Run a configurable simulation to upgrade racks week-by-week within power constraints</div>
            </div>
          </div>

          <label className="upload-btn hover:bg-[#3B82F6]/10 transition-colors text-white py-3 px-8 rounded-lg cursor-pointer text-sm" style={{
            backgroundColor: 'hsl(222 20% 8%)',
            border: '1px solid #3B82F6aa',
            boxShadow: '0 0 10px 2px #3B82F633, 0 0 20px 4px #2563eb22, inset 0 0 12px 1px #3B82F615',
            transition: 'color 0.2s',
            fontFamily: 'MyFont',
            fontSize: '1rem'
          }}>
            Upload Cluster Plan
            <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
          </label>
          <p style={{fontFamily: 'MyFont'}} className="text-[#777] text-xs mt-3">Accepts .json files from the placement optimiser</p>
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

      {showOptModal && (
        <OptimizationModal
          optWeeks={optWeeks}
          setOptWeeks={setOptWeeks}
          optMaxPerDay={optMaxPerDay}
          setOptMaxPerDay={setOptMaxPerDay}
          greenMode={greenMode}
          onClose={() => setShowOptModal(false)}
          onRun={handleRunOptimization}
        />
      )}
    </div>
  );
}

export default App;
