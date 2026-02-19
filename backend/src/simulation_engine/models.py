from dataclasses import dataclass, replace
from typing import Dict, List, Optional
from collections import Counter
from src.model.position import Position
from pydantic import BaseModel

RackId = str
Day = int

@dataclass(frozen=True)
class Rack:
    rack_id: RackId
    generation: str
    rack_type: str
    service: str
    year: int
    color: str

@dataclass(frozen=True)
class SuiteState:
    day: Day
    positions: Dict[Position, Rack | None]
    racks: Dict[RackId, Rack]

    def get_generation_counts(self):
        return Counter(r.generation for r in self.racks.values())

    def get_type_counts(self):
        return Counter(r.rack_type for r in self.racks.values())

    def get_empty_positions(self):
        return [p for p, r in self.positions.items() if r is None]

    def get_row_distribution(self):
        rows = Counter()
        for (row, _), rack in self.positions.items():
            if rack:
                rows[row] += 1
        return dict(rows)

    def get_2023_count(self):
        return sum(1 for r in self.racks.values() if r.year == 2023)

    def get_rsu_per_service(self):
        return Counter(r.service for r in self.racks.values())

class Range(BaseModel):
    min: float
    max: float

class Resources(BaseModel):
    compute: float
    storage: float
    ai: float

class Position(BaseModel):
    rack_type: str
    row: str
    position: str

class Constraints(BaseModel):
    power_budget: int
    compute_range: Range
    storage_range: Range
    ai_range: Range
    generations: List[str]
    generation_ratios: Optional[Dict[str,float]] = None

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
    compute: Optional[float] = None
    storage: Optional[float] = None
    ai: Optional[float] = None
    generation_distribution: Optional[Dict[str,int]] = None
    positions: List[Position]
    day: Optional[int] = None

class PlanData(BaseModel):
    constraints: Constraints
    rack_types: List[RackSpec]
    cluster_plans: List[SuitePlan]