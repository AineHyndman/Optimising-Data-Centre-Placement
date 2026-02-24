"""

I switched the old rack type to the new one

"""



import json
from datetime import datetime, timezone
from typing import List, Optional
from src.model.position import Position
from src.model.rack import Rack
from src.simulation.models import SuiteState
from dataclasses import replace
from src.simulation.constraints import Constraints

class RackReplacer:
    
    REPLACEMENT_MAP = {
        "c23": "c25",
        "s23": "s25",
        "a23": "a25"
    }

    

    def __init__(self, max_moves_per_day: int = 32):
        self.max_moves_per_day = max_moves_per_day

        self.racks_changed = 0
        self.net_RSU_change = 0.0
        self.net_power_change = 0.0

        """
        Added RSU change for each type as well
        """

        self.Compute_RSU_change = 0.0
        self.Storage_RSU_change = 0.0
        self.AI_RSU_change = 0.0

        self.history: List[dict] = []
    
    def __call__(self, state: SuiteState) -> SuiteState:
        return self.replace_multiple(state)

    def is_valid_rack(self, rack: Optional[Rack]) -> bool:
        return rack is not None and rack.code in self.REPLACEMENT_MAP

    def replace_rack(self, state: SuiteState, pos: Position, constraint: Constraints):
        
        if self.racks_changed >= self.max_moves_per_day:
            return state

        rack = state.positions[pos]

        if rack is None or rack.code not in self.REPLACEMENT_MAP:
            return state

        old_code = rack.code
        new_code = self.REPLACEMENT_MAP[old_code]

        # NEW
        new_rack = Rack(new_code)

        if state.total_power_kw() + self.net_power_change + new_rack.powerNeed > constraint.allowed_power_kw:
            return state

        match new_rack.type:
            case "Compute":
                if state.get_rsu_per_service()["Compute"] + self.Compute_RSU_change + new_rack.capacity > constraint.compute_max:
                    return state
                self.Compute_RSU_change += new_rack.capacity
            case "Storage":
                if state.get_rsu_per_service()["Storage"] + self.Storage_RSU_change + new_rack.capacity > constraint.storage_max:
                    return state
                self.Storage_RSU_change += new_rack.capacity
            case "AI":
                if state.get_rsu_per_service()["AI"] + self.AI_RSU_change + new_rack.capacity > constraint.AI_max:
                    return state
                self.AI_RSU_change += new_rack.capacity

        new_positions = dict(state.positions)
        new_racks = dict(state.racks)

        new_positions[pos] = new_rack
        new_racks[rack.code] = new_rack

        self.racks_changed += 1
        self.net_power_change += new_rack.powerNeed
        self.net_RSU_change += new_rack.capacity
        self._record_change(pos,old_code,new_code)

        return replace(state, positions=new_positions, racks=new_racks)


    """
    Rack replacer which prioritises removing racks to go under emergency threshold
    """
    def emergency_replace_rack(self, state: SuiteState, pos: Position, constraint: Constraints) {
        if self.racks_changed >= self.max_moves_per_day:
            return state

        rack = state.positions[pos]

        if rack is None or rack.code not in self.REPLACEMENT_MAP:
            return state
        
        new_rack = Rack("")

        return replace(state, positions=new_positions, racks=new_racks)
    }


    def _record_change(self, position: Position, old_code: str, new_code: str):
        self.history.append({
            "ts": datetime.now(timezone.utc).isoformat(),
            "suite": position.suite,
            "row": position.row,
            "pos": position.position,
            "from": old_code,
            "to": new_code
        })

    def end_day_snapshot(self, day: int, suite_id: str, filepath: str = "history.jsonl"):
        if not self.history:
            return

        record = {
            "day": day,
            "suite_id": suite_id,
            "changes": self.history,
            "summary": {
                "racks_changed": self.racks_changed,
                "net_RSU_change": self.net_RSU_change,
                "net_power_change": self.net_power_change
            }
        }

        with open(filepath, "a", encoding="utf-8") as f:
            f.write(json.dumps(record) + "\n")

        # Reset counters for the next day
        self.history = []
        self.racks_changed = 0
        self.net_RSU_change = 0.0
        self.net_power_change = 0.0

    def replace_multiple(self, state: SuiteState, constraint: Constraints) -> SuiteState:
        for pos in state.positions.keys():
            if self.racks_changed >= self.max_moves_per_day:
                break
            state = self.replace_rack(state, pos, constraint)

        return state
