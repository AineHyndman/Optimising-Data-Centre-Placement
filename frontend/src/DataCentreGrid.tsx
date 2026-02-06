// frontend/src/DataCentreGrid.tsx
import React from 'react';
import type { Grid } from './utils';

// Helper to map JSON color names to real CSS colors
const getColor = (rackType: string | null): string => {
  if (!rackType) return '#eee'; // Grey for empty spots
  
  if (rackType.startsWith('C')) return '#ef4444'; // Red (Compute)
  if (rackType.startsWith('S')) return '#3b82f6'; // Blue (Storage)
  if (rackType.startsWith('A')) return '#a855f7'; // Purple (AI)
  
  return '#6b7280'; // Default grey
};

interface Props {
  grid: Grid;
  title: string;
}

export const DataCentreGrid: React.FC<Props> = ({ grid, title }) => {
  return (
    <div style={{ margin: '20px', fontFamily: 'monospace' }}>
      <h3>{title}</h3>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(16, 25px)', 
        gap: '2px',
        backgroundColor: '#222',
        padding: '10px',
        width: 'fit-content'
      }}>
        
        {grid.map((row, rowIndex) => (
          <React.Fragment key={rowIndex}>
            {row.map((cellValue, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                title={`Row ${rowIndex + 1}, Pos ${colIndex + 1}: ${cellValue || 'Empty'}`}
                style={{
                  width: '25px',
                  height: '25px',
                  backgroundColor: getColor(cellValue),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  color: 'white',
                  borderRadius: '2px'
                }}
              >
                {cellValue || ''}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};