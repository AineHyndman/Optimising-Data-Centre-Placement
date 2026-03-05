import React from 'react';
import type { WeeklySummaryData } from './types';

interface WeeklySummaryProps {
  data: WeeklySummaryData[];
  onBack: () => void;
}

export const WeeklySummary: React.FC<WeeklySummaryProps> = ({ data, onBack }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-[#1a1d24] p-8 rounded-lg border border-[#2a2d35] text-center">
        <p className="text-[#888]">No weekly summary data available.</p>
        <button onClick={onBack} className="mt-4 text-[#4A90E2] underline">Go Back</button>
      </div>
    );
  }

  const totalPowerSaved = data.reduce((acc, week) => acc + week.power_saved, 0);
  const totalRacksReplaced = data.reduce((acc, week) => acc + week.racks_replaced, 0);

  return (
    <div className="flex flex-col gap-6 animate-fade-in w-full">
      {/* Header and Top-Level Stats */}
      <div className="flex justify-between items-end bg-[#1a1d24] p-6 rounded-lg border border-[#2a2d35]">
        <div>
          <h2 className="text-xl font-bold text-white mb-2">Optimization Report</h2>
          <p className="text-sm text-[#888]">Week-by-week simulation results</p>
        </div>
        <div className="flex gap-6 items-center text-right">
          <div>
            <div className="text-[11px] text-[#888] uppercase font-bold mb-1">Total Power Saved</div>
            <div className="text-2xl font-bold text-[#4CAF50]">{totalPowerSaved.toLocaleString()} kW</div>
          </div>
          <div>
            <div className="text-[11px] text-[#888] uppercase font-bold mb-1">Total Racks Swapped</div>
            <div className="text-2xl font-bold text-[#4A90E2]">{totalRacksReplaced}</div>
          </div>
          <button 
            onClick={onBack}
            className="ml-4 py-2 px-4 border border-[#333] hover:bg-[#333] text-white rounded-md text-sm transition-colors"
          >
            ← Back to Layout
          </button>
        </div>
      </div>

      {/* Weekly Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {data.map((week) => (
          <div key={week.week} className="bg-[#1a1d24] p-5 rounded-lg border border-[#2a2d35] flex flex-col">
            <div className="flex justify-between items-center mb-4 border-b border-[#333] pb-3">
              <h3 className="font-bold text-lg">Week {week.week}</h3>
              <span className="text-xs bg-[#0f1115] px-2 py-1 rounded border border-[#333]">
                {week.racks_replaced} swaps
              </span>
            </div>
            
            <div className="space-y-4 flex-1">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#888]">Power Saved</span>
                <span className="font-mono text-[#4CAF50] font-bold">-{week.power_saved} kW</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#888]">End of Week Power</span>
                <span className="font-mono text-white">{week.total_power_usage.toLocaleString()} kW</span>
              </div>
              
              <div className="pt-3 border-t border-[#333]">
                <div className="text-[11px] text-[#888] uppercase mb-2">Ending RSU Capacity</div>
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-[#4A90E2]">C: {week.rsu_totals?.compute || 0}</span>
                  <span className="text-[#50E3C2]">S: {week.rsu_totals?.storage || 0}</span>
                  <span className="text-[#BD10E0]">A: {week.rsu_totals?.ai || 0}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};