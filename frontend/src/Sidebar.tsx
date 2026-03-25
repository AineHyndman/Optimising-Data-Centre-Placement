import React, { useMemo } from 'react';
import type { SuitePlan, Constraints, RackSpec } from './types';
import { computeViolations } from './utils';
import {
  IconCheckCircle, IconAlert, IconZap,
  IconCpu, IconHardDrive, IconBrain, IconBox,
} from './icons';

interface SidebarProps {
  suite: SuitePlan;
  constraints: Constraints;
  viewMode?: 'type' | 'power';
  rackTypes: RackSpec[];
  className?: string;
}

// ── Type config ──────────────────────────────────────────────────────────────
// Match the CSS @theme tokens: primary=blue, accent=green, warning=amber
const TYPE_CONFIG = {
  compute: { label: 'Compute', color: 'hsl(210 100% 56%)', barFrom: '#1a5fc8', barTo: '#5cb3ff', Icon: IconCpu },
  storage: { label: 'Storage', color: 'hsl(160 84% 45%)',  barFrom: '#0d7a45', barTo: '#2ecc87', Icon: IconHardDrive },
  ai:      { label: 'AI',      color: 'hsl(38 95% 55%)',   barFrom: '#b36a00', barTo: '#f5c04a', Icon: IconBrain },
};

const CapacityCard = ({
  type, value, range, maxScale,
}: {
  type: keyof typeof TYPE_CONFIG;
  value: number;
  range: { min: number; max: number };
  maxScale: number;
}) => {
  const { label, color, barFrom, barTo, Icon } = TYPE_CONFIG[type];
  const isViolated = value < range.min || value > range.max;
  const barPct = Math.min((value / maxScale) * 100, 100);
  const minPct = (range.min / maxScale) * 100;
  const maxPct = (range.max / maxScale) * 100;

  return (
    <div className="mb-3 p-4 bg-[#15171c] rounded-xl border border-[#1e2028]">
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold text-[12px] flex items-center gap-2" style={{ color: isViolated ? 'hsl(0 72% 55%)' : color }}>
          <Icon size={15} />
          {label}
        </span>
        <span className={`text-[10px] py-0.5 px-2.5 rounded-full font-bold border ${
          isViolated
            ? 'text-red-400 border-red-500/50 bg-red-500/10'
            : 'text-green-400 border-green-600/50 bg-green-500/10'
        }`}>
          {isViolated ? 'VIOLATION' : 'OK'}
        </span>
      </div>
      <div className="text-[20px] font-bold text-white leading-none mb-3">
        {value.toFixed(1)}{' '}
        <span className="text-[11px] text-[#555] font-normal">/ {range.min}–{range.max} RSU</span>
      </div>
      <div className="h-2 bg-[#1e2028] rounded-full relative overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${barPct}%`, background: `linear-gradient(to right, ${barFrom}, ${barTo})` }}
        />
        <div className="absolute inset-y-0 w-px bg-white/25" style={{ left: `${minPct}%` }} />
        <div className="absolute inset-y-0 w-px bg-white/25" style={{ left: `${maxPct}%` }} />
      </div>
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ suite, constraints, viewMode = 'type', rackTypes = [], className }) => {
  const stats = useMemo(() => {
    const counts = { compute: 0, storage: 0, ai: 0 };
    suite.positions.forEach(pos => {
      if (!pos.rack_type) return;
      if (pos.rack_type.startsWith('C')) counts.compute++;
      if (pos.rack_type.startsWith('S')) counts.storage++;
      if (pos.rack_type.startsWith('A')) counts.ai++;
    });
    return counts;
  }, [suite]);

  const violations = useMemo(() => computeViolations(suite, constraints, rackTypes), [suite, constraints, rackTypes]);
  const isValid = violations.length === 0;
  const totalPower = typeof suite.total_power_usage === 'number' ? suite.total_power_usage : 0;

  // Power by row
  const powerByRow = useMemo(() => {
    const rackPowerMap = new Map(rackTypes.map(r => [r.name, r.power_need]));
    const rowMap = new Map<number, number>();
    suite.positions.forEach(pos => {
      if (!pos.rack_type) return;
      const row = parseInt(String(pos.row), 10);
      const power = rackPowerMap.get(pos.rack_type) ?? 0;
      rowMap.set(row, (rowMap.get(row) ?? 0) + power);
    });
    return Array.from(rowMap.entries())
      .filter(([, p]) => p > 0)
      .sort(([a], [b]) => a - b);
  }, [suite, rackTypes]);

  const maxRowPower = Math.max(...powerByRow.map(([, p]) => p), 1);

  return (
    <div className={className ?? "w-96 shrink-0 flex flex-col gap-3"}>

      {/* Status */}
      <div className={`border py-4 px-5 rounded-xl ${
        isValid ? 'border-green-700/50 bg-green-950/40' : 'border-red-500/50 bg-red-950/30'
      }`}>
        <div className={`flex items-center gap-2.5 font-bold text-[13px] mb-1 ${isValid ? 'text-green-400' : 'text-red-400'}`}>
          {isValid ? <IconCheckCircle size={18} /> : <IconAlert size={18} />}
          {isValid ? 'Configuration Valid' : `${violations.length} Violation${violations.length > 1 ? 's' : ''} Found`}
        </div>
        <div className="text-[13px] text-[#666]">
          {isValid ? 'All services within capacity bounds' : (
            <ul className="list-disc pl-4 text-red-400 mt-1.5 space-y-0.5">
              {violations.map((v, i) => <li key={i}>{v}</li>)}
            </ul>
          )}
        </div>
      </div>

      {/* Total Power */}
      <div className="bg-[#1a1d24] px-5 py-4 rounded-xl border border-[#1e2028]">
        <div className="flex items-center gap-1.5 text-[11px] text-[#555] uppercase font-semibold tracking-wider mb-2">
          <IconZap size={13} className="text-[#555]" />
          Total Power
        </div>
        <div className={`text-[28px] font-bold leading-none ${totalPower > constraints.power_budget ? 'text-red-400' : 'text-white'}`}>
          {totalPower.toLocaleString()}
          <span className="text-[13px] text-[#555] font-normal ml-2">kW</span>
        </div>
      </div>

      {/* Service Capacity */}
      <div>
        <div className="text-[10px] text-[#444] uppercase font-bold tracking-widest mb-2 px-1">
          Service Capacity (RSU)
        </div>
        <CapacityCard type="compute" value={suite.compute ?? stats.compute} range={constraints.compute_range} maxScale={600} />
        <CapacityCard type="storage" value={suite.storage ?? stats.storage} range={constraints.storage_range} maxScale={300} />
        <CapacityCard type="ai"      value={suite.ai      ?? stats.ai}      range={constraints.ai_range}      maxScale={400} />
      </div>

      {/* Power by Row */}
      {powerByRow.length > 0 && (
        <div className="bg-[#1a1d24] px-5 py-4 rounded-xl border border-[#1e2028]">
          <div className="text-[10px] text-[#444] uppercase font-bold tracking-widest mb-4">
            Power by Row (kW)
          </div>
          <div className="space-y-[5px] max-h-72 overflow-y-auto pr-1">
            {powerByRow.map(([row, power]) => (
              <div key={row} className="flex items-center gap-3">
                <span className="text-[11px] text-[#444] font-mono w-8 shrink-0 text-right">
                  R{row.toString().padStart(2, '0')}
                </span>
                <div className="flex-1 h-5 bg-[#1e2028] rounded overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#1D4ED8] to-[#60A5FA] rounded transition-all duration-300"
                    style={{ width: `${(power / maxRowPower) * 100}%` }}
                  />
                </div>
                <span className="text-[11px] text-[#666] font-mono w-9 text-right shrink-0">
                  {power}
                </span>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-4 pt-3 border-t border-[#1e2028] text-[11px] text-[#444]">
            <span>Total: {totalPower.toLocaleString()} kW</span>
            <span>Max row: {maxRowPower} kW</span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="bg-[#1a1d24] py-4 px-5 rounded-xl border border-[#1e2028]">
        <div className="text-[10px] text-[#444] uppercase font-bold tracking-widest mb-3">Legend</div>
        {viewMode === 'type' ? (
          <div className="grid grid-cols-2 gap-3 text-[13px] text-[#777]">
            <div className="flex items-center gap-2.5">
              <div className="rack-cell rack-compute w-8 h-8 rounded-lg pointer-events-none">
                <IconCpu size={15} />
              </div>
              Compute
            </div>
            <div className="flex items-center gap-2.5">
              <div className="rack-cell rack-storage w-8 h-8 rounded-lg pointer-events-none">
                <IconHardDrive size={15} />
              </div>
              Storage
            </div>
            <div className="flex items-center gap-2.5">
              <div className="rack-cell rack-ai w-8 h-8 rounded-lg pointer-events-none">
                <IconBrain size={15} />
              </div>
              AI
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center border border-[#2a2d35]">
                <IconBox size={13} className="text-[#333]" />
              </div>
              Empty
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 text-[13px] text-[#777]">
            <div className="flex items-center gap-2.5"><div className="w-3 h-3 rounded-sm bg-[#22C55E]" /> Low</div>
            <div className="flex items-center gap-2.5"><div className="w-3 h-3 rounded-sm bg-[#FACC15]" /> Mid</div>
            <div className="flex items-center gap-2.5"><div className="w-3 h-3 rounded-sm bg-[#F97316]" /> High</div>
            <div className="flex items-center gap-2.5"><div className="w-3 h-3 rounded-sm bg-[#EF4444]" /> Max</div>
          </div>
        )}
      </div>
    </div>
  );
};
