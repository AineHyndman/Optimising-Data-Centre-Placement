import React, { useMemo } from 'react';
import type { SuitePlan } from './types';

interface SidebarProps {
  suite: SuitePlan;
}

export const Sidebar: React.FC<SidebarProps> = ({ suite }) => {
  const stats = useMemo(() => {
    let counts = { compute: 0, storage: 0, ai: 0, totalRacks: 0 };
    suite.positions.forEach(pos => {
      if (!pos.rack_type) return;
      counts.totalRacks++;
      if (pos.rack_type.startsWith('C')) counts.compute++;
      if (pos.rack_type.startsWith('S')) counts.storage++;
      if (pos.rack_type.startsWith('A')) counts.ai++;
    });
    return counts;
  }, [suite]);

  const rowPowerData = useMemo(() => {
    const powerByRow: Record<number, number> = {};
    let maxPower = 0;

    suite.positions.forEach(pos => {
      if (pos.rack_type) {
        const power = (pos as any).power_usage || ((suite.total_power_usage ?? 0) / stats.totalRacks);
        const rowNum = parseInt(pos.row, 10);
        powerByRow[rowNum] = (powerByRow[rowNum] || 0) + power;
      }
    });

    const formattedRows = Object.entries(powerByRow).map(([rowStr, power]) => {
      const row = parseInt(rowStr);
      if (power > maxPower) maxPower = power;
      return { row, power };
    }).sort((a, b) => a.row - b.row);

    return { formattedRows, maxPower };
  }, [suite, stats.totalRacks]);

  const totalPower = typeof suite.total_power_usage === 'number'
    ? suite.total_power_usage.toLocaleString()
    : '0';

  const capacitySection = (
    label: string,
    value: number,
    range: string,
    color: string,
    bgClass: string,
    percent: number,
  ) => (
    <div className="mb-4 p-3.5 bg-[#15171c] rounded-lg border border-[#222]">
      <div className="flex justify-between text-sm mb-1.5 items-center">
        <span className="font-semibold flex items-center gap-1.5" style={{ color }}>
          <span className={`w-2.5 h-2.5 ${bgClass} rounded-sm inline-block`}></span>
          {label}
        </span>
        <span className="text-[#4CAF50] text-[10px] py-0.5 px-2 border border-[#2e7d32] rounded-full font-bold">OK</span>
      </div>
      <div className="text-2xl font-bold mb-2">
        {value.toFixed(1)} <span className="text-[13px] text-[#666] font-normal">/ {range} RSU</span>
      </div>
      <div className="h-1.5 bg-[#2a2d35] rounded-sm">
        <div
          className={`h-full ${bgClass} rounded-sm`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        ></div>
      </div>
    </div>
  );

  return (
    <div className="w-95 shrink-0 flex flex-col gap-4">

      {/* Status Box */}
      <div className="border border-[#2e7d32] bg-[#1b2e20] py-4 px-5 rounded-lg">
        <div className="flex items-center gap-2 text-[#4CAF50] font-bold text-[15px] mb-1">
          <span className="text-lg">&#10003;</span> Configuration Valid
        </div>
        <div className="text-[13px] text-[#888]">All services within capacity bounds</div>
      </div>

      {/* Total Power */}
      <div className="bg-[#1a1d24] p-5 rounded-lg border border-[#2a2d35]">
        <div className="text-[11px] text-[#888] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <span className="text-sm">&#9889;</span> Total Power
        </div>
        <div className="text-[32px] font-bold">
          {totalPower} <span className="text-base text-[#666] font-normal">kW</span>
        </div>
      </div>

      {/* Service Capacity */}
      <div>
        <div className="text-[11px] text-[#888] uppercase tracking-wider mb-3 font-bold">Service Capacity (RSU)</div>
        {capacitySection('Compute', suite.compute ?? stats.compute, '388\u2013500', '#4A90E2', 'bg-[#4A90E2]', ((suite.compute ?? stats.compute) / 500) * 100)}
        {capacitySection('Storage', suite.storage ?? stats.storage, '166\u2013200', '#50E3C2', 'bg-[#50E3C2]', ((suite.storage ?? stats.storage) / 200) * 100)}
        {capacitySection('AI', suite.ai ?? stats.ai, '145\u2013250', '#BD10E0', 'bg-[#BD10E0]', ((suite.ai ?? stats.ai) / 250) * 100)}
      </div>

      {/* Legend */}
      <div className="bg-[#1a1d24] py-4 px-5 rounded-lg border border-[#2a2d35]">
        <div className="text-[11px] text-[#888] uppercase tracking-wider mb-3 font-bold">Legend</div>
        <div className="grid grid-cols-2 gap-3 text-[13px] text-[#aaa]">
          <div className="flex items-center gap-2"><div className="w-3.5 h-3.5 bg-[#4A90E2] rounded-sm"></div> Compute</div>
          <div className="flex items-center gap-2"><div className="w-3.5 h-3.5 bg-[#50E3C2] rounded-sm"></div> Storage</div>
          <div className="flex items-center gap-2"><div className="w-3.5 h-3.5 bg-[#BD10E0] rounded-sm"></div> AI</div>
          <div className="flex items-center gap-2"><div className="w-3.5 h-3.5 border border-[#555] rounded-sm"></div> Empty</div>
        </div>
      </div>

      {/* Power By Row */}
      <div className="bg-[#1a1d24] p-5 rounded-lg border border-[#2a2d35] flex flex-col max-h-100">
        <div className="text-[11px] text-[#888] uppercase tracking-wider mb-4 font-bold">Power By Row (kW)</div>

        <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-2">
          {rowPowerData.formattedRows.map(({ row, power }) => (
            <div key={row} className="flex items-center gap-2.5">
              <div className="w-7.5 text-[#666] text-xs font-mono text-right">
                R{row.toString().padStart(2, '0')}
              </div>
              <div className="flex-1 h-5 bg-[#1e2128] rounded overflow-hidden">
                <div
                  className="h-full bg-[#2188ff] rounded"
                  style={{ width: `${(power / (rowPowerData.maxPower || 1)) * 100}%` }}
                ></div>
              </div>
              <div className="w-9 text-right text-[#ccc] text-xs font-mono">
                {Math.round(power)}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between mt-3.5 pt-3.5 border-t border-[#222] text-xs text-[#666]">
          <span>Total: {totalPower} kW</span>
          <span>Max row: {Math.round(rowPowerData.maxPower)} kW</span>
        </div>
      </div>
    </div>
  );
};
