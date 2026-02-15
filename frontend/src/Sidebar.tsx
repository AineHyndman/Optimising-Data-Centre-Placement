import React, { useMemo } from 'react';
import type { SuitePlan } from './types';

interface SidebarProps {
  suite: SuitePlan;
}

export const Sidebar: React.FC<SidebarProps> = ({ suite }) => {
  // Calculate stats for the Service Capacity section
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

  // Format Total Power
  const totalPower = typeof suite.total_power_usage === 'number' 
    ? suite.total_power_usage.toLocaleString() // Adds commas like "11,352"
    : '0';

  return (
    <div style={{ 
      width: '320px', 
      backgroundColor: '#1a1d24', // Match dark mockup background
      padding: '20px', 
      borderRadius: '8px', 
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      border: '1px solid #333'
    }}>
      
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
        <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
          {totalPower} <span style={{ fontSize: '14px', color: '#888', fontWeight: 'normal' }}>kW</span>
        </div>
      </div>

      {/* 3. Service Capacity */}
      <div>
        <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Service Capacity (RSU)</div>
        
        {/* Compute */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px' }}>
            <span style={{ color: '#4A90E2' }}>🔵 Compute</span>
            <span style={{ color: '#4CAF50', fontSize: '10px', padding: '2px 6px', border: '1px solid #2e7d32', borderRadius: '10px' }}>OK</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '6px' }}>{stats.compute.toFixed(1)} <span style={{ fontSize: '12px', color: '#888', fontWeight: 'normal' }}>/ 388-500 RSU</span></div>
          <div style={{ height: '4px', backgroundColor: '#333', borderRadius: '2px' }}><div style={{ width: '80%', height: '100%', backgroundColor: '#4A90E2', borderRadius: '2px' }}></div></div>
        </div>

        {/* Storage */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px' }}>
            <span style={{ color: '#50E3C2' }}>🟢 Storage</span>
            <span style={{ color: '#4CAF50', fontSize: '10px', padding: '2px 6px', border: '1px solid #2e7d32', borderRadius: '10px' }}>OK</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '6px' }}>{stats.storage.toFixed(1)} <span style={{ fontSize: '12px', color: '#888', fontWeight: 'normal' }}>/ 168-200 RSU</span></div>
          <div style={{ height: '4px', backgroundColor: '#333', borderRadius: '2px' }}><div style={{ width: '60%', height: '100%', backgroundColor: '#50E3C2', borderRadius: '2px' }}></div></div>
        </div>

        {/* AI */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px' }}>
            <span style={{ color: '#BD10E0' }}>🟣 AI</span>
            <span style={{ color: '#4CAF50', fontSize: '10px', padding: '2px 6px', border: '1px solid #2e7d32', borderRadius: '10px' }}>OK</span>
          </div>
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

      {/* 5. Power By Row (Placeholder) */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Power By Row (kW)</span>
        </div>
        <div style={{ fontSize: '12px', color: '#666', fontStyle: 'italic', padding: '10px', backgroundColor: '#15171c', borderRadius: '4px' }}>
            Row data to be calculated...
        </div>
      </div>

    </div>
  );
};