"""

I added a green rack replace option, find below

"""



import json
import random
from datetime import datetime, timezone
from typing import List, Optional
from src.model.position import Position
from src.model.rack import Rack
from src.simulation.state import SuiteState
from src.simulation.state import EmergencyState
from dataclasses import replace
from src.simulation.constraints import Constraints
from src.simulation.planners import choose_rack

class RackReplacer:
    
    REPLACEMENT_MAP = {
        "c23": "c25",
        "s23": "s25",
        "a23": "a25",
        "": ""
    }

    

    def __init__(self, max_moves_per_day: int = 32):
        self.day = -1 # day starts at -1 since call instantly increments day
        self.max_moves_per_day = max_moves_per_day

        self.racks_changed = 0
        self.net_RSU_change = 0.0
        self.net_power_change = 0.0

        """
        Added RSU change for each type as well
        """

        self.Compute_RSU_change = 0.0
        self.Storage_RSU_change = 0.0
        self.AI_RSU_change = 0.0

        self.history: List[dict] = []
    
    def __call__(self, state: SuiteState) -> SuiteState:
        # Added a day incrementer for the history
        self.day += 1
        constraint = Constraints(state)
        return self.replace_multiple(state, constraint)

    def is_valid_rack(self, rack: Optional[Rack]) -> bool:
        return rack is not None and rack.code in self.REPLACEMENT_MAP

    def replace_rack(self, state: SuiteState, pos: Position, constraint: Constraints):
        
        if self.racks_changed >= self.max_moves_per_day:
            return state

        rack = state.positions[pos]


        if rack is None or rack.code not in self.REPLACEMENT_MAP:
            return state
        

        old_code = rack.code
        old_rack = Rack(old_code)

        # Uses new choose_rack function from planners.py
        new_rack = choose_rack(state, rack, constraint)
        
        # If the same type is popped out, it just returns state
        if old_code == new_rack.code:
            return state
        

        if state.total_power_kw() + new_rack.powerNeed > constraint.allowed_power_kw():
            return state

        new_code = new_rack.code

        new_positions = dict(state.positions)
        new_racks = dict(state.racks)

        new_positions[pos] = new_rack
        new_racks[new_rack.code] = new_rack


        match new_rack.type:
            case "Compute":
                self.Compute_RSU_change += new_rack.capacity - old_rack.capacity
            case "Storage":
                self.Storage_RSU_change += new_rack.capacity - old_rack.capacity
            case "AI":
                self.AI_RSU_change += new_rack.capacity - old_rack.capacity

        self.racks_changed += 1
        self.net_power_change += new_rack.powerNeed - rack.powerNeed
        self.net_RSU_change += new_rack.capacity - rack.capacity
        self._record_change(pos,old_code,new_code)

        return replace(state, positions=new_positions, racks=new_racks)


    """
    Rack replacer which prioritises removing racks to go under emergency threshold, mostly just a copy of the one above
    """
    def emergency_replace_rack(self, state: SuiteState, pos: Position, constraint: Constraints):
        if self.racks_changed >= self.max_moves_per_day:
            return state

        rack = state.positions[pos]


        # Changed it so that it removes any rack
        if rack is None or rack.code == "":
            return state

        old_code = rack.code
        new_code = ""
        
        new_rack = Rack("")


        match rack.type:
            case "Compute":
                if state.get_rsu_per_service()["Compute"] - rack.capacity < constraint.compute_min:
                    return state
                self.Compute_RSU_change -= rack.capacity
            case "Storage":
                if state.get_rsu_per_service()["Storage"] - rack.capacity < constraint.storage_min:
                    return state
                self.Storage_RSU_change -= rack.capacity
            case "AI":
                if state.get_rsu_per_service()["AI"] - rack.capacity < constraint.AI_min:
                    return state
                self.AI_RSU_change -= rack.capacity

        new_positions = dict(state.positions)
        new_racks = dict(state.racks)

        new_positions[pos] = new_rack
        new_racks[new_rack.code] = new_rack

        self.racks_changed += 1
        self.net_power_change -= rack.powerNeed
        self.net_RSU_change -= rack.capacity
        self._record_change(pos,old_code,new_code)


        return replace(state, positions=new_positions, racks=new_racks)



    """
    Function which returns state with updated emergency class
    """
    def update_emergency(self, state: SuiteState, constraint: Constraints):
        emergency_days = state.emergencyState.emergency_days
        cooldown = state.emergencyState.cooldown
        active = state.emergencyState.active
        cool_days = state.emergencyState.cool_days

        """
        Might need to change this later if you want, currently it counts the first day of active as a day used
        If you want it to be other way around, just move the if statement below to below the "elif cooldown" statement
        """
        if state.total_power_kw() > constraint.max_power_kw:
            active = True
        else:
            pass


        if active and not cooldown:
            emergency_days = 1 + emergency_days
            if emergency_days == 7:
                cooldown = True
                active = False
                emergency_days = 0
        elif cooldown:
            cool_days = 1 + cool_days
            if cool_days >= 2:
                cool_days = 0
                cooldown = False
        
        return SuiteState(state.day, state.positions, state.racks, EmergencyState(emergency_days, cool_days, active, cooldown))




    def _record_change(self, position: Position, old_code: str, new_code: str):
        self.history.append({
            "ts": datetime.now(timezone.utc).isoformat(),
            "suite": position.suite,
            "row": position.row,
            "pos": position.position,
            "from": old_code,
            "to": new_code
        })

    def end_day_snapshot(self, day: int, suite_id: str, filepath: str = "history.jsonl"):
        if not self.history:
            return
        

        record = {
            "day": day,
            "suite_id": suite_id,
            "changes": self.history,
            "summary": {
                "racks_changed": self.racks_changed,
                "net_RSU_change": self.net_RSU_change,
                "net_power_change": self.net_power_change
            }
        }

        with open(filepath, "a", encoding="utf-8") as f:
            f.write(json.dumps(record) + "\n")

        # Reset counters for the next day
        self.history = []
        self.racks_changed = 0
        self.net_RSU_change = 0.0
        self.net_power_change = 0.0

        self.Compute_RSU_change = 0.0
        self.Storage_RSU_change = 0.0
        self.AI_RSU_change = 0.0

    def replace_multiple(self, state: SuiteState, constraint: Constraints) -> SuiteState:
        """
        Added a second version of the loop, one for regular and one for emergency power handling
        """
        if state.emergencyState.available_days() > 1 and not state.emergencyState.cooldown:
            for pos in state.positions.keys():
                if self.racks_changed >= self.max_moves_per_day:
                    break
                state = self.replace_rack(state, pos, constraint)
        else:
            for pos in state.positions.keys():
                if self.racks_changed >= self.max_moves_per_day:
                    break
                state = self.emergency_replace_rack(state, pos, constraint)


        # Added the history integration into this
        self.end_day_snapshot(self.day, "Suite-A")

        return self.update_emergency(state, constraint)


"""
Test below creates new suitestate, emergencystate and rackreplacer
Then it simulates a cycle/day
"""

"""
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

    print(testSuite.get_2023_count())
    print(testSuite.total_power_kw())
    print(testSuite.get_rsu_per_service())
    #print(testSuite.get_generation_counts())
    #print(testSuite.get_type_counts())
    #print(testSuite.get_empty_positions())
    #print(testSuite.get_row_distribution())


    rr = RackReplacer()

    newSuite = rr(testSuite)

    print(newSuite.get_2023_count())
    print(newSuite.total_power_kw())
    print(newSuite.get_rsu_per_service())
    

    newSuite = rr(newSuite)

    print(newSuite.get_2023_count())
    print(newSuite.total_power_kw())
    print(newSuite.get_rsu_per_service())

    newSuite = rr(newSuite)

    print(newSuite.get_2023_count())
    print(newSuite.total_power_kw())
    print(newSuite.get_rsu_per_service())

    newSuite = rr(newSuite)

    print(newSuite.get_2023_count())
    print(newSuite.total_power_kw())
    print(newSuite.get_rsu_per_service())











myTest()
"""