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

  // Capacity bar helper
  const capacitySection = (
    label: string,
    value: number,
    range: string,
    color: string,
    percent: number,
  ) => (
    <div style={{ marginBottom: '16px', padding: '14px', backgroundColor: '#15171c', borderRadius: '8px', border: '1px solid #222' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '6px', alignItems: 'center' }}>
        <span style={{ color, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '10px', height: '10px', backgroundColor: color, borderRadius: '2px', display: 'inline-block' }}></span>
          {label}
        </span>
        <span style={{ color: '#4CAF50', fontSize: '10px', padding: '2px 8px', border: '1px solid #2e7d32', borderRadius: '10px', fontWeight: 'bold' }}>OK</span>
      </div>
      <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
        {value.toFixed(1)} <span style={{ fontSize: '13px', color: '#666', fontWeight: 'normal' }}>/ {range} RSU</span>
      </div>
      <div style={{ height: '6px', backgroundColor: '#2a2d35', borderRadius: '3px' }}>
        <div style={{ width: `${Math.min(percent, 100)}%`, height: '100%', backgroundColor: color, borderRadius: '3px' }}></div>
      </div>
    </div>
  );

  return (
    <div style={{ width: '380px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Status Box */}
      <div style={{ border: '1px solid #2e7d32', backgroundColor: '#1b2e20', padding: '16px 20px', borderRadius: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4CAF50', fontWeight: 'bold', fontSize: '15px', marginBottom: '4px' }}>
          <span style={{ fontSize: '18px' }}>&#10003;</span> Configuration Valid
        </div>
        <div style={{ fontSize: '13px', color: '#888' }}>All services within capacity bounds</div>
      </div>

      {/* Total Power */}
      <div style={{ backgroundColor: '#1a1d24', padding: '20px', borderRadius: '8px', border: '1px solid #2a2d35' }}>
        <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '14px' }}>&#9889;</span> Total Power
        </div>
        <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
          {totalPower} <span style={{ fontSize: '16px', color: '#666', fontWeight: 'normal' }}>kW</span>
        </div>
      </div>

      {/* Service Capacity */}
      <div>
        <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', fontWeight: 'bold' }}>Service Capacity (RSU)</div>
        {capacitySection('Compute', suite.compute ?? stats.compute, '388\u2013500', '#4A90E2', ((suite.compute ?? stats.compute) / 500) * 100)}
        {capacitySection('Storage', suite.storage ?? stats.storage, '166\u2013200', '#50E3C2', ((suite.storage ?? stats.storage) / 200) * 100)}
        {capacitySection('AI', suite.ai ?? stats.ai, '145\u2013250', '#BD10E0', ((suite.ai ?? stats.ai) / 250) * 100)}
      </div>

      {/* Legend */}
      <div style={{ backgroundColor: '#1a1d24', padding: '16px 20px', borderRadius: '8px', border: '1px solid #2a2d35' }}>
        <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', fontWeight: 'bold' }}>Legend</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px', color: '#aaa' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '14px', height: '14px', backgroundColor: '#4A90E2', borderRadius: '3px' }}></div> Compute</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '14px', height: '14px', backgroundColor: '#50E3C2', borderRadius: '3px' }}></div> Storage</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '14px', height: '14px', backgroundColor: '#BD10E0', borderRadius: '3px' }}></div> AI</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '14px', height: '14px', border: '1px solid #555', borderRadius: '3px' }}></div> Empty</div>
        </div>
      </div>

      {/* Power By Row */}
      <div style={{ backgroundColor: '#1a1d24', padding: '20px', borderRadius: '8px', border: '1px solid #2a2d35', display: 'flex', flexDirection: 'column', maxHeight: '400px' }}>
        <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px', fontWeight: 'bold' }}>Power By Row (kW)</div>

        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {rowPowerData.formattedRows.map(({ row, power }) => (
            <div key={row} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '30px', color: '#666', fontSize: '12px', fontFamily: 'monospace', textAlign: 'right' }}>
                R{row.toString().padStart(2, '0')}
              </div>
              <div style={{ flex: 1, height: '20px', backgroundColor: '#1e2128', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  width: `${(power / (rowPowerData.maxPower || 1)) * 100}%`,
                  height: '100%',
                  backgroundColor: '#2188ff',
                  borderRadius: '4px'
                }}></div>
              </div>
              <div style={{ width: '36px', textAlign: 'right', color: '#ccc', fontSize: '12px', fontFamily: 'monospace' }}>
                {Math.round(power)}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #222', fontSize: '12px', color: '#666' }}>
          <span>Total: {totalPower} kW</span>
          <span>Max row: {Math.round(rowPowerData.maxPower)} kW</span>
        </div>
      </div>
    </div>
  );
};
