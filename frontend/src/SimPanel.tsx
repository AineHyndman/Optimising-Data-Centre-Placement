import type { WeeklySummaryData, ChangedPosition } from './types';
import {
  IcoReset, IcoChevronLeft, IcoChevronRight, IcoPlay, IcoPause,
  IcoStar, IcoActivity, IcoArrowRight,
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
  weeklyStd: number[];
  weeklyPower: number[];
  weeklyReplacements: number[];
  onOpenSettings: () => void;
}

export const SimPanel: React.FC<SimPanelProps> = ({
  simWeek, setSimWeek, isPlaying, setIsPlaying,
  totalWeeks, sliderPct, movesUpToNow, totalRacksReplaced,
  completionPct, variancePct, initialStd, currentStd,
  currentWeekData, changedPositions, dailyDist, maxPerDay,
  weeklyStd, weeklyPower, weeklyReplacements, onOpenSettings,
}) => {
  // Pre-compute chart geometry
  const W = 252, H = 40;
  const minV = Math.min(...weeklyStd);
  const maxV = Math.max(...weeklyStd);
  const range = maxV - minV || 1;
  const n = weeklyStd.length;
  const pts = weeklyStd.map((v, i) => ({
    x: n > 1 ? 4 + (i / (n - 1)) * W : 4 + W / 2,
    y: 4 + H - ((v - minV) / range) * H,
  }));
  // Revealed = weeks we've passed; future = what's ahead (starts at simWeek for continuity)
  const revealedPts = pts.slice(0, simWeek + 1);
  const futurePts   = pts.slice(simWeek);
  const revealedPolyline = revealedPts.map(p => `${p.x},${p.y}`).join(' ');
  const futurePolyline   = futurePts.length > 1 ? futurePts.map(p => `${p.x},${p.y}`).join(' ') : '';
  const revealedArea = revealedPts.length > 1
    ? `M ${revealedPts[0].x} ${revealedPts[0].y} ${revealedPts.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')} L ${revealedPts[revealedPts.length - 1].x} ${4 + H} L ${revealedPts[0].x} ${4 + H} Z`
    : '';
  const curX = pts[simWeek]?.x ?? 4;

  // Power trend chart geometry (same pattern)
  const nP = weeklyPower.length;
  const minP = Math.min(...weeklyPower);
  const maxP = Math.max(...weeklyPower);
  const rangeP = maxP - minP || 1;
  const ptsP = weeklyPower.map((v, i) => ({
    x: nP > 1 ? 4 + (i / (nP - 1)) * W : 4 + W / 2,
    y: 4 + H - ((v - minP) / rangeP) * H,
  }));
  const revPtsP = ptsP.slice(0, simWeek + 1);
  const futPtsP = ptsP.slice(simWeek);
  const revPolyP = revPtsP.map(p => `${p.x},${p.y}`).join(' ');
  const futPolyP = futPtsP.length > 1 ? futPtsP.map(p => `${p.x},${p.y}`).join(' ') : '';
  const revAreaP = revPtsP.length > 1
    ? `M ${revPtsP[0].x} ${revPtsP[0].y} ${revPtsP.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')} L ${revPtsP[revPtsP.length - 1].x} ${4 + H} L ${revPtsP[0].x} ${4 + H} Z`
    : '';
  const curPower = weeklyPower[simWeek] ?? 0;
  const initPower = weeklyPower[0] ?? 0;
  const powerDeltaPct = initPower > 0 ? ((curPower - initPower) / initPower) * 100 : 0;

  // Migration pace bar chart
  const maxRep = Math.max(...weeklyReplacements, 1);

  return (
  <>

    {/* Timeline card */}
    <div className="rounded-xl border border-[#1e2028] p-5" style={{ backgroundColor: 'hsl(222 18% 11%)' }}>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold tracking-widest uppercase" style={{ color: 'hsl(210 100% 56%)' }}>Timeline</span>
        </div>
        <button
            onClick={onOpenSettings}
            title="Change simulation settings"
            className="w-6 h-6 flex items-center justify-center rounded text-[#555] hover:text-white hover:bg-[#2a2d35] transition-colors cursor-pointer"
          >
            <IcoTool />
          </button>
      </div>

      <div>
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
      <div className="relative h-4 mb-5">
        {(() => {
          const step = totalWeeks <= 12 ? 1 : totalWeeks <= 26 ? 5 : 10;
          const ticks = Array.from({ length: totalWeeks + 1 }, (_, i) => i)
            .filter(i => i === 0 || i === totalWeeks || i % step === 0);
          return ticks.map(i => (
            <span
              key={i}
              className="absolute text-[10px] text-[#555] font-mono -translate-x-1/2"
              style={{ left: `${(i / totalWeeks) * 100}%` }}
            >
              {i}
            </span>
          ));
        })()}
      </div>

      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => { setIsPlaying(false); setSimWeek(0); }}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#2a2d35] text-[#666] hover:text-white hover:border-[#444] transition-colors cursor-pointer"
        >
          <IcoReset />
        </button>
        <button
          onClick={() => { setIsPlaying(false); setSimWeek(w => Math.max(0, w - 1)); }}
          disabled={simWeek === 0}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#2a2d35] text-white disabled:text-[#2a2d35] disabled:border-[#1e2028] hover:bg-[#2a2d35] transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          <IcoChevronLeft />
        </button>
        <button
          onClick={() => { if (simWeek >= totalWeeks) setSimWeek(0); setIsPlaying(p => !p); }}
          className="w-12 h-12 flex items-center justify-center rounded-xl transition-colors text-white cursor-pointer"
          style={{ backgroundColor: isPlaying ? 'hsl(210 60% 28%)' : 'hsl(210 100% 56%)' }}
        >
          {isPlaying ? <IcoPause /> : <IcoPlay />}
        </button>
        <button
          onClick={() => { setIsPlaying(false); setSimWeek(w => Math.min(totalWeeks, w + 1)); }}
          disabled={simWeek === totalWeeks}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#2a2d35] text-white disabled:text-[#2a2d35] disabled:border-[#1e2028] hover:bg-[#2a2d35] transition-colors cursor-pointer disabled:cursor-not-allowed"
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

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-[10px] text-[#444] uppercase font-bold tracking-wider">
          <IcoTrendDown /> Power Variance
        </div>
        {initialStd > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[20px] font-bold leading-none"
              style={{ color: variancePct > 0 ? 'hsl(160 84% 45%)' : variancePct < 0 ? 'hsl(0 72% 55%)' : 'white' }}>
              {variancePct > 0 ? '−' : variancePct < 0 ? '+' : ''}{Math.abs(variancePct).toFixed(1)}%
            </span>
            {variancePct > 5 && <IcoCheck />}
          </div>
        )}
      </div>
      {initialStd > 0 ? (
        <>
          <div className="text-[11px] text-[#444] font-mono mb-3">
            {initialStd.toFixed(1)} → {currentStd.toFixed(1)} kW std
          </div>
          {weeklyStd.length > 1 && (
            <svg viewBox="0 0 260 60" className="w-full" style={{ overflow: 'visible' }}>
              {/* Future area (faint preview) */}
              {futurePolyline && <polyline points={futurePolyline} fill="none" stroke="hsl(160 84% 45%)" strokeWidth="1" strokeDasharray="3 3" opacity="0.2" />}
              {/* Revealed area fill */}
              <path d={revealedArea} fill="hsl(160 84% 45% / 0.12)" />
              {/* Revealed line */}
              {revealedPts.length > 1 && <polyline points={revealedPolyline} fill="none" stroke="hsl(160 84% 45%)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />}
              {/* Current week vertical */}
              <line x1={curX} y1={4} x2={curX} y2={44} stroke="hsl(210 100% 56%)" strokeWidth="1" strokeDasharray="3 2" opacity="0.7" />
              {/* Dots */}
              {pts.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y}
                  r={i === simWeek ? 3.5 : 1.5}
                  fill={i === simWeek ? 'hsl(210 100% 56%)' : 'hsl(160 84% 45%)'}
                  stroke={i === simWeek ? 'hsl(222 18% 11%)' : 'none'}
                  strokeWidth={i === simWeek ? 1.5 : 0}
                  opacity={i <= simWeek ? 1 : 0.2}
                />
              ))}
              {/* X-axis labels */}
              {pts.map((p, i) => {
                const step = Math.ceil(n / 6);
                if (i % step !== 0 && i !== n - 1) return null;
                return <text key={i} x={p.x} y={58} textAnchor="middle" fontSize="8" fill="#444">{i}</text>;
              })}
            </svg>
          )}
        </>
      ) : (
        <div className="text-[13px] text-[#444]">
          All rack types have equal power — variance is uniform.
        </div>
      )}
    </div>

    {/* Total Power Trend */}
    {weeklyPower.length > 1 && (
      <div className="rounded-xl border border-[#1e2028] p-5" style={{ backgroundColor: 'hsl(222 18% 11%)' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-[10px] text-[#444] uppercase font-bold tracking-wider">
            <IcoTrendDown /> Total Power
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[20px] font-bold leading-none"
              style={{ color: powerDeltaPct < 0 ? 'hsl(160 84% 45%)' : powerDeltaPct > 0 ? 'hsl(0 72% 55%)' : 'white' }}>
              {powerDeltaPct > 0 ? '+' : ''}{powerDeltaPct.toFixed(1)}%
            </span>
          </div>
        </div>
        <div className="text-[11px] text-[#444] font-mono mb-3">
          {Math.round(initPower).toLocaleString()} → {Math.round(curPower).toLocaleString()} kW
        </div>
        <svg viewBox="0 0 260 60" className="w-full" style={{ overflow: 'visible' }}>
          {futPolyP && <polyline points={futPolyP} fill="none" stroke="hsl(38 95% 55%)" strokeWidth="1" strokeDasharray="3 3" opacity="0.2" />}
          <path d={revAreaP} fill="hsl(38 95% 55% / 0.1)" />
          {revPtsP.length > 1 && <polyline points={revPolyP} fill="none" stroke="hsl(38 95% 55%)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />}
          <line x1={ptsP[simWeek]?.x ?? 4} y1={4} x2={ptsP[simWeek]?.x ?? 4} y2={44} stroke="hsl(210 100% 56%)" strokeWidth="1" strokeDasharray="3 2" opacity="0.7" />
          {ptsP.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y}
              r={i === simWeek ? 3.5 : 1.5}
              fill={i === simWeek ? 'hsl(210 100% 56%)' : 'hsl(38 95% 55%)'}
              stroke={i === simWeek ? 'hsl(222 18% 11%)' : 'none'}
              strokeWidth={i === simWeek ? 1.5 : 0}
              opacity={i <= simWeek ? 1 : 0.2}
            />
          ))}
          {ptsP.map((p, i) => {
            const step = Math.ceil(nP / 6);
            if (i % step !== 0 && i !== nP - 1) return null;
            return <text key={i} x={p.x} y={58} textAnchor="middle" fontSize="8" fill="#444">{i}</text>;
          })}
        </svg>
      </div>
    )}

    {/* Migration Pace */}
    {weeklyReplacements.length > 0 && (
      <div className="rounded-xl border border-[#1e2028] p-5" style={{ backgroundColor: 'hsl(222 18% 11%)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-[10px] text-[#444] uppercase font-bold tracking-wider">
            <IcoTool /> Migration Pace
          </div>
          <span className="text-[11px] text-[#555] font-mono">{weeklyReplacements.reduce((a, b) => a + b, 0)} total</span>
        </div>
        <div className="flex gap-0.5 items-end h-12">
          {weeklyReplacements.map((count, i) => {
            const isCurrent = i === simWeek - 1;
            const isFuture  = i >= simWeek;
            return (
              <div key={i} className="flex-1 flex items-end h-full">
                <div className="w-full rounded-sm transition-all duration-300"
                  style={{
                    height: `${count > 0 ? Math.max((count / maxRep) * 100, 8) : 4}%`,
                    backgroundColor: isCurrent
                      ? 'hsl(210 100% 56%)'
                      : isFuture
                      ? 'hsl(222 15% 20%)'
                      : 'hsl(160 84% 45%)',
                    opacity: isFuture ? 0.4 : 1,
                  }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-1.5 text-[9px] text-[#444] font-mono">
          <span>W1</span>
          <span>W{weeklyReplacements.length}</span>
        </div>
      </div>
    )}

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
  </>
  );
};
