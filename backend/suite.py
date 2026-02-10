import json
from typing import List

from rows import Row  
from powerConstraintChecker import emergencyPower


with open("suite.json", "r") as f:
    suite_data = json.load(f)


class Suite:
    
    def __init__(self):
        self.id = suite_data.get("SuiteId", "UnknownSuite")
        self.max_power_mw = float(suite_data.get("MaxPowerMW", 12.5))
        self.emergency_power_mw = float(suite_data.get("EmergencyPowerMW", 0.5))

        # Emergency Power object
        self.emergencyEvent = emergencyPower()

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
        return self.max_power_kw() + self.emergency_power_kw()

    def is_over_power_budget(self) -> bool:
        return self.total_power_kw() > self.allowed_power_kw()
    


    # Check Suite
    def available_power_kw(self) -> int:
        return self.allowed_power_kw() - self.total_power_kw()
        # Returns in kw
    
    def emergency_power_active(self) -> bool:
        return self.total_power_kw() > self.max_power_kw()
        # Checks if emergency power is active, if not will activate on True
    
    # Will properly implement the function below when the basic simulation will be complete
    def emergency(self):
        if self.emergency_power_active():
            self.emergencyEvent.new_day()
        else:
            self.emergencyEvent.days = 0
        

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

"""
def test():
    print("Test")
    mine = Suite()
    print(mine.available_power_kw(), " ", mine.max_power_kw(), " ", mine.total_power_kw(), " ", mine.emergency_power_active())
    print(mine.emergencyEvent.available_days())
    mine.emergency()
    print(mine.emergencyEvent.available_days())
    mine.emergency()
    print(mine.emergencyEvent.available_days())
    mine.emergency()
    print(mine.emergencyEvent.available_days())
    mine.emergency()
    print(mine.emergencyEvent.available_days())
    mine.emergency()
    print(mine.emergencyEvent.available_days())
    mine.emergency()
    print(mine.emergencyEvent.available_days())
    mine.emergency()
    print(mine.emergencyEvent.available_days())
    # Will cause error on the next call of emergency, since there are no more available days
    #mine.emergency()
    #print(mine.emergencyEvent.available_days())


test()
"""