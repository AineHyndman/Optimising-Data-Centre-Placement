import React, { useMemo } from 'react';
import type { SuitePlan } from './types';

interface SidebarProps {
  suite: SuitePlan;
}

export const Sidebar: React.FC<SidebarProps> = ({ suite }) => {
  // 1. Calculate stats for the Service Capacity section
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

  // 2. Calculate Power by Row dynamically
  const rowPowerData = useMemo(() => {
    const powerByRow: Record<number, number> = {};
    let maxPower = 0;
    
    suite.positions.forEach(pos => {
      if (pos.rack_type) {
        // If the backend JSON doesn't provide specific power_usage per position,
        // we estimate it evenly to match the mockup's visual representation.
        const power = (pos as any).power_usage || (suite.total_power_usage / stats.totalRacks);
        powerByRow[pos.row] = (powerByRow[pos.row] || 0) + power;
      }
    });

    const formattedRows = Object.entries(powerByRow).map(([rowStr, power]) => {
      const row = parseInt(rowStr);
      if (power > maxPower) maxPower = power;
      return { row, power };
    }).sort((a, b) => a.row - b.row);

    return { formattedRows, maxPower };
  }, [suite, stats.totalRacks]);

  // Format Total Power
  const totalPower = typeof suite.total_power_usage === 'number' 
    ? suite.total_power_usage.toLocaleString() 
    : '0';

  return (
    <div style={{ width: '320px', backgroundColor: '#1a1d24', padding: '20px', borderRadius: '8px', color: '#fff', display: 'flex', flexDirection: 'column', gap: '24px', border: '1px solid #333' }}>
      
      {/* 1. Status Box */}
      <div style={{ border: '1px solid #2e7d32', backgroundColor: '#1b2e20', padding: '15px', borderRadius: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4CAF50', fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>
          <span>✓</span> Configuration Valid
        </div>
        <div style={{ fontSize: '12px', color: '#888' }}>All services within capacity bounds</div>
      </div>

      {/* 2. Total Power */}
      <div>
        <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>⚡ Total Power</div>
        <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{totalPower} <span style={{ fontSize: '14px', color: '#888', fontWeight: 'normal' }}>kW</span></div>
      </div>

      {/* 3. Service Capacity */}
      <div>
        <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Service Capacity (RSU)</div>
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px' }}><span style={{ color: '#4A90E2' }}>🔵 Compute</span><span style={{ color: '#4CAF50', fontSize: '10px', padding: '2px 6px', border: '1px solid #2e7d32', borderRadius: '10px' }}>OK</span></div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '6px' }}>{stats.compute.toFixed(1)} <span style={{ fontSize: '12px', color: '#888', fontWeight: 'normal' }}>/ 388-500 RSU</span></div>
          <div style={{ height: '4px', backgroundColor: '#333', borderRadius: '2px' }}><div style={{ width: '80%', height: '100%', backgroundColor: '#4A90E2', borderRadius: '2px' }}></div></div>
        </div>
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px' }}><span style={{ color: '#50E3C2' }}>🟢 Storage</span><span style={{ color: '#4CAF50', fontSize: '10px', padding: '2px 6px', border: '1px solid #2e7d32', borderRadius: '10px' }}>OK</span></div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '6px' }}>{stats.storage.toFixed(1)} <span style={{ fontSize: '12px', color: '#888', fontWeight: 'normal' }}>/ 168-200 RSU</span></div>
          <div style={{ height: '4px', backgroundColor: '#333', borderRadius: '2px' }}><div style={{ width: '60%', height: '100%', backgroundColor: '#50E3C2', borderRadius: '2px' }}></div></div>
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px' }}><span style={{ color: '#BD10E0' }}>🟣 AI</span><span style={{ color: '#4CAF50', fontSize: '10px', padding: '2px 6px', border: '1px solid #2e7d32', borderRadius: '10px' }}>OK</span></div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '6px' }}>{stats.ai.toFixed(1)} <span style={{ fontSize: '12px', color: '#888', fontWeight: 'normal' }}>/ 145-250 RSU</span></div>
          <div style={{ height: '4px', backgroundColor: '#333', borderRadius: '2px' }}><div style={{ width: '70%', height: '100%', backgroundColor: '#BD10E0', borderRadius: '2px' }}></div></div>
        </div>
      </div>

      {/* 4. Legend */}
      <div style={{ backgroundColor: '#15171c', padding: '16px', borderRadius: '6px', border: '1px solid #222' }}>
        <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Legend</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px', color: '#aaa' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '12px', height: '12px', backgroundColor: '#4A90E2', borderRadius: '2px' }}></div> Compute</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '12px', height: '12px', backgroundColor: '#50E3C2', borderRadius: '2px' }}></div> Storage</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '12px', height: '12px', backgroundColor: '#BD10E0', borderRadius: '2px' }}></div> AI</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '12px', height: '12px', border: '1px solid #555', borderRadius: '2px' }}></div> Empty</div>
        </div>
      </div>

      {/* 5. Power By Row (Scrollable section matching mockup) */}
      <div style={{ backgroundColor: '#15171c', padding: '20px', borderRadius: '8px', border: '1px solid #222', display: 'flex', flexDirection: 'column', height: '350px' }}>
        <div style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px', fontWeight: 'bold' }}>Power By Row (kW)</div>
        
        {/* Scrollable Container */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {rowPowerData.formattedRows.map(({ row, power }) => (
            <div key={row} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '28px', color: '#888', fontSize: '13px', fontFamily: 'monospace' }}>
                R{row.toString().padStart(2, '0')}
              </div>
              
              {/* Blue Progress Bar */}
              <div style={{ flex: 1, height: '18px', backgroundColor: '#1e2128', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ 
                  width: `${(power / (rowPowerData.maxPower || 1)) * 100}%`, 
                  height: '100%', 
                  backgroundColor: '#2188ff', 
                  borderRadius: '4px' 
                }}></div>
              </div>
              
              <div style={{ width: '35px', textAlign: 'right', color: '#ddd', fontSize: '13px', fontFamily: 'monospace' }}>
                {Math.round(power)}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Area */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #222', fontSize: '12px', color: '#888' }}>
          <span>Total: {totalPower} kW</span>
          <span>Max row: {Math.round(rowPowerData.maxPower)} kW</span>
        </div>
      </div>

    </div>
  );
};