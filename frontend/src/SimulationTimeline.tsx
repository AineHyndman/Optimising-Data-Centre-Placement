import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { WeeklySummaryData, GridPosition, ChangedPosition, RackSpec } from './types';
import { DataCentreGrid } from './DataCentreGrid';
import { simPositionsToGrid } from './utils';

interface SimulationTimelineProps {
  weeks: WeeklySummaryData[];
  initialPositions: GridPosition[];
  rackTypes: RackSpec[];
  onBack: () => void;
}

function computeStdDev(positions: GridPosition[], rackPowerMap: Map<string, number>): number {
  const powers = positions.map(p => (p.rack_type ? rackPowerMap.get(p.rack_type) : undefined) ?? 0).filter(p => p > 0);
  if (powers.length === 0) return 0;
  const mean = powers.reduce((a, b) => a + b, 0) / powers.length;
  const variance = powers.reduce((acc, p) => acc + (p - mean) ** 2, 0) / powers.length;
  return Math.sqrt(variance);
}

export const SimulationTimeline: React.FC<SimulationTimelineProps> = ({
  weeks,
  initialPositions,
  rackTypes,
  onBack,
}) => {
  const [selectedWeek, setSelectedWeek] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalWeeks = weeks.length;

  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setSelectedWeek(prev => {
          if (prev >= totalWeeks) { setIsPlaying(false); return prev; }
          return prev + 1;
        });
      }, 1200);
    } else {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    }
    return () => { if (playIntervalRef.current) clearInterval(playIntervalRef.current); };
  }, [isPlaying, totalWeeks]);

  const rackPowerMap = useMemo(() => new Map(rackTypes.map(r => [r.name, r.power_need])), [rackTypes]);

  const currentWeekData = selectedWeek > 0 ? weeks[selectedWeek - 1] : null;
  const currentPositions: GridPosition[] = selectedWeek === 0 ? initialPositions : weeks[selectedWeek - 1].grid_positions;
  const currentGrid = simPositionsToGrid(currentPositions);

  const changedPositions: ChangedPosition[] = selectedWeek > 0 ? weeks[selectedWeek - 1].changed_positions : [];

  // Offset by -1 to match the 1-indexed positions from the backend into 0-indexed grid keys
  const highlightedCells = new Set(
    changedPositions.map(p => `${p.row - 1},${p.position - 1}`)
  );

  const totalRacksReplaced = useMemo(() => weeks.reduce((acc, w) => acc + w.racks_replaced, 0), [weeks]);
  const movesUpToNow = useMemo(() => weeks.slice(0, selectedWeek).reduce((acc, w) => acc + w.racks_replaced, 0), [weeks, selectedWeek]);
  const completionPct = totalWeeks > 0 ? Math.round((selectedWeek / totalWeeks) * 100) : 0;

  const initialStd = useMemo(() => computeStdDev(initialPositions, rackPowerMap), [initialPositions, rackPowerMap]);
  const currentStd = useMemo(() => computeStdDev(currentPositions, rackPowerMap), [currentPositions, rackPowerMap]);
  const variancePctReduction = initialStd > 0 ? ((initialStd - currentStd) / initialStd) * 100 : 0;

  const dailyDist = useMemo(() => {
    if (!currentWeekData) return Array(7).fill(0);
    const moves = currentWeekData.racks_replaced;
    const days = Array(7).fill(0);
    for (let i = 0; i < moves; i++) days[i % 5]++;
    return days;
  }, [currentWeekData]);
  const maxPerDay = Math.max(...dailyDist, 1);

  const sliderPct = totalWeeks > 0 ? (selectedWeek / totalWeeks) * 100 : 0;

  return (
    <div className="flex gap-6 items-start">

      {/* Left: Grid — no card, sits on page background */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <span className="text-[17px] font-bold text-white">Suite Layout</span>
            <span className="bg-[#4A90E2] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">
              Week {selectedWeek}
            </span>
            <span className="text-[11px] text-[#888] border border-[#444] px-2.5 py-0.5 rounded-full">Read-only</span>
            {movesUpToNow > 0 && (
              <span className="text-[13px] font-semibold text-[#4CAF50]">{movesUpToNow} changes</span>
            )}
          </div>
          <span className="text-[12px] text-[#555]">48 rows x 16 positions</span>
        </div>

        <DataCentreGrid
          grid={currentGrid}
          title=""
          viewMode="type"
          rackTypes={rackTypes}
          highlightedCells={highlightedCells.size > 0 ? highlightedCells : undefined}
        />
      </div>

      {/* Right: Sidebar */}
      <div className="w-90 shrink-0 flex flex-col gap-4">

        {/* TIMELINE */}
        <div className="bg-[#1a1d24] p-5 rounded-xl border border-[#2a2d35]">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[11px] text-[#4A90E2] uppercase font-bold tracking-widest">Timeline</span>
            <span className="text-sm font-bold text-white">
              Week <span className="text-[#4A90E2]">{selectedWeek}</span> of {totalWeeks}
            </span>
          </div>

          <input
            type="range"
            min={0}
            max={totalWeeks}
            value={selectedWeek}
            onChange={e => { setIsPlaying(false); setSelectedWeek(Number(e.target.value)); }}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer mb-2"
            style={{
              background: `linear-gradient(to right, #4A90E2 0%, #4A90E2 ${sliderPct}%, #2a2d35 ${sliderPct}%, #2a2d35 100%)`,
            }}
          />
          <div className="flex justify-between mb-5 px-0.5">
            {Array.from({ length: totalWeeks + 1 }).map((_, i) => (
              <span key={i} className="text-[10px] text-[#555]">{i}</span>
            ))}
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => { setIsPlaying(false); setSelectedWeek(0); }}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#333] text-[#888] hover:text-white hover:border-[#555] transition-colors text-base"
            >
              R
            </button>
            <button
              onClick={() => { setIsPlaying(false); setSelectedWeek(w => Math.max(0, w - 1)); }}
              disabled={selectedWeek === 0}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#333] text-white disabled:text-[#333] disabled:border-[#222] hover:bg-[#2a2d35] transition-colors text-lg"
            >
              &lt;
            </button>
            <button
              onClick={() => {
                if (selectedWeek >= totalWeeks) setSelectedWeek(0);
                setIsPlaying(p => !p);
              }}
              className={`w-12 h-12 flex items-center justify-center rounded-xl transition-colors font-bold text-xl text-white
                ${isPlaying ? 'bg-[#2a4a7a] hover:bg-[#1e3a6a]' : 'bg-[#4A90E2] hover:bg-[#3a80d2]'}`}
            >
              {isPlaying ? '||' : '>'}
            </button>
            <button
              onClick={() => { setIsPlaying(false); setSelectedWeek(w => Math.min(totalWeeks, w + 1)); }}
              disabled={selectedWeek === totalWeeks}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#333] text-white disabled:text-[#333] disabled:border-[#222] hover:bg-[#2a2d35] transition-colors text-lg"
            >
              &gt;
            </button>
          </div>
        </div>

        {/* PLAN QUALITY */}
        <div className="bg-[#1a1d24] p-5 rounded-xl border border-[#2a2d35]">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[11px] text-[#aaa] uppercase font-bold tracking-widest">Plan Quality</span>
          </div>

          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[12px] text-[#888]">Completion</span>
            <span className="text-[12px] font-bold text-white">{completionPct}%</span>
          </div>
          <div className="h-1 bg-[#2a2d35] rounded-full mb-5">
            <div
              className="h-full bg-[#4A90E2] rounded-full transition-all duration-500"
              style={{ width: `${completionPct}%` }}
            />
          </div>

          <div className="flex gap-8 mb-5">
            <div>
              <div className="text-[10px] text-[#666] uppercase font-bold tracking-wider mb-1">
                Duration
              </div>
              <div className="text-2xl font-bold text-white leading-none">
                {totalWeeks} <span className="text-sm text-[#555] font-normal">weeks</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[#666] uppercase font-bold tracking-wider mb-1">
                Total Moves
              </div>
              <div className="text-2xl font-bold text-white leading-none">
                {movesUpToNow} <span className="text-sm text-[#555] font-normal">/ {totalRacksReplaced}</span>
              </div>
            </div>
          </div>

          <div>
            <div className="text-[10px] text-[#666] uppercase font-bold tracking-wider mb-1.5">
              Power Variance
            </div>
            <div className="text-[32px] font-bold text-white leading-none">
              {Math.abs(variancePctReduction).toFixed(1)}%
            </div>
            <div className="text-[12px] text-[#555] mt-1">
              {initialStd.toFixed(1)} {'->'} {currentStd.toFixed(1)} kW std
            </div>
          </div>
        </div>

        {/* MOVES THIS WEEK */}
        {selectedWeek > 0 && currentWeekData ? (
          <div className="bg-[#1a1d24] p-5 rounded-xl border border-[#2a2d35]">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[11px] text-[#aaa] uppercase font-bold tracking-widest">Moves This Week</span>
              <span className="text-[11px] text-[#4A90E2] border border-[#4A90E2]/40 bg-[#4A90E2]/10 px-2.5 py-0.5 rounded-full font-bold">
                {currentWeekData.racks_replaced} moves
              </span>
            </div>

            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] text-[#666]">Daily distribution</span>
                <span className="text-[11px] text-[#444]">max {maxPerDay}/day</span>
              </div>
              <div className="flex gap-1 items-end h-8 mb-1">
                {dailyDist.map((count, i) => (
                  <div key={i} className="flex-1 flex items-end h-full">
                    <div
                      className={`w-full rounded-sm transition-all ${count > 0 ? 'bg-[#4A90E2]' : 'bg-[#2a2d35]'}`}
                      style={{ height: `${count > 0 ? Math.max((count / maxPerDay) * 100, 25) : 15}%`, opacity: count > 0 ? 1 : 0.3 }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-1">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                  <div key={i} className="flex-1 text-center text-[10px] text-[#555]">{d}</div>
                ))}
              </div>
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto">
              {changedPositions.map((p, i) => (
                <div key={i} className="flex items-start gap-2 text-[12px] text-[#888]">
                  <span className="text-[#4A90E2] shrink-0 mt-px">--&gt;</span>
                  <span>
                    Replaced{' '}
                    <span className="text-[#ccc] font-mono">{p.old_rack}</span>
                    {' -> '}
                    <span className="text-[#ccc] font-mono">{p.new_rack}</span>
                    {' at '}
                    <span className="text-[#666] font-mono">R{String(p.row).padStart(2, '0')}P{p.position}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-[#1a1d24] p-5 rounded-xl border border-[#2a2d35]">
            <div className="text-[11px] text-[#aaa] uppercase font-bold tracking-widest mb-3">Moves This Week</div>
            <p className="text-xs text-[#555]">Press play or drag the slider to begin.</p>
          </div>
        )}

        <button
          onClick={onBack}
          className="text-[12px] text-[#666] hover:text-white text-center py-2 transition-colors"
        >
          Back to Edit Mode
        </button>
      </div>
    </div>
  );
};
