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
from src.simulation.planners import choose_rack, choose_rack_green

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

        self.finished = False
        self.stage = 1

        self.rsu_per_service: dict = {}

        """
        Added RSU change for each type as well
        """

        self.Compute_RSU_change = 0.0
        self.Storage_RSU_change = 0.0
        self.AI_RSU_change = 0.0

        self.history: List[dict] = []
    
    def __call__(self, state: SuiteState, green: bool = False) -> SuiteState:
        # Added a day incrementer for the history
        self.day += 1
        constraint = Constraints(state)
        # Making a dict for rsu per service instead of calling function each time
        self.rsu_per_service = state.get_rsu_per_service()
        return self.replace_multiple(state, constraint, green)

    def is_valid_rack(self, rack: Optional[Rack]) -> bool:
        return rack is not None and rack.code in self.REPLACEMENT_MAP

    def replace_rack(self, state: SuiteState, pos: Position, constraint: Constraints, green: bool = False):

        rack = state.positions[pos]

        if green == True and state.get_2023_count() == 0:
            if rack is None or rack.generation != 2025:
                return state
        elif rack is None or rack.generation != 2023:
            return state
        
        # Uses choose_rack function from planners.py
        if not green:
            new_rack = choose_rack(rack, constraint, self.rsu_per_service)
        else:
            new_rack = choose_rack_green(rack, constraint, self.rsu_per_service)

        # If new_rack returned "", that means nothing changed, return state
        if new_rack == "":
            return state

        old_code = rack.code
        old_rack = Rack(old_code)

        # If the same type is popped out, it just returns state
        if old_code == new_rack.code:
            return state
        

        if state.total_power_kw() + new_rack.powerNeed - rack.powerNeed > constraint.allowed_power_kw():
            return state

        new_code = new_rack.code

        new_positions = dict(state.positions)
        new_racks = dict(state.racks)

        new_positions[pos] = new_rack
        new_racks[new_rack.code] = new_rack


        match new_rack.type:
            case "Compute":
                self.Compute_RSU_change += new_rack.capacity
                self.rsu_per_service["Compute"] += new_rack.capacity
            case "Storage":
                self.Storage_RSU_change += new_rack.capacity
                self.rsu_per_service["Storage"] += new_rack.capacity
            case "AI":
                self.AI_RSU_change += new_rack.capacity
                self.rsu_per_service["AI"] += new_rack.capacity
        
        match old_rack.type:
            case "Compute":
                self.Compute_RSU_change -= old_rack.capacity
                self.rsu_per_service["Compute"] -= old_rack.capacity
            case "Storage":
                self.Storage_RSU_change -= old_rack.capacity
                self.rsu_per_service["Storage"] -= old_rack.capacity
            case "AI":
                self.AI_RSU_change -= old_rack.capacity
                self.rsu_per_service["AI"] -= old_rack.capacity
        

        self.racks_changed += 1
        self.net_power_change += new_rack.powerNeed - rack.powerNeed
        self.net_RSU_change += new_rack.capacity - rack.capacity
        self._record_change(pos,old_code,new_code)

        return replace(state, positions=new_positions, racks=new_racks)


    """
    Rack replacer which prioritises removing racks to go under emergency threshold, mostly just a copy of the one above
    """
    def emergency_replace_rack(self, state: SuiteState, pos: Position, constraint: Constraints):

        rack = state.positions[pos]

        # Changed it so that it removes any rack
        if rack is None or rack.code == "":
            return state

        old_code = rack.code
        new_code = ""
        
        new_rack = Rack("")

        match rack.type:
            case "Compute":
                if self.rsu_per_service["Compute"] - rack.capacity < constraint.compute_min:
                    return state
                self.Compute_RSU_change -= rack.capacity
                self.rsu_per_service["Compute"] -= rack.capacity

            case "Storage":
                if self.rsu_per_service["Storage"] - rack.capacity < constraint.storage_min:
                    return state
                self.Storage_RSU_change -= rack.capacity
                self.rsu_per_service["Storage"] -= rack.capacity
            case "AI":
                if self.rsu_per_service["AI"] - rack.capacity < constraint.AI_min:
                    return state
                self.AI_RSU_change -= rack.capacity
                self.rsu_per_service["AI"] -= rack.capacity

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
    Move rack, part of stage 2, moves racks from rows with higher power to ones with lower power, so energy is spread roughly evenly
    """
    def move_rack(self, state: SuiteState, oldPos: Position, constraint: Constraints):

        rack = state.positions[oldPos]

        if rack is None or rack.type == "Empty":
            return state
        
        ordered = state.get_ordered_rows()
        targetRow = ordered[0].row
        targetRackPos = ordered[0]

        if oldPos.row == targetRow:
            return state

        i = 1

        # Finds the first rack that is empty in the lowest power row
        while targetRackPos.row == targetRow:
            if (state.positions[targetRackPos].type == "Empty"):
                break
            if i >= len(ordered):
                return state  # no empty slot found in target row
            targetRackPos = ordered[i]
            i = i + 1
        
        source_power_after = state.get_row_power(oldPos.row) - rack.powerNeed
        target_power_after = state.get_row_power(targetRow) + rack.powerNeed

        if target_power_after >= source_power_after:
            return state
        
        empty_rack = Rack("")

        new_positions = dict(state.positions)
        new_racks = dict(state.racks)

        new_positions[targetRackPos] = rack
        new_racks[rack.code] = rack

        new_positions[oldPos] = empty_rack
        new_racks[empty_rack.code] = empty_rack

        self.racks_changed += 1
        self._record_change(oldPos, rack.code, "")
        self._record_change(targetRackPos, "", rack.code)

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

    def replace_multiple(self, state: SuiteState, constraint: Constraints, green: bool = False) -> SuiteState:
        """
        Added a second version of the loop, one for regular and one for emergency power handling

        Uses ordered rows
        """

        if self.finished == True:
            pass
        elif state.emergencyState.available_days() > 1 and not state.emergencyState.cooldown:
            # Chooses path based on stage now
            if self.stage == 1:
                for pos in state.positions.keys():
                    if self.racks_changed >= self.max_moves_per_day:
                        break
                    state = self.replace_rack(state, pos, constraint, green)
                if self.racks_changed == 0:
                    self.stage = 2
            else:
                for pos in state.positions.keys():
                    if self.racks_changed >= self.max_moves_per_day:
                        break
                    state = self.move_rack(state, pos, constraint)
                if self.racks_changed == 0:
                    self.finished = True

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
