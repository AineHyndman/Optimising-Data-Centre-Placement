import json
from typing import List, Optional

from src.model.rack import Rack

with open("src/json/rows.json", "r") as f:
    rows_data = json.load(f)

# getting a row by its id
rows_by_id = {r["RowId"]: r for r in rows_data}


class Row:
    # position constraint
    NUM_POSITIONS = 16


    def __init__(self, row_id: str):
        self.id = row_id

        # finding a row by id, otherwise raise error
        row = rows_by_id.get(row_id)
        if row is None:
            raise ValueError(f"Row '{row_id}' not found in rows.json")

        # get position of the row, otherwise raise error
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

    # calculates the total power in kilowatts
    def total_power_kw(self) -> int:
        return sum(r.powerNeed for r in self.racks if r is not None)

    # groups the rsu by categories AI, Storage or Compute
    def rsu_by_type(self) -> dict:
        totals = {"Compute": 0.0, "Storage": 0.0, "AI": 0.0}
        for r in self.racks:
            if r is None or r.type == "Empty":
                continue
            totals[r.type] += r.capacity
        return totals

    # counts the number of empty spaces in the rows
    def rack_space(self) -> int:
        count = 0
        for r in self.racks:
            if r.empty == True:
                count += 1
        return count

    # represents the row model and its attributes
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
