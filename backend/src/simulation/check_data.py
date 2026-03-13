import json
from src.simulation.state import SuiteState


class CheckData:
    def __init__(self):
        self.filepath: str = "history.jsonl"
        self.net_power_change: int = 0
        self.net_RSU_change: int = 0
        self.net_racks_changed: int = 0
    
    def check_week(self, week: int, current_day: int) -> dict:
        self.net_power_change = 0
        self.net_RSU_change = 0
        self.net_racks_changed = 0

        start = week * 7

        if start > current_day:
            return {}
        
        end = start + 7
        if start > current_day:
            end = current_day

        with open(self.filepath, "r", encoding="utf-8") as f:
            for i, line in enumerate(f):
                if i >= start and i < end:
                    myLine = json.loads(line)
                    summary = myLine["summary"]
                    self.net_power_change += summary["net_power_change"]
                    self.net_RSU_change += summary["net_RSU_change"]
                    self.net_racks_changed += summary["racks_changed"]
                if i >= end:
                    break
        
        myDict = {}

        myDict["net_power_change"] = self.net_power_change
        myDict["net_RSU_change"] = self.net_RSU_change
        myDict["net_racks_changed"] = self.net_racks_changed

        return myDict

"""
def test():
    myCheckData = CheckData()

    print(myCheckData.check_week(0, 13))


test()
"""