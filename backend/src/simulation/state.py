from dataclasses import dataclass
from typing import Dict, Tuple
from src.model.rack import Rack
from src.model.position import Position

#Position = Tuple[int, int]
RackId = str
Day = int


"""
New dataclass, Migrating Emergency class to here
"""
@dataclass(frozen=True)
class EmergencyState:
    emergency_days: int = 0
    cool_days: int = 0
    active: bool = False
    cooldown: bool = False

    def available_days(self) -> int: # tested
        return 0 if self.cooldown else 7 - self.emergency_days

@dataclass(frozen=True)
class SuiteState:
    day: Day
    positions: Dict[Position, Rack | None]
    racks: Dict[RackId, Rack]
    emergencyState: EmergencyState = EmergencyState()
    