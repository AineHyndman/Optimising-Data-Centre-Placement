// frontend/src/types.ts

// 1. Helper Interfaces
export interface Range {
    min: number;
    max: number;
  }
  
  export interface Resources {
    compute: number;
    storage: number;
    ai: number;
  }
  
  export interface Position {
    rack_type: string;
    row: string;      // Keeping as string to match JSON "44"
    position: string; // Keeping as string to match JSON "1"
  }
  
  // 2. Main Components
  export interface Constraints {
    power_budget: number;
    compute_range: Range;
    storage_range: Range;
    ai_range: Range;
    generations: string[];
    generation_ratios?: Record<string, number>; // Optional dictionary
  }
  
  export interface RackSpec {
    name: string;
    type: string;
    color: string;
    generation: number;
    power_need: number;
    resources: Resources;
  }
  
  // "SuitePlan" matches the individual objects inside "cluster_plans"
  export interface SuitePlan {
    datacenter?: string;
    suite?: string;
    total_power_usage?: number;
    compute?: number;
    storage?: number;
    ai?: number;
    generation_distribution?: Record<string, number>;
    positions: Position[];
  }
  
  // 3. Root Object (Matches the whole JSON file)
  export interface ClusterPlan {
    constraints: Constraints;
    rack_types: RackSpec[];
    cluster_plans: SuitePlan[];
  }

  export interface RsuTotals {
    compute: number;
    storage: number;
    ai: number;
  }
  
  export interface WeeklySummaryData {
    week: number;
    racks_replaced: number;
    power_saved: number;
    total_power_usage: number;
    rsu_totals: RsuTotals;
  }