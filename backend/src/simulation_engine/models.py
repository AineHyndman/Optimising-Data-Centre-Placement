from dataclasses import dataclass, replace
from typing import Dict, Tuple
from collections import Counter
from src.model.position import Position

RackId = str
Day = int


@dataclass(frozen=True)
class Rack:
    rack_id: RackId
    generation: str
    rack_type: str
    service: str
    year: int


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


