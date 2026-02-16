import React from 'react';
import type { Grid } from './utils';

interface DataCentreGridProps {
  grid: Grid;
  title: string;
}

export const DataCentreGrid: React.FC<DataCentreGridProps> = ({ grid, title }) => {
  const getCellColor = (value: string | null) => {
    if (!value) return 'transparent';
    const type = value.charAt(0).toUpperCase();
    switch (type) {
      case 'C': return '#4A90E2';
      case 'S': return '#50E3C2';
      case 'A': return '#BD10E0';
      default: return '#ccc';
    }
  };

  const rows = grid.length;
  const cols = grid[0]?.length || 0;

  // Detect aisle gaps (empty rows where all cells are null)
  const isEmptyRow = (rowIndex: number) => grid[rowIndex].every(cell => cell === null);

  return (
    <div style={{ overflowX: 'auto' }}>
      {title && <h3>{title}</h3>}
      <table style={{ borderCollapse: 'separate', borderSpacing: '2px', width: '100%' }}>
        <thead>
          <tr>
            <th style={{ width: '40px' }}></th>
            {Array.from({ length: cols }).map((_, colIndex) => (
              <th key={colIndex} style={{ fontSize: '11px', color: '#666', fontWeight: 'normal', padding: '4px 0', textAlign: 'center', fontFamily: 'monospace' }}>
                P{colIndex}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => {
            if (isEmptyRow(rowIndex)) {
              return (
                <tr key={rowIndex}>
                  <td style={{ fontSize: '11px', color: '#555', fontFamily: 'monospace', padding: '2px 6px 2px 0', textAlign: 'right' }}>
                    R{rowIndex.toString().padStart(2, '0')}
                  </td>
                  <td colSpan={cols} style={{ height: '12px' }}></td>
                </tr>
              );
            }

            return (
              <tr key={rowIndex}>
                <td style={{ fontSize: '11px', color: '#555', fontFamily: 'monospace', padding: '2px 6px 2px 0', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  R{rowIndex.toString().padStart(2, '0')}
                </td>
                {grid[rowIndex].map((cellValue, colIndex) => (
                  <td
                    key={colIndex}
                    style={{
                      backgroundColor: getCellColor(cellValue),
                      textAlign: 'center',
                      fontSize: '10px',
                      color: cellValue ? 'white' : 'transparent',
                      fontWeight: 'bold',
                      padding: '6px 2px',
                      borderRadius: '3px',
                      border: cellValue ? '1px solid rgba(255,255,255,0.08)' : '1px solid #2a2d35',
                    }}
                    title={`Row: R${rowIndex.toString().padStart(2, '0')}, Col: P${colIndex}`}
                  >
                    {cellValue || ''}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
