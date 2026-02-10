from typing import Dict, List, Optional

from pydantic import BaseModel

# --- Helper Models ---
class Range(BaseModel):
    min: float  # Changed from int to float
    max: float  # Changed from int to float

class Resources(BaseModel):
    compute: float  # Changed from int to float
    storage: float  # Changed from int to float
    ai: float       # Changed from int to float

class Position(BaseModel):
    rack_type: str
    row: str
    position: str

# --- Main Component Models ---
class Constraints(BaseModel):
    power_budget: int
    compute_range: Range
    storage_range: Range
    ai_range: Range
    generations: List[str]
    generation_ratios: Optional[Dict[str, float]] = None

class RackSpec(BaseModel):
    name: str
    type: str
    color: str
    generation: int
    power_need: int
    resources: Resources

class SuitePlan(BaseModel):
    datacenter: Optional[str] = None
    suite: Optional[str] = None
    total_power_usage: Optional[float] = None
    compute: Optional[float] = None  # Changed to float
    storage: Optional[float] = None  # Changed to float
    ai: Optional[float] = None       # Changed to float
    generation_distribution: Optional[Dict[str, int]] = None
    positions: List[Position]

# --- The Root Model (This is what main.py is looking for) ---
class PlanData(BaseModel):
    constraints: Constraints
    rack_types: List[RackSpec]
    cluster_plans: List[SuitePlan]