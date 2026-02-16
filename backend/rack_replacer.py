import json
from datetime import datetime, timezone

from position import Position
from RM import Rack


class rack_replacer:
    max_racks_to_replace = 32
    racks_changed = 0
    net_RSU_change = 0
    net_power_change = 0

    def __init__(self, constraints, power, capacity):
        self.constraints = constraints
        self.power = power
        self.capacity = capacity

        self.history = []

    def identify_suitable_rack_position(self, position: Position):
        pass

    def replace_racks(self, position: Position):
        if self.racks_changed >= self.max_racks_to_replace:
            return

        rack_type = position.rack
        if rack_type is None:
            print(f"No rack at position {position.__repr__}")
            return

        old_code = rack_type.code
        if not self.is_valid_rack(rack_type):
            return

        if old_code == "c23":
            new_code = "c25"
            self.net_RSU_change += 1.8
            self.net_power_change += 8
        elif old_code == "s23":
            new_code = "s25"
            self.net_RSU_change += 0.4
            self.net_power_change += 4
        else:  # a23
            new_code = "a25"
            self.net_RSU_change += 3.2
            self.net_power_change += 33

        # do swap
        position.removeRack()
        position.addRack(Rack(new_code))

        self.racks_changed += 1
        self._record_change(position, old_code, new_code)

    def is_valid_rack(self, rack: Rack):
        return rack.code in ("c23", "s23", "a23")

    def _record_change(self, position: Position, old_code: str, new_code: str):

        self.history.append(
            {
                "ts": datetime.now(timezone.utc).isoformat(),
                "suite": getattr(position, "suite_id", None),
                "row": getattr(position, "row_id", None),
                "pos": getattr(position, "pos", None),
                "from": old_code,
                "to": new_code,
            }
        )

    def end_day_snapshot(
        self, day: int, suite_id: str, filepath: str = "history.jsonl"
    ):

        record = {
            "day": day,
            "suite_id": suite_id,
            "changes": self.history,
            "summary": {
                "racks_changed": self.racks_changed,
                "net_RSU_change": self.net_RSU_change,
                "net_power_change": self.net_power_change,
            },
        }
        with open(filepath, "a", encoding="utf-8") as f:
            f.write(json.dumps(record) + "\n")

        self.history = []
        self.racks_changed = 0
        self.net_RSU_change = 0.0
        self.net_power_change = 0.0
