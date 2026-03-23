import React, { useState, useEffect, useRef } from 'react';
import type { WeeklySummaryData, GridPosition, ChangedPosition, RackSpec } from './types';
import { DataCentreGrid } from './DataCentreGrid';
import { simPositionsToGrid } from './utils';

interface SimulationTimelineProps {
  weeks: WeeklySummaryData[];
  initialPositions: GridPosition[];
  rackTypes: RackSpec[];
  onBack: () => void;
}

export const SimulationTimeline: React.FC<SimulationTimelineProps> = ({
  weeks,
  initialPositions,
  rackTypes,
  onBack,
}) => {
  // 0 = initial state, 1..n = week index
  const [selectedWeek, setSelectedWeek] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalWeeks = weeks.length;

  // Auto-advance when playing
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setSelectedWeek(prev => {
          if (prev >= totalWeeks) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1200);
    } else {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, totalWeeks]);

  const currentWeekData = selectedWeek > 0 ? weeks[selectedWeek - 1] : null;

  const currentPositions: GridPosition[] =
    selectedWeek === 0 ? initialPositions : weeks[selectedWeek - 1].grid_positions;

  const currentGrid = simPositionsToGrid(currentPositions);

  const changedPositions: ChangedPosition[] =
    selectedWeek > 0 ? weeks[selectedWeek - 1].changed_positions : [];

  const highlightedCells = new Set(
    changedPositions.map(p => `${p.row},${p.position}`)
  );

  const totalPowerSaved = weeks.reduce((acc, w) => acc + w.power_saved, 0);
  const totalRacksReplaced = weeks.reduce((acc, w) => acc + w.racks_replaced, 0);

  return (
    <div className="flex flex-col gap-4 w-full">

      {/* Header */}
      <div className="flex justify-between items-center bg-[#1a1d24] p-5 rounded-lg border border-[#2a2d35]">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Simulation Timeline</h2>
          <p className="text-sm text-[#888]">Step through the optimization week by week</p>
        </div>
        <div className="flex gap-6 items-center text-right">
          <div>
            <div className="text-[11px] text-[#888] uppercase font-bold mb-1">Total Power Saved</div>
            <div className="text-xl font-bold text-[#4CAF50]">{totalPowerSaved.toLocaleString()} kW</div>
          </div>
          <div>
            <div className="text-[11px] text-[#888] uppercase font-bold mb-1">Total Racks Swapped</div>
            <div className="text-xl font-bold text-[#4A90E2]">{totalRacksReplaced}</div>
          </div>
          <button
            onClick={onBack}
            className="ml-4 py-2 px-4 border border-[#333] hover:bg-[#333] text-white rounded-md text-sm transition-colors"
          >
            ← Back to Layout
          </button>
        </div>
      </div>

      <div className="flex gap-4 items-start">

        {/* Grid panel */}
        <div className="flex-1 min-w-0 bg-[#1a1d24] p-5 rounded-lg border border-[#2a2d35]">

          {/* Playback controls */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setIsPlaying(false); setSelectedWeek(w => Math.max(0, w - 1)); }}
                disabled={selectedWeek === 0}
                className="w-8 h-8 flex items-center justify-center rounded border border-[#333] text-white disabled:text-[#444] disabled:border-[#222] hover:bg-[#333] transition-colors"
              >
                ◀
              </button>

              <button
                onClick={() => {
                  if (selectedWeek >= totalWeeks) {
                    setSelectedWeek(0);
                  }
                  setIsPlaying(p => !p);
                }}
                className={`w-8 h-8 flex items-center justify-center rounded border transition-colors
                  ${isPlaying ? 'border-[#F44336] text-[#F44336] hover:bg-[#F44336]/10' : 'border-[#4CAF50] text-[#4CAF50] hover:bg-[#4CAF50]/10'}`}
              >
                {isPlaying ? '■' : '▶'}
              </button>

              <button
                onClick={() => { setIsPlaying(false); setSelectedWeek(w => Math.min(totalWeeks, w + 1)); }}
                disabled={selectedWeek === totalWeeks}
                className="w-8 h-8 flex items-center justify-center rounded border border-[#333] text-white disabled:text-[#444] disabled:border-[#222] hover:bg-[#333] transition-colors"
              >
                ▶
              </button>

              <span className="text-sm font-bold text-white ml-1">
                {selectedWeek === 0 ? 'Initial State' : `Week ${selectedWeek} / ${totalWeeks}`}
              </span>
            </div>

            {/* Week pill scrubber */}
            <div className="flex gap-1.5">
              <button
                onClick={() => { setIsPlaying(false); setSelectedWeek(0); }}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors font-bold
                  ${selectedWeek === 0 ? 'bg-[#4A90E2] border-[#4A90E2] text-white' : 'border-[#333] text-[#666] hover:border-[#555]'}`}
              >
                Init
              </button>
              {weeks.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setIsPlaying(false); setSelectedWeek(i + 1); }}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors font-bold
                    ${selectedWeek === i + 1 ? 'bg-[#4A90E2] border-[#4A90E2] text-white' : 'border-[#333] text-[#666] hover:border-[#555]'}`}
                >
                  W{i + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Highlight badge */}
          {highlightedCells.size > 0 && (
            <div className="mb-3 inline-flex items-center gap-1.5 text-xs text-amber-400 border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 rounded">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              {highlightedCells.size} racks swapped this week
            </div>
          )}

          <DataCentreGrid
            grid={currentGrid}
            title=""
            viewMode="type"
            rackTypes={rackTypes}
            highlightedCells={highlightedCells.size > 0 ? highlightedCells : undefined}
          />
        </div>

        {/* Stats panel */}
        <div className="w-56 flex flex-col gap-3">
          {selectedWeek === 0 ? (
            <div className="bg-[#1a1d24] p-4 rounded-lg border border-[#2a2d35]">
              <div className="text-[11px] text-[#888] uppercase font-bold mb-3">Initial State</div>
              <p className="text-sm text-[#aaa]">No optimization applied yet. Press ▶ or step forward to see changes.</p>
            </div>
          ) : currentWeekData ? (
            <>
              <div className="bg-[#1a1d24] p-4 rounded-lg border border-[#2a2d35]">
                <div className="text-[11px] text-[#888] uppercase font-bold mb-3">Week {selectedWeek}</div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#888]">Racks swapped</span>
                    <span className="text-sm font-bold text-[#4A90E2]">{currentWeekData.racks_replaced}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#888]">Power saved</span>
                    <span className="text-sm font-bold text-[#4CAF50]">-{currentWeekData.power_saved} kW</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#888]">Total power</span>
                    <span className="text-sm font-mono text-white">{currentWeekData.total_power_usage.toLocaleString()} kW</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#1a1d24] p-4 rounded-lg border border-[#2a2d35]">
                <div className="text-[11px] text-[#888] uppercase font-bold mb-3">RSU Capacity</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#4A90E2] font-bold">Compute</span>
                    <span className="text-sm font-mono text-white">{currentWeekData.rsu_totals?.compute || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#50E3C2] font-bold">Storage</span>
                    <span className="text-sm font-mono text-white">{currentWeekData.rsu_totals?.storage || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#BD10E0] font-bold">AI</span>
                    <span className="text-sm font-mono text-white">{currentWeekData.rsu_totals?.ai || 0}</span>
                  </div>
                </div>
              </div>
            </>
          ) : null}

          {/* Legend */}
          <div className="bg-[#1a1d24] p-4 rounded-lg border border-[#2a2d35]">
            <div className="text-[11px] text-[#888] uppercase font-bold mb-3">Legend</div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-[#4A90E2]" />
                <span className="text-xs text-[#aaa]">Compute</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-[#50E3C2]" />
                <span className="text-xs text-[#aaa]">Storage</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-[#BD10E0]" />
                <span className="text-xs text-[#aaa]">AI</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm ring-2 ring-amber-400 bg-[#4A90E2]" />
                <span className="text-xs text-amber-400">Swapped this week</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
