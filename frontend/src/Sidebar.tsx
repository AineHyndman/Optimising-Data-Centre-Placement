import React, { useMemo } from 'react';
import type { SuitePlan, Constraints, RackSpec } from './types';
import { computeViolations } from './utils';

interface SidebarProps {
  suite: SuitePlan;
  constraints: Constraints;
  viewMode?: 'type' | 'power';
  rackTypes: RackSpec[];
}

export const Sidebar: React.FC<SidebarProps> = ({ suite, constraints, viewMode = 'type', rackTypes = [] }) => {
  const stats = useMemo(() => {
    const counts = { compute: 0, storage: 0, ai: 0, totalRacks: 0 };
    suite.positions.forEach(pos => {
      if (!pos.rack_type) return;
      counts.totalRacks++;
      if (pos.rack_type.startsWith('C')) counts.compute++;
      if (pos.rack_type.startsWith('S')) counts.storage++;
      if (pos.rack_type.startsWith('A')) counts.ai++;
    });
    return counts;
  }, [suite]);

  // Issue 2: Dynamic Violations
  const violations = useMemo(() => computeViolations(suite, constraints, rackTypes), [suite, constraints, rackTypes]);
  const isValid = violations.length === 0;

  const totalPower = typeof suite.total_power_usage === 'number' ? suite.total_power_usage : 0;

  const capacitySection = (label: string, value: number, range: { min: number, max: number }, color: string, bgClass: string, maxScale: number) => {
    const isViolated = value < range.min || value > range.max;
    const barColorClass = isViolated ? 'bg-red-500' : bgClass;
    const currentPos = Math.min((value / maxScale) * 100, 100);
    const minPos = (range.min / maxScale) * 100;
    const maxPos = (range.max / maxScale) * 100;

    return (
      <div className="mb-4 p-3.5 bg-[#15171c] rounded-lg border border-[#222]">
        <div className="flex justify-between text-sm mb-1.5 items-center">
          <span className="font-semibold flex items-center gap-1.5" style={{ color: isViolated ? '#ef4444' : color }}>{label}</span>
          <span className={`text-[10px] py-0.5 px-2 border rounded-full font-bold ${isViolated ? 'text-red-500 border-red-500' : 'text-[#4CAF50] border-[#2e7d32]'}`}>{isViolated ? 'VIOLATION' : 'OK'}</span>
        </div>
        <div className="text-2xl font-bold mb-2">{value.toFixed(1)} <span className="text-[13px] text-[#666] font-normal">/ {range.min}-{range.max} RSU</span></div>
        <div className="h-1.5 bg-[#2a2d35] rounded-sm relative">
          <div className={`h-full ${barColorClass} rounded-sm transition-all duration-300`} style={{ width: `${currentPos}%` }}></div>
          <div className="absolute top-[-2px] bottom-[-2px] w-[2px] bg-white" style={{ left: `${minPos}%` }}></div>
          <div className="absolute top-[-2px] bottom-[-2px] w-[2px] bg-white" style={{ left: `${maxPos}%` }}></div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-95 shrink-0 flex flex-col gap-4">
      {/* Issue 2: Dynamic Status Box */}
      <div className={`border py-4 px-5 rounded-lg ${isValid ? 'border-[#2e7d32] bg-[#1b2e20]' : 'border-red-500 bg-red-900/20'}`}>
        <div className={`flex items-center gap-2 font-bold text-[15px] mb-1 ${isValid ? 'text-[#4CAF50]' : 'text-red-500'}`}>
          <span className="text-lg">{isValid ? '✓' : '⚠'}</span> 
          {isValid ? 'Configuration Valid' : `${violations.length} Violation(s) Found`}
        </div>
        <div className="text-[13px] text-[#888]">
          {isValid ? 'All services within capacity bounds' : (
            <ul className="list-disc pl-4 text-red-400 mt-2 space-y-1">
              {violations.map((v, i) => <li key={i}>{v}</li>)}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-[#1a1d24] p-5 rounded-lg border border-[#2a2d35]">
        <div className="text-[11px] text-[#888] uppercase mb-1.5">Total Power</div>
        <div className={`text-[32px] font-bold ${totalPower > constraints.power_budget ? 'text-red-500' : 'text-white'}`}>
          {totalPower.toLocaleString()} <span className="text-base text-[#666] font-normal">kW</span>
        </div>
      </div>

      <div>
        <div className="text-[11px] text-[#888] uppercase mb-3 font-bold">Service Capacity (RSU)</div>
        {capacitySection('Compute', suite.compute ?? stats.compute, constraints.compute_range, '#4A90E2', 'bg-[#4A90E2]', 600)}
        {capacitySection('Storage', suite.storage ?? stats.storage, constraints.storage_range, '#50E3C2', 'bg-[#50E3C2]', 300)}
        {capacitySection('AI', suite.ai ?? stats.ai, constraints.ai_range, '#BD10E0', 'bg-[#BD10E0]', 400)}
      </div>

      <div className="bg-[#1a1d24] py-4 px-5 rounded-lg border border-[#2a2d35]">
        <div className="text-[11px] text-[#888] uppercase mb-3 font-bold">Legend</div>
        {viewMode === 'type' ? (
          <div className="grid grid-cols-2 gap-3 text-[13px] text-[#aaa]">
            <div className="flex items-center gap-2"><div className="w-3.5 h-3.5 bg-[#4A90E2] rounded-sm"></div> Compute</div>
            <div className="flex items-center gap-2"><div className="w-3.5 h-3.5 bg-[#50E3C2] rounded-sm"></div> Storage</div>
            <div className="flex items-center gap-2"><div className="w-3.5 h-3.5 bg-[#BD10E0] rounded-sm"></div> AI</div>
          </div>
        ) : (
          /* Issue 1: Heatmap Legend */
          <div className="grid grid-cols-2 gap-3 text-[13px] text-[#aaa]">
            <div className="flex items-center gap-2"><div className="w-3.5 h-3.5 bg-[#4CAF50] rounded-sm"></div> 0-40%</div>
            <div className="flex items-center gap-2"><div className="w-3.5 h-3.5 bg-[#FFEB3B] rounded-sm"></div> 40-70%</div>
            <div className="flex items-center gap-2"><div className="w-3.5 h-3.5 bg-[#FF9800] rounded-sm"></div> 70-90%</div>
            <div className="flex items-center gap-2"><div className="w-3.5 h-3.5 bg-[#F44336] rounded-sm"></div> 90-100%</div>
          </div>
        )}
      </div>
    </div>
  );
};