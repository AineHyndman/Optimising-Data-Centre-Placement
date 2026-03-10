from typing import List
import sys

from src.model.rack import Rack
from src.simulation.state import SuiteState
from src.simulation.constraints import Constraints

from typing import Tuple


def choose_rack(state: SuiteState, old_rack: Rack, constraint: Constraints):

    """
    IMPORTANT: Chooses the rack with the lowest rsu ratio
    """
    new_rack = ""
    temp = get_rsu_ratio(state, constraint)
    lowest = temp["c25"]
    for key in temp.keys():
        if temp[key] <= lowest:
            lowest = temp[key]
            new_rack = Rack(key)


    """
    checks which type we are dealing with and makes sure no constraints are broken

    Changed it so that if it reachest the max rsu for the service it just removes the 2023 Rack
    This makes it possible to add more new racks
    """
    match new_rack.type:
        case "Compute":
            if state.get_rsu_per_service()["Compute"] + new_rack.capacity - old_rack.capacity > constraint.compute_max:
                return(Rack(""))
        case "Storage":
            if state.get_rsu_per_service()["Storage"] + new_rack.capacity - old_rack.capacity > constraint.storage_max:
                return(Rack(""))
        case "AI":
            if state.get_rsu_per_service()["AI"] + new_rack.capacity - old_rack.capacity > constraint.AI_max:
                return(Rack(""))
    
    return new_rack


# Gets the ratio of the rsu
def get_rsu_ratio(state: SuiteState, constraint: Constraints):
    temp = {}
    temp["c25"] = (state.get_rsu_per_service()["Compute"] - constraint.compute_min) / (constraint.compute_max - constraint.compute_min) 
    temp["s25"] = (state.get_rsu_per_service()["Storage"] - constraint.storage_min) / (constraint.storage_max - constraint.storage_min)
    temp["a25"] = (state.get_rsu_per_service()["AI"] - constraint.AI_min) / (constraint.AI_max - constraint.AI_min)
    return temp





##def replace_rack(state: SuiteState, position: Tuple[int,int], new_rack: Rack) -> SuiteState:
##    positions = state.positions.copy()
##    racks = state.racks.copy()
##
##    positions[position] = new_rack
##    racks[new_rack.rack_id] = new_rack
##
##    return dc_replace(state, positions=positions, racks=racks)

##def example_planner(state: SuiteState) -> list:
##    actions = []
##    toggle = True
##
##    for pos, rack in state.positions.items():
##        if rack is None:
##            rack_id = f"{pos[0]}-{pos[1]}"
##            new_rack = Rack(
##                rack_id=rack_id,
##                generation="A25" if toggle else "C25",
##                rack_type="compute",
##                service="compute",
##                year=2023,
##                color="blue" if toggle else "green"
##            )
##            toggle = not toggle
##            actions.append(lambda s, p=pos, r=new_rack: replace_rack(s,p,r))
##
##    return actions

#def no_op_planner(state: SuiteState) -> List[Action]:
#    return []
