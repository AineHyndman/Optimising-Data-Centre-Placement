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

        self.compute_min = int(suite_data.get("ComputeMinRSU"))
        self.compute_max = int(suite_data.get("ComputeMaxRSU"))
        self.storage_min = int(suite_data.get("StorageMinRSU"))
        self.storage_max = int(suite_data.get("StorageMaxRSU"))
        self.AI_min = int(suite_data.get("AIMinRSU"))
        self.AI_max = int(suite_data.get("AIMaxRSU"))



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
    


    def available_power_kw(self) -> int:
        return self.allowed_power_kw() - self.total_power_kw()
    
    def emergency_power_active(self) -> bool:
        if self.total_power_kw() > self.max_power_kw():
            self.emergencyEvent.active = True
            return True
        else:
            self.emergencyEvent.active = False
            return False
        # Checks if emergency power is active, if not will activate on True
    
    def check_empty_spaces(self) -> int:
        count = 0
        for myRow in self.rows:
            count = count + myRow.rack_space()
        return count
        # Returns number of empty racks

    # To check all input empty string "" or any other string
    def check_rsu_max(self, type: str):
        myDict = self.rsu_totals()
        if type == "AI":
            return round(self.AI_max - myDict[type], 2)
        elif type == "Storage":
            return round(self.storage_max - myDict[type], 2)
        elif type == "Compute":
            return round(self.compute_max - myDict[type], 2)
        else:
            myDict["AI"] = round(self.AI_max - myDict["AI"], 2)
            myDict["Storage"] = round(self.storage_max - myDict["Storage"], 2)
            myDict["Compute"] = round(self.compute_max - myDict["Compute"], 2)
            return myDict
        # Return an Int if type is correctly inputed
        # If a number is negative, it means you have gone over the limit,
        # otherwise you still have space until the max

    # To check all input empty string "" or any other string
    def check_rsu_min(self, type: str):
        myDict = self.rsu_totals()
        if type == "AI":
            return round(self.AI_min - myDict[type], 2)
        elif type == "Storage":
            return round(self.storage_min - myDict[type], 2)
        elif type == "Compute":
            return round(self.compute_min - myDict[type], 2)
        else:
            myDict["AI"] = round(self.AI_min - myDict["AI"], 2)
            myDict["Storage"] = round(self.storage_min - myDict["Storage"], 2)
            myDict["Compute"] = round(self.compute_min - myDict["Compute"], 2)
            return myDict
        # Return an Int if type is correctly inputed
        # If a number is negative, it means you have gone over the limit (of min),
        # otherwise you still have space until the min



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
    print("Test ")
    mine = Suite()
    
    print(mine.check_rsu_max(""))
    print(mine.check_rsu_min(""))
    print(mine.check_empty_spaces())
    
    print(mine.available_power_kw(), " ", mine.max_power_kw(), " ", mine.total_power_kw(), " ", mine.emergency_power_active())
    print(mine.emergencyEvent.available_days())
    mine.emergencyEvent.emergency()
    print(mine.emergencyEvent.available_days())
    mine.emergencyEvent.emergency()
    print(mine.emergencyEvent.available_days())
    mine.emergencyEvent.emergency()
    print(mine.emergencyEvent.available_days())
    mine.emergencyEvent.emergency()
    print(mine.emergencyEvent.available_days())
    mine.emergencyEvent.emergency()
    print(mine.emergencyEvent.available_days())
    mine.emergencyEvent.emergency()
    print(mine.emergencyEvent.available_days())
    mine.emergencyEvent.emergency()
    print(mine.emergencyEvent.available_days())
    # Will cause error on the next call of emergency, since there are no more available days
    #mine.emergencyEvent.emergency()
    #print(mine.emergencyEvent.available_days())


test()
"""