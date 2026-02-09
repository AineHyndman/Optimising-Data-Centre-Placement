// frontend/src/utils.ts
import type { ClusterPlan, Position } from './types';

// The grid size you requested
const ROWS = 48;
const COLS = 16;

// A single cell in our grid can either be empty (null) or have a rack type
export type GridCell = string | null; 
export type Grid = GridCell[][];

/**
 * Creates an empty 48x16 grid (2D array)
 */
export function createEmptyGrid(): Grid {
  // Create 48 rows, each having 16 nulls
  return Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
}

/**
 * Converts the flat list of positions into a 2D Grid
 * Handles uppercase codes (C23, A24, etc.)
 */
export function parsePositionsToGrid(positions: Position[]): Grid {
  const grid = createEmptyGrid();

  positions.forEach((pos) => {
    // Parse strings "44" -> 44
    const rowIdx = parseInt(pos.row, 10);
    const colIdx = parseInt(pos.position, 10);

    // Validate if it fits in our 48x16 datacenter
    // Note: Data rows are 1-based, array indices are 0-based
    if (rowIdx >= 1 && rowIdx <= ROWS && colIdx >= 1 && colIdx <= COLS) {
      grid[rowIdx - 1][colIdx - 1] = pos.rack_type.toUpperCase(); // Force Uppercase
    }
  });

  return grid;
}

/**
 * Validates if the uploaded JSON is a valid Cluster Plan
 */
export function validatePlan(data: unknown): data is ClusterPlan {
  if (!data || typeof data !== 'object') {
    throw new Error("Invalid JSON: Data is not an object");
  }

  const obj = data as Record<string, unknown>;
  if (!obj.constraints || !obj.rack_types || !obj.cluster_plans) {
    throw new Error("Invalid JSON: Missing main sections (constraints, rack_types, or cluster_plans)");
  }
  return true;
}