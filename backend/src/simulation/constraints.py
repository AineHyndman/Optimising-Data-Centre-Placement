from src.simulation.state import SuiteState
with open("src/json/suite.json", "r") as f:
    suite_data = json.load(f)

class Constraints:
    def __init__(self, suite: SuiteState):
        self.suite = suite
        self.max_power_mw = float(suite_data.get("MaxPowerMW", 12.5))
        self.emergency_power_mw = float(suite_data.get("EmergencyPowerMW", 0.5))

        self.max_power_kw = self.max_power_mw * 1000
        self.emergency_power_kw = self.emergency_power_kw * 1000

        self.compute_min = int(suite_data.get("ComputeMinRSU"))
        self.compute_max = int(suite_data.get("ComputeMaxRSU"))
        self.storage_min = int(suite_data.get("StorageMinRSU"))
        self.storage_max = int(suite_data.get("StorageMaxRSU"))
        self.AI_min = int(suite_data.get("AIMinRSU"))
        self.AI_max = int(suite_data.get("AIMaxRSU"))
    
    # Check current max allowed power (in kw)
    def allowed_power_kw(self) -> int:
        return self.max_power_kw() + (self.emergency_power_kw() if not self.emergencyState.cooldown else 0)

    # Check if over current max allowed power
    def is_over_power_budget(self) -> bool:
        return self.total_power_kw() > self.allowed_power_kw()

    # Check how much available power
    def available_power_kw(self) -> int:
        return self.allowed_power_kw() - self.total_power_kw()
    
    
