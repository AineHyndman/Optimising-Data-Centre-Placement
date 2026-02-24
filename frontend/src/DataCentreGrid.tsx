import React from 'react';
import type { Grid } from './utils';
import type { RackSpec } from './types';
import { powerToColor } from './utils';

interface DataCentreGridProps {
  grid: Grid;
  title: string;
  viewMode?: 'type' | 'power';
  rackTypes?: RackSpec[];
}

const cellColorMap: Record<string, string> = {
  C: 'bg-[#4A90E2]',
  S: 'bg-[#50E3C2]',
  A: 'bg-[#BD10E0]',
};

export const DataCentreGrid: React.FC<DataCentreGridProps> = ({ 
  grid, 
  title, 
  viewMode = 'type', 
  rackTypes = [] 
}) => {
  const maxPower = rackTypes.length > 0 
    ? Math.max(...rackTypes.map(r => r.power_need)) 
    : 1;

  const getCellData = (value: string | null) => {
    if (!value) return { classes: 'bg-transparent border border-[#2a2d35]', title: '', content: '' };

    const type = value.charAt(0).toUpperCase();
    const rackSpec = rackTypes.find(r => r.type === type);
    const power = rackSpec ? rackSpec.power_need : 0;
    
    if (viewMode === 'power') {
      const intensity = power / maxPower;
      return {
        classes: `${powerToColor(intensity)} border border-white/[0.08]`,
        title: `${power} kW`,
        content: value
      };
    }

    return {
      classes: `${cellColorMap[type] || 'bg-[#ccc]'} border border-white/[0.08] text-white`,
      title: '', 
      content: value
    };
  };

  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  const isEmptyRow = (rowIndex: number) => grid[rowIndex].every(cell => cell === null);

  return (
    <div className="overflow-x-auto">
      {title && <h3>{title}</h3>}
      <table className="border-separate border-spacing-[2px] w-full">
        <thead>
          <tr>
            <th className="w-10"></th>
            {Array.from({ length: cols }).map((_, colIndex) => (
              <th key={colIndex} className="text-[11px] text-[#666] font-normal py-1 text-center font-mono">
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
                  <td className="text-[11px] text-[#555] font-mono pr-1.5 text-right">
                    R{rowIndex.toString().padStart(2, '0')}
                  </td>
                  <td colSpan={cols} className="h-3"></td>
                </tr>
              );
            }

            return (
              <tr key={rowIndex}>
                <td className="text-[11px] text-[#555] font-mono pr-1.5 text-right whitespace-nowrap">
                  R{rowIndex.toString().padStart(2, '0')}
                </td>
                {grid[rowIndex].map((cellValue, colIndex) => {
                  const cellData = getCellData(cellValue);
                  const hoverTitle = viewMode === 'power' && cellValue 
                    ? cellData.title 
                    : `Row: R${rowIndex.toString().padStart(2, '0')}, Col: P${colIndex}`;

                  return (
                    <td
                      key={colIndex}
                      className={`text-center text-[10px] font-bold py-1.5 px-0.5 rounded-sm ${cellData.classes}`}
                      title={hoverTitle}
                    >
                      {cellData.content}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};