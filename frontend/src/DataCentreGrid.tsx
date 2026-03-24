import React from 'react';
import type { Grid } from './utils';
import type { RackSpec } from './types';

interface DataCentreGridProps {
  grid: Grid;
  title: string;
  viewMode?: 'type' | 'power';
  rackTypes?: RackSpec[];
  onCellClick?: (row: number, col: number) => void;
  highlightedCells?: Set<string>;
}

const POWER_COLOR = (intensity: number): string => {
  if (intensity <= 0.33) return 'hsl(160 84% 45%)';
  if (intensity <= 0.66) return 'hsl(38 95% 55%)';
  if (intensity <= 0.85) return 'hsl(22 95% 55%)';
  return 'hsl(0 72% 55%)';
};

export const DataCentreGrid: React.FC<DataCentreGridProps> = ({
  grid,
  title,
  viewMode = 'type',
  rackTypes = [],
  onCellClick,
  highlightedCells,
}) => {
  const maxPower = rackTypes.length > 0 ? Math.max(...rackTypes.map(r => r.power_need)) : 1;

  const getCellProps = (value: string | null): {
    className: string;
    style?: React.CSSProperties;
    label: string;
  } => {
    const label = value ? value.toUpperCase() : '·';

    if (!value) {
      return { className: 'rack-cell rack-empty w-10 h-8', label };
    }

    const typeKey = value.charAt(0).toUpperCase();

    if (viewMode === 'power') {
      const spec =
        rackTypes.find(r => r.name === value) ??
        rackTypes.find(r => r.type.charAt(0).toUpperCase() === typeKey);
      const intensity = (spec?.power_need ?? 0) / maxPower;
      const color = POWER_COLOR(intensity);
      return {
        className: 'rack-cell w-10 h-8',
        style: {
          backgroundColor: color.replace(')', ' / 0.15)').replace('hsl(', 'hsl('),
          color,
          border: `1px solid ${color.replace(')', ' / 0.40)').replace('hsl(', 'hsl(')}`,
          boxShadow: `0 0 10px ${color.replace(')', ' / 0.28)').replace('hsl(', 'hsl(')}`,
        },
        label,
      };
    }

    const classMap: Record<string, string> = {
      C: 'rack-compute',
      S: 'rack-storage',
      A: 'rack-ai',
    };

    return {
      className: `rack-cell w-10 h-8 ${classMap[typeKey] ?? 'rack-empty'}`,
      label,
    };
  };

  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  const isEmptyRow = (rowIndex: number) => grid[rowIndex].every(cell => cell === null);

  return (
    <div className="overflow-auto">
      {title && <h3 className="mb-4 text-lg font-semibold font-mono">{title}</h3>}

      {/* Column headers — offset by row-label width (w-9=36px) + gap-1 (4px) = 40px = ml-10 */}
      <div className="flex gap-1 mb-1 ml-10">
        {Array.from({ length: cols }, (_, c) => (
          <div key={c} className="w-10 text-center text-[9px] text-muted-foreground font-mono shrink-0">
            P{c}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="flex flex-col gap-1">
        {Array.from({ length: rows }, (_, rowIndex) => {
          if (isEmptyRow(rowIndex)) {
            return <div key={rowIndex} className="h-2" />;
          }

          return (
            <div key={rowIndex} className="flex items-center gap-1">
              {/* Row label */}
              <div className="w-9 text-right pr-1 text-[9px] text-muted-foreground font-mono shrink-0 select-none">
                R{rowIndex.toString().padStart(2, '0')}
              </div>

              {/* Cells */}
              {grid[rowIndex].map((cellValue, colIndex) => {
                const isChanged = highlightedCells?.has(`${rowIndex},${colIndex}`);
                const { className, style, label } = getCellProps(cellValue);

                return (
                  <button
                    key={colIndex}
                    className={`${className} ${isChanged ? 'rack-changed' : ''}`}
                    style={style}
                    onClick={() => onCellClick?.(rowIndex, colIndex)}
                    title={cellValue
                      ? `${cellValue} — R${rowIndex.toString().padStart(2, '0')} P${colIndex}`
                      : `Empty — R${rowIndex.toString().padStart(2, '0')} P${colIndex}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
