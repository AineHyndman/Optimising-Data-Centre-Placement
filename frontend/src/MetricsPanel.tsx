import React, { useMemo } from 'react';
import type { SuitePlan } from './types';

interface MetricsPanelProps {
  suite: SuitePlan;
}

export const MetricsPanel: React.FC<MetricsPanelProps> = ({ suite }) => {
  
  // Calculate stats dynamically from the positions list
  const stats = useMemo(() => {
    let counts = {
      gen23: 0, gen24: 0, gen25: 0,
      compute: 0, storage: 0, ai: 0,
      totalRacks: 0
    };

    suite.positions.forEach(pos => {
      if (!pos.rack_type) return;
      
      counts.totalRacks++;

      // Count Generations
      if (pos.rack_type.endsWith('23')) counts.gen23++;
      if (pos.rack_type.endsWith('24')) counts.gen24++;
      if (pos.rack_type.endsWith('25')) counts.gen25++;

      // Count Types
      if (pos.rack_type.startsWith('C')) counts.compute++;
      if (pos.rack_type.startsWith('S')) counts.storage++;
      if (pos.rack_type.startsWith('A')) counts.ai++;
    });

    return counts;
  }, [suite]);

  // Styles for the metric cards
  const cardStyle = {
    backgroundColor: '#444',
    padding: '15px',
    borderRadius: '8px',
    flex: '1',
    minWidth: '120px',
    textAlign: 'center' as const,
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.85rem',
    color: '#aaa',
    marginBottom: '5px',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px'
  };

  const valueStyle = {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#fff'
  };

  return (
    <div style={{ 
      backgroundColor: '#333', 
      padding: '20px', 
      borderRadius: '8px',
      marginBottom: '20px',
      color: '#fff'
    }}>
      <h3 style={{ marginTop: 0, borderBottom: '1px solid #555', paddingBottom: '10px' }}>
        Suite Metrics: {suite.datacenter} - {suite.suite}
      </h3>
      
      <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginTop: '15px' }}>
        
        {/* Power Usage Card (from JSON) */}
        <div style={cardStyle}>
          <span style={labelStyle}>Total Power</span>
          <div style={{...valueStyle, color: '#FFD700'}}>
          {typeof suite.total_power_usage === 'number' ? `${suite.total_power_usage.toFixed(1)} kW` : '0.0 kW'}
          </div>
        </div>

        {/* Rack Counts by Type */}
        <div style={cardStyle}>
          <span style={labelStyle}>Compute Racks</span>
          <div style={{...valueStyle, color: '#4A90E2'}}>{stats.compute}</div>
        </div>

        <div style={cardStyle}>
          <span style={labelStyle}>Storage Racks</span>
          <div style={{...valueStyle, color: '#50E3C2'}}>{stats.storage}</div>
        </div>

        <div style={cardStyle}>
          <span style={labelStyle}>AI Racks</span>
          <div style={{...valueStyle, color: '#BD10E0'}}>{stats.ai}</div>
        </div>

      </div>

      {/* Generation Distribution Bar */}
      <div style={{ marginTop: '20px' }}>
        <span style={labelStyle}>Generation Distribution ({stats.totalRacks} Racks Total)</span>
        <div style={{ display: 'flex', height: '20px', borderRadius: '4px', overflow: 'hidden', marginTop: '5px' }}>
          {/* 2023 Segment */}
          {stats.gen23 > 0 && (
            <div style={{ width: `${(stats.gen23 / stats.totalRacks) * 100}%`, backgroundColor: '#888', title: '2023' }} />
          )}
          {/* 2024 Segment */}
          {stats.gen24 > 0 && (
            <div style={{ width: `${(stats.gen24 / stats.totalRacks) * 100}%`, backgroundColor: '#aaa', title: '2024' }} />
          )}
          {/* 2025 Segment */}
          {stats.gen25 > 0 && (
            <div style={{ width: `${(stats.gen25 / stats.totalRacks) * 100}%`, backgroundColor: '#fff', title: '2025' }} />
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#ccc', marginTop: '5px' }}>
            <span>2023: {stats.gen23}</span>
            <span>2024: {stats.gen24}</span>
            <span>2025: {stats.gen25}</span>
        </div>
      </div>
    </div>
  );
};