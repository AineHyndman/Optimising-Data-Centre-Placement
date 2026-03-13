# Standard library imports
from dataclasses import dataclass, replace
from typing import Dict, List, Optional
from collections import Counter
# Project-specific import representing a physical rack position
from src.model.position import Position
# Pydantic is used for data validation and serialization
from pydantic import BaseModel

# Type aliases for clarity and readability
RackId = str    # Unique identifier for a rack
Day = int       # Simulation or planning day index


# Represents an immutable rack with its physical and logical properties
@dataclass(frozen=True)
class Rack:
    rack_id: RackId     # Unique rack identifier
    generation: str     # Hardware generation (e.g., gen1, gen2)
    rack_type: str      # Type/category of rack
    service: str        # Service the rack is assigned to
    year: int           # Manufacturing or deployment year          
    color: str          # Visual or logical grouping indicator


# Represents the state of a suite on a given day
# Contains rack placements and rack metadata
@dataclass(frozen=True)
class SuiteState:
    day: Day                                # Current day in the simulation
    positions: Dict[Position, Rack | None]  # Mapping of positions to racks (or empty)
    racks: Dict[RackId, Rack]               # All racks indexed by rack_id

    # Returns a count of racks per hardware generation
    def get_generation_counts(self):
        return Counter(r.generation for r in self.racks.values())

    # Returns a count of racks per rack type
    def get_type_counts(self):
        return Counter(r.rack_type for r in self.racks.values())

    # Returns all positions that currently have no rack assigned
    def get_empty_positions(self):
        return [p for p, r in self.positions.items() if r is None]

    # Returns the distribution of racks per row
    def get_row_distribution(self):
        rows = Counter()
        for (row, _), rack in self.positions.items():
            if rack:
                rows[row] += 1
        return dict(rows)

    # Counts how many racks are from the year 2023
    def get_2023_count(self):
        return sum(1 for r in self.racks.values() if r.year == 2023)

    # Returns rack unit counts grouped by service
    def get_rsu_per_service(self):
        return Counter(r.service for r in self.racks.values())

# Generic numeric range model used for constraints
class Range(BaseModel):
    min: float  # Minimum allowed value
    max: float  # Maximum allowed value

# Represents resource capacities or requirements
class Resources(BaseModel):
    compute: float  # Compute capacity (e.g., CPU/GPU units)
    storage: float  # Storage capacity
    ai: float       # AI-specific capacity

# Represents a physical or logical rack position in the suite
class Position(BaseModel):
    rack_type: str  # Type of rack allowed at this position
    row: str        # Row identifier
    position: str   # Position identifier within the row    

# Defines planning constraints for a suite
class Constraints(BaseModel):
    power_budget: int                          # Maximum allowed power usage
    compute_range: Range                      # Allowed compute capacity range
    storage_range: Range                      # Allowed storage capacity range
    ai_range: Range                           # Allowed AI capacity range
    generations: List[str]                    # Allowed rack generations
    generation_ratios: Optional[Dict[str,float]] = None
    # Optional ratio constraints per generation


# Defines the specification of a rack type 
class RackSpec(BaseModel):
    name: str               # Rack name or identifier 
    type: str               # Rack category/type 
    color: str              # Visual or logical grouping colour 
    generation: int         # Hardware generation
    power_need: int         # Power consumption of the rack 
    resources: Resources    # resources provided by the rack 


# Represents a complete plan for a suite 
class SuitePlan(BaseModel):
    datacenter: Optional[str] = None                           # Data centre indentifier 
    suite: Optional[str] = None                                # Suite identifier
    total_power_usage: Optional[float] = None                  # total power consumption
    compute: Optional[float] = None                            # total compute capacity 
    storage: Optional[float] = None                            # total storage capacity 
    ai: Optional[float] = None                                 # total ai capacity 
    generation_distribution: Optional[Dict[str,int]] = None
    positions: List[Position]                                  # planned rack placement
    day: Optional[int] = None                                  # planning day


#top-level model aggregating all planning inputs
class PlanData(BaseModel):
    constraints: Constraints        # global constraints for the plan 
    rack_types: List[RackSpec]      # avaliable rack specifications
    cluster_plans: List[SuitePlan]  #planned suites/clusters