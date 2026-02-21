import json


from collections import Counter
from dataclasses import dataclass, replace
from typing import Dict, Tuple
from src.model.rack import Rack

Position = Tuple[int, int]
RackId = str
Day = int


"""
New dataclass, Migrating Emergency class to here
"""
@dataclass(frozen=True)
class EmergencyState:
    emergency_days: int = 0
    cool_days: int = 0
    active: bool = False
    cooldown: bool = False

    def available_days(self) -> int:
        return 0 if self.cooldown else 7 - self.days



@dataclass(frozen=True)
class SuiteState:
    day: Day
    positions: Dict[Position, Rack | None]
    racks: Dict[RackId, Rack]
    emergencyState: EmergencyState()

    def get_generation_counts(self):
        return Counter(r.generation for r in self.racks.values())

    def get_type_counts(self):
        return Counter(r.rack_type for r in self.racks.values())

    def get_empty_positions(self):
        return [p for p, r in self.positions.items() if r is None]

    def get_row_distribution(self):
        rows = Counter()
        for (row, _), rack in self.positions.items():
            if rack:
                rows[row] += 1
        return dict(rows)

    def get_2023_count(self):
        return sum(1 for r in self.positions.values() if r.generation == 2023)

    def get_rsu_per_service(self):
        temp = {}
        for r in self.positions.values():
            temp[r.type] = round(temp.get(r.type, 0) + r.capacity, 2)
        return temp
    
    """
    New Functions, migrating from Suite class
    """
    def test(self):
        for rack in self.racks.values():
            print(rack)

    def total_power_kw(self) -> int:
        return sum(r.powerNeed for r in self.positions.values())
    


#just a test
def myTest():
    x = 0
    y = 0
    with open("src/utils/json/rows.json") as f:
        rows_data = json.load(f)
    with open("src/utils/json/suite.json") as f:
        suite_data = json.load(f)
    row_ids = suite_data.get("Rows")
    testPos = {}
    testRack = {}
    #print(row_ids)

    for row in rows_data:
        x = 0
        for rack in row["Positions"]:
            testRack[rack] = Rack(rack)
            #print(testRack[rack])
            my_tuple = (x, y)
            testPos[my_tuple] = testRack[rack]
            x += 1
        y += 1

    #print(testPos)

    testEmergency = EmergencyState()
    testSuite = SuiteState(0, testPos, testRack, testEmergency)

    #testSuite.test()
    print(testSuite.get_2023_count())
    print(testSuite.total_power_kw())
    print(testSuite.get_rsu_per_service())



myTest()