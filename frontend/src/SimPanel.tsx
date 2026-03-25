import type { WeeklySummaryData, ChangedPosition } from './types';
import {
  IcoReset, IcoChevronLeft, IcoChevronRight, IcoPlay, IcoPause,
  IcoStar, IcoActivity, IcoArrowRight, IcoDownload,
  IcoCalendar, IcoTool, IcoTrendDown, IcoCheck,
} from './icons';

interface SimPanelProps {
  simWeek: number;
  setSimWeek: (w: number | ((prev: number) => number)) => void;
  isPlaying: boolean;
  setIsPlaying: (p: boolean | ((prev: boolean) => boolean)) => void;
  totalWeeks: number;
  sliderPct: number;
  movesUpToNow: number;
  totalRacksReplaced: number;
  completionPct: number;
  variancePct: number;
  initialStd: number;
  currentStd: number;
  currentWeekData: WeeklySummaryData | null;
  changedPositions: ChangedPosition[];
  dailyDist: number[];
  maxPerDay: number;
  onDownload: () => void;
  onExitSim: () => void;
}

export const SimPanel: React.FC<SimPanelProps> = ({
  simWeek, setSimWeek, isPlaying, setIsPlaying,
  totalWeeks, sliderPct, movesUpToNow, totalRacksReplaced,
  completionPct, variancePct, initialStd, currentStd,
  currentWeekData, changedPositions, dailyDist, maxPerDay,
  onDownload, onExitSim,
}) => (
  <>
    {/* Download button */}
    <button
      onClick={onDownload}
      className="py-2.5 px-4 rounded-md text-[13px] font-semibold border border-[#22C55E]/50 text-[#22C55E] hover:bg-[#22C55E]/10 transition-colors flex items-center justify-center gap-2"
    >
      <IcoDownload /> Download Optimized JSON
    </button>

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
        <button
          onClick={() => { setIsPlaying(false); setSimWeek(0); }}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#2a2d35] text-[#666] hover:text-white hover:border-[#444] transition-colors"
        >
          <IcoReset />
        </button>
        <button
          onClick={() => { setIsPlaying(false); setSimWeek(w => Math.max(0, w - 1)); }}
          disabled={simWeek === 0}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#2a2d35] text-white disabled:text-[#2a2d35] disabled:border-[#1e2028] hover:bg-[#2a2d35] transition-colors"
        >
          <IcoChevronLeft />
        </button>
        <button
          onClick={() => { if (simWeek >= totalWeeks) setSimWeek(0); setIsPlaying(p => !p); }}
          className="w-12 h-12 flex items-center justify-center rounded-xl transition-colors text-white"
          style={{ backgroundColor: isPlaying ? 'hsl(210 60% 28%)' : 'hsl(210 100% 56%)' }}
        >
          {isPlaying ? <IcoPause /> : <IcoPlay />}
        </button>
        <button
          onClick={() => { setIsPlaying(false); setSimWeek(w => Math.min(totalWeeks, w + 1)); }}
          disabled={simWeek === totalWeeks}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#2a2d35] text-white disabled:text-[#2a2d35] disabled:border-[#1e2028] hover:bg-[#2a2d35] transition-colors"
        >
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

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] text-[#444] uppercase font-bold tracking-wider mb-2">
            <IcoCalendar /> Duration
          </div>
          <div className="text-[20px] font-bold text-white leading-none">
            {totalWeeks} <span className="text-[11px] text-[#444] font-normal">weeks</span>
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-[10px] text-[#444] uppercase font-bold tracking-wider mb-2">
            <IcoTool /> Total Moves
          </div>
          <div className="text-[20px] font-bold text-white leading-none">
            {movesUpToNow} <span className="text-[11px] text-[#444] font-normal">/ {totalRacksReplaced}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-[#444] uppercase font-bold tracking-wider mb-2">
        <IcoTrendDown /> Power Variance
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
              <IcoCheck /> Row power distribution optimized
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
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
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
                  <span className="ml-2 text-[#444] font-mono">R{String(p.row).padStart(2, '0')}P{p.position}</span>
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="text-[12px] text-[#444]">Press play or drag the slider to begin.</p>
      )}
    </div>

    <button
      onClick={onExitSim}
      className="text-[12px] text-[#444] hover:text-white text-center py-2 transition-colors"
    >
      ← Back to Edit Mode
    </button>
  </>
);
