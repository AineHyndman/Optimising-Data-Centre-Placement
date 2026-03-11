import json


from collections import Counter
from dataclasses import dataclass, replace
from typing import Dict, Tuple
from src.model.rack import Rack
from src.model.position import Position

#Position = Tuple[int, int]
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

    def available_days(self) -> int: # tested
        return 0 if self.cooldown else 7 - self.emergency_days

@dataclass(frozen=True)
class SuiteState:
    day: Day
    positions: Dict[Position, Rack | None]
    racks: Dict[RackId, Rack]
    emergencyState: EmergencyState = EmergencyState()

    # get the count of the rack generations
    def get_generation_counts(self): # tested
        return Counter(r.generation for r in self.positions.values() if r.generation != 0)

    # get the count of the rack types
    def get_type_counts(self): # tested
        return Counter(r.type for r in self.positions.values())

    # get the sum of the empty rack positions
    def get_empty_positions(self): # tested
        return sum(1 for r in self.positions.values() if r.generation is None)

    """
    Below uses int for key instead of the string, like it is int rows.json, might change later if needed
    """
    def get_row_distribution(self): # tested
        return Counter(pos.row for pos in self.positions if self.positions[pos].generation is not None)


    # counts all 2023 racks
    def get_2023_count(self): # tested
        return sum(1 for r in self.positions.values() if r.generation == 2023)

    # gets the rsu per service
    def get_rsu_per_service(self): # tested
        temp = {}
        for r in self.positions.values():
            temp[r.type] = round(temp.get(r.type, 0) + r.capacity, 2)
        return dict(temp)
    
    """
    New Functions, migrating from Suite class
    """

    # gets the sum of the total power in kilowatts
    def total_power_kw(self) -> int: # tested
        return sum(r.powerNeed for r in self.positions.values())
    

"""
Added suite for testing which uses an alternate version of the Suite
"""
def test_suite() -> SuiteState:
    x = 0
    y = 0
    with open("src/utils/json/rows.json") as f:
        rows_data = json.load(f)
    with open("src/utils/json/testSuite.json") as f:
        suite_data = json.load(f)
    row_ids = suite_data.get("Rows")
    testPos = {}
    testRack = {}
    #print(row_ids)

    for row in rows_data:
        x = 0
        for rack in row["Positions"]:
            testRack[rack] = Rack(rack)
            my_tuple = (x, y)
            testPos[Position(suite=0, row=y, position=x)] = testRack[rack]
            x += 1
        y += 1


    testEmergency = EmergencyState()
    testSuite = SuiteState(0, testPos, testRack, testEmergency)

    return testSuite


"""
#just a test, uncomment if you want to test it
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
            my_tuple = (x, y)
            testPos[Position(suite=0, row=y, position=x)] = testRack[rack]
            x += 1
        y += 1


    testEmergency = EmergencyState()
    testSuite = SuiteState(0, testPos, testRack, testEmergency)

    # Testing all functions in suitestate
    print(testSuite.get_2023_count())
    print(testSuite.total_power_kw())
    print(testSuite.get_rsu_per_service())
    print(testSuite.get_generation_counts())
    print(testSuite.get_type_counts())
    print(testSuite.get_empty_positions())
    print(testSuite.get_row_distribution())

    # Testing EmergencyState
    print(testEmergency.available_days())




myTest()
"""