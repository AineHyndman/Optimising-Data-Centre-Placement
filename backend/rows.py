import json
from typing import List, Optional

from rack import Rack  # adjust import path to match your repo


# Load rows.json once (same style as your teammate)
with open("rows.json", "r") as f:
    rows_data = json.load(f)

# Map RowId -> row dict for quick lookup
rows_by_id = {r["RowId"]: r for r in rows_data}


class Row:
    """
    A row has:
      - an id
      - 16 positions (each position is either None or a Rack)
    """
    NUM_POSITIONS = 16

    def __init__(self, row_id: str):
        self.id = row_id

        row = rows_by_id.get(row_id)
        if row is None:
            raise ValueError(f"Row '{row_id}' not found in rows.json")

        positions = row.get("Positions")
        if not isinstance(positions, list) or len(positions) != self.NUM_POSITIONS:
            raise ValueError(
                f"Row '{row_id}' must have exactly {self.NUM_POSITIONS} positions"
            )

        # Convert rack codes -> Rack objects (or None)
        self.racks: List[Optional[Rack]] = []
        for code in positions:
            if code is None:
                self.racks.append(None)
            else:
                self.racks.append(Rack(code))

    def total_power_kw(self) -> int:
        return sum(r.powerNeed for r in self.racks if r is not None)

    def rsu_by_type(self) -> dict:
        """
        Returns totals like:
          {"Compute": 10.2, "Storage": 5.1, "AI": 7.0}
        """
        totals = {"Compute": 0.0, "Storage": 0.0, "AI": 0.0}
        for r in self.racks:
            if r is None:
                continue
            # r.type is from your teammate's Rack model ("Compute"/"Storage"/"AI")
            totals[r.type] += r.capacity
        return totals

    def __repr__(self) -> str:
        codes = [r.code if r is not None else None for r in self.racks]
        return f"Row=(id={self.id}, total_power_kw={self.total_power_kw()}, positions={codes})"
