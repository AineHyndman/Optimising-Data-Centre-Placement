import json
from typing import List

from row import Row  # adjust import path to match your repo


with open("suite.json", "r") as f:
    suite_data = json.load(f)


class Suite:
    """
    A suite has:
      - list of rows
      - max power (12.5 MW)
      - emergency power (0.5 MW)
    """
    def __init__(self):
        self.id = suite_data.get("SuiteId", "UnknownSuite")
        self.max_power_mw = float(suite_data.get("MaxPowerMW", 12.5))
        self.emergency_power_mw = float(suite_data.get("EmergencyPowerMW", 0.5))

        row_ids = suite_data.get("Rows")
        if not isinstance(row_ids, list) or len(row_ids) == 0:
            raise ValueError("suite.json must contain a non-empty 'Rows' list")

        self.rows: List[Row] = [Row(rid) for rid in row_ids]

    def total_power_kw(self) -> int:
        return sum(row.total_power_kw() for row in self.rows)

    def max_power_kw(self) -> int:
        return int(self.max_power_mw * 1000)

    def emergency_power_kw(self) -> int:
        return int(self.emergency_power_mw * 1000)

    def allowed_power_kw(self) -> int:
        """Max + emergency headroom."""
        return self.max_power_kw() + self.emergency_power_kw()

    def is_over_power_budget(self) -> bool:
        return self.total_power_kw() > self.allowed_power_kw()

    def rsu_totals(self) -> dict:
        totals = {"Compute": 0.0, "Storage": 0.0, "AI": 0.0}
        for row in self.rows:
            row_totals = row.rsu_by_type()
            for k, v in row_totals.items():
                totals[k] += v
        return totals

    def __repr__(self) -> str:
        return (
            f"Suite=(id={self.id}, rows={len(self.rows)}, "
            f"total_power_kw={self.total_power_kw()}, "
            f"allowed_power_kw={self.allowed_power_kw()}, "
            f"rsu_totals={self.rsu_totals()})"
        )
