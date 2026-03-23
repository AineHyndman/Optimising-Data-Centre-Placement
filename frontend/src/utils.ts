import type { Position, GridPosition, Constraints, SuitePlan, RackSpec } from './types';

const ROWS = 48;
const COLS = 16;

export type Grid = (string | null)[][];

export function createEmptyGrid(): Grid {
  return Array.from({ length: ROWS }, () => Array<string | null>(COLS).fill(null));
}

export function parsePositionsToGrid(positions: Position[]): Grid {
  const grid = createEmptyGrid();
  positions.forEach((pos) => {
    const rowIdx = parseInt(pos.row, 10);
    const colIdx = parseInt(pos.position.replace('P', ''), 10); 
    if (rowIdx >= 1 && rowIdx <= ROWS && colIdx >= 1 && colIdx <= COLS) {
      grid[rowIdx - 1][colIdx - 1] = pos.rack_type ? pos.rack_type.toUpperCase() : null; 
    }
  });
  return grid;
}

// For positions returned by the simulation engine (1-indexed, matching the uploaded JSON format)
export function simPositionsToGrid(positions: GridPosition[]): Grid {
  const grid = createEmptyGrid();
  positions.forEach((pos) => {
    const rowIdx = pos.row - 1;
    const colIdx = pos.position - 1;
    if (rowIdx >= 0 && rowIdx < ROWS && colIdx >= 0 && colIdx < COLS) {
      grid[rowIdx][colIdx] = pos.rack_type ? pos.rack_type.toUpperCase() : null;
    }
  });
  return grid;
}

export function powerToColor(intensity: number): string {
  if (intensity <= 0.4) return 'bg-[#4CAF50] text-black'; 
  if (intensity <= 0.7) return 'bg-[#FFEB3B] text-black'; 
  if (intensity <= 0.9) return 'bg-[#FF9800] text-black'; 
  if (intensity <= 1.0) return 'bg-[#F44336] text-white'; 
  return 'bg-[#B71C1C] text-white'; 
}

// THIS IS THE LOGIC FUNCTION, NOT THE SIDEBAR COMPONENT
export function computeViolations(suite: SuitePlan, constraints: Constraints, rackTypes: RackSpec[] = []): string[] {
  const violations: string[] = [];
  let compute = 0, storage = 0, ai = 0, calculatedPower = 0;

  suite.positions.forEach(pos => {
    if (!pos.rack_type) return;
    if (pos.rack_type.startsWith('C')) compute++;
    if (pos.rack_type.startsWith('S')) storage++;
    if (pos.rack_type.startsWith('A')) ai++;

    const typeSpec = rackTypes.find(rt => rt.name === pos.rack_type);
    if (typeSpec) calculatedPower += typeSpec.power_need;
  });

  const actualCompute = suite.compute ?? compute;
  const actualStorage = suite.storage ?? storage;
  const actualAi = suite.ai ?? ai;
  const actualPower = (suite.total_power_usage && suite.total_power_usage > 0) ? suite.total_power_usage : calculatedPower;

  if (actualCompute < constraints.compute_range.min) violations.push(`Compute RSU ${actualCompute.toFixed(1)} < ${constraints.compute_range.min}`);
  if (actualCompute > constraints.compute_range.max) violations.push(`Compute RSU ${actualCompute.toFixed(1)} > ${constraints.compute_range.max}`);
  if (actualStorage < constraints.storage_range.min) violations.push(`Storage RSU ${actualStorage.toFixed(1)} < ${constraints.storage_range.min}`);
  if (actualStorage > constraints.storage_range.max) violations.push(`Storage RSU ${actualStorage.toFixed(1)} > ${constraints.storage_range.max}`);
  if (actualAi < constraints.ai_range.min) violations.push(`AI RSU ${actualAi.toFixed(1)} < ${constraints.ai_range.min}`);
  if (actualAi > constraints.ai_range.max) violations.push(`AI RSU ${actualAi.toFixed(1)} > ${constraints.ai_range.max}`);
  if (actualPower > constraints.power_budget) violations.push(`Power ${Math.round(actualPower)} kW > budget ${constraints.power_budget} kW`);
  return violations;
}