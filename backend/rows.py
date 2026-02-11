import json
from typing import List, Optional

from RM import Rack 


with open("rows.json", "r") as f:
    rows_data = json.load(f)


rows_by_id = {r["RowId"]: r for r in rows_data}


class Row:
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

        self.racks: List[Optional[Rack]] = []
        for code in positions:
            if code is None:
                self.racks.append(None)
            else:
                self.racks.append(Rack(code))

    def total_power_kw(self) -> int:
        return sum(r.powerNeed for r in self.racks if r is not None)

    def rsu_by_type(self) -> dict:
        totals = {"Compute": 0.0, "Storage": 0.0, "AI": 0.0}
        for r in self.racks:
            if r is None:
                continue
            totals[r.type] += r.capacity
        return totals

    def rack_space(self) -> int:
        count = 0
        for r in self.racks:
            if r.empty == True:
                count += 1
        return count


    def __repr__(self) -> str:
        codes = [r.code if r is not None else None for r in self.racks]
        return (
            f"Row=(id={self.id}, "
            f"total_power_kw={self.total_power_kw()}, "
            f"positions={codes})"
        )

"""
def test():
    myRow = Row("R01")
    print("Test")
    print(myRow)
    print(myRow.rack_space())

test()
"""