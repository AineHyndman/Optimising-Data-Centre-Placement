import React from 'react';
import type { Grid } from './utils';

interface DataCentreGridProps {
  grid: Grid;
  title: string;
}

export const DataCentreGrid: React.FC<DataCentreGridProps> = ({ grid, title }) => {
  // Requirement: Compute=Blue, Storage=Green, AI=Purple
  const getCellColor = (value: string | null) => {
    if (!value) return '#eee'; // Empty cell (Grey)

    // Check the first letter of the rack ID (e.g., "C" from "C23")
    const type = value.charAt(0).toUpperCase();

    switch (type) {
      case 'C': return '#4A90E2'; // Compute -> Blue
      case 'S': return '#50E3C2'; // Storage -> Green
      case 'A': return '#BD10E0'; // AI -> Purple
      default: return '#ccc';     // Unknown -> Dark Grey
    }
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <h3>{title}</h3>
      <div
        style={{
          display: 'grid',
          // 47 rows, 12 columns
          gridTemplateColumns: 'repeat(12, 40px)',
          gridTemplateRows: 'repeat(47, 40px)', 
          gap: '2px',
        }}
      >
        {/* Render rows 1 to 47 */}
        {Array.from({ length: 47 }).map((_, rowIndex) => {
          const rowKey = rowIndex + 1; // 1-based index
          return Array.from({ length: 12 }).map((_, colIndex) => {
            const colKey = colIndex + 1; // 1-based index
            const cellValue = grid[rowKey]?.[colKey] || null;

            return (
              <div
                key={`${rowKey}-${colKey}`}
                style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: getCellColor(cellValue),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  color: cellValue ? 'white' : 'transparent',
                  fontWeight: 'bold',
                  border: '1px solid #ddd',
                }}
                title={`Row: ${rowKey}, Col: ${colKey}`}
              >
                {cellValue}
              </div>
            );
          });
        })}
      </div>
    </div>
  );
};