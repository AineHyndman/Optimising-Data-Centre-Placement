import json
from src.simulation.state import SuiteState
from dataclasses import dataclass
with open("src/utils/json/suite.json", "r") as f:
    suite_data = json.load(f)



@dataclass(frozen=True)
class Constraints:
    suite: SuiteState

    # All variables below are constants and not to be changed
    max_power_mw = float(suite_data.get("MaxPowerMW", 12.5))
    emergency_power_mw = float(suite_data.get("EmergencyPowerMW", 0.5))

    max_power_kw = max_power_mw * 1000
    emergency_power_kw = emergency_power_mw * 1000

    compute_min = int(suite_data.get("ComputeMinRSU"))
    compute_max = int(suite_data.get("ComputeMaxRSU"))
    storage_min = int(suite_data.get("StorageMinRSU"))
    storage_max = int(suite_data.get("StorageMaxRSU"))
    AI_min = int(suite_data.get("AIMinRSU"))
    AI_max = int(suite_data.get("AIMaxRSU"))

    """
    New Functions, migrating from Suite class
    """

    # Check current max allowed power (in kw)
    def allowed_power_kw(self) -> int:
        return self.max_power_kw + (self.emergency_power_kw if not self.suite.emergencyState.cooldown else 0)

    # Check if over current max allowed power
    def is_over_power_budget(self) -> bool:
        return self.suite.total_power_kw() > self.allowed_power_kw()

    # Check how much available power
    def available_power_kw(self) -> int:
        return self.allowed_power_kw() - self.suite.total_power_kw()
    
    
    # To check all input empty string "" or any other string
    def check_rsu_max(self, type: str):
        myDict = self.suite.get_rsu_per_service()
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
        myDict = self.suite.get_rsu_per_service()
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
    
    
