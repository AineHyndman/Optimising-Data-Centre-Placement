from typing import List
import sys

from src.model.rack import Rack
from src.simulation.state import SuiteState
from src.simulation.constraints import Constraints

from typing import Tuple

# chooses the rack replacement type based on RSU utilisation
# rack type with lowest RSU ratio is prioritised to balance service capacity
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
    Checks which type we are dealing with and makes sure no constraints are broken

    If it reachest the max rsu for the service it just removes the 2023 Rack
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

