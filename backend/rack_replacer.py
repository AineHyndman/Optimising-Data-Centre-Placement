import json
from datetime import datetime, timezone
from typing import List, Optional
from position import Position
from RM import Rack

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

        self.history: List[dict] = []

    def is_valid_rack(self, rack: Optional[Rack]) -> bool:
        return rack is not None and rack.code in self.REPLACEMENT_MAP

    def replace_rack_at_position(
        self, position: Position, constraint_checker=None
    ):
        
        if self.racks_changed >= self.max_moves_per_day:
            return False  

        rack = position.getRack()
        if not self.is_valid_rack(rack):
            return False

        old_code = rack.code
        new_code = self.REPLACEMENT_MAP[old_code]

        new_rack = Rack(new_code)

        if constraint_checker:
            temp_position_rack = position.getRack()
            position.removeRack()
            position.addRack(new_rack)
            if not constraint_checker.is_valid():
                position.removeRack()
                position.addRack(temp_position_rack)
                return False

        else:
            position.removeRack()
            position.addRack(new_rack)

        self.racks_changed += 1
        self.net_RSU_change += new_rack.capacity - rack.capacity
        self.net_power_change += new_rack.powerNeed - rack.powerNeed

        self._record_change(position, old_code, new_code)

        return True

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

    def replace_multiple(self, positions: List[Position], constraint_checker=None):
        replaced = 0
        for pos in positions:
            if self.racks_changed >= self.max_moves_per_day:
                break
            if self.replace_rack_at_position(pos, constraint_checker):
                replaced += 1
        return replaced
