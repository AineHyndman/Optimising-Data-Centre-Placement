from typing import List
import sys

from src.model.rack import Rack
from src.simulation.constraints import Constraints

from typing import Tuple

# chooses the rack replacement type based on RSU utilisation
# rack type with lowest RSU ratio is prioritised to balance service capacity
def choose_rack(old_rack: Rack, constraint: Constraints, rsu_per_service: dict):

    """
    IMPORTANT: Chooses the rack with the lowest rsu ratio
    """
    new_rack = ""
    temp = get_rsu_ratio(constraint, rsu_per_service)
    lowest = sorted(temp, key=temp.get)

    """
    If one is full, it'll cycle through all of them to check if the whole capacity is full
    """
    for myKey in lowest:
        new_rack = Rack(myKey)

        """
        Checks which type we are dealing with and makes sure no constraints are broken

        If it reachest the max rsu for the service it just removes the 2023 Rack
        This makes it possible to add more new racks
        """
        match new_rack.type:
            case "Compute":
                if new_rack.type == old_rack.type:
                    if rsu_per_service["Compute"] + new_rack.capacity - old_rack.capacity > constraint.compute_max:
                        continue
                else:
                    if rsu_per_service["Compute"] + new_rack.capacity > constraint.compute_max:
                        continue
            case "Storage":
                if new_rack.type == old_rack.type:
                    if rsu_per_service["Storage"] + new_rack.capacity - old_rack.capacity > constraint.storage_max:
                        continue
                else:
                    if rsu_per_service["Storage"] + new_rack.capacity > constraint.storage_max:
                        continue
            case "AI":
                if new_rack.type == old_rack.type:
                    if rsu_per_service["AI"] + new_rack.capacity - old_rack.capacity > constraint.AI_max:
                        continue
                else:
                    if rsu_per_service["AI"] + new_rack.capacity > constraint.AI_max:
                        continue
        return new_rack
    
    return(Rack(""))


"""
A green, energy saving, version of choose_rack, also more efficient
"""
def choose_rack_green(old_rack: Rack, constraint: Constraints, rsu_per_service: dict):

    """
    Checks which type we are dealing with and makes sure no constraints are broken

    If it reachest the min rsu for the service it does nothing, unless the current rack is generation 2023
    """
    match old_rack.type:
        case "Compute":
            if rsu_per_service["Compute"] - old_rack.capacity < constraint.compute_min:
                if old_rack.generation == 2023:
                    return Rack("c25")
                else:
                    return ""
        case "Storage":
            if rsu_per_service["Storage"] - old_rack.capacity < constraint.storage_min:
                if old_rack.generation == 2023:
                    return Rack("s25")
                else:
                    return ""
        case "AI":
            if rsu_per_service["AI"] - old_rack.capacity < constraint.AI_min:
                if old_rack.generation == 2023:
                    return Rack("a25")
                else:
                    return ""
    
    return Rack("")


# Gets the ratio of the rsu
def get_rsu_ratio(constraint: Constraints, rsu_per_service: dict):
    temp = {}
    temp["c25"] = (rsu_per_service["Compute"] - constraint.compute_min) / (constraint.compute_max - constraint.compute_min) 
    temp["s25"] = (rsu_per_service["Storage"] - constraint.storage_min) / (constraint.storage_max - constraint.storage_min)
    temp["a25"] = (rsu_per_service["AI"] - constraint.AI_min) / (constraint.AI_max - constraint.AI_min)
    return temp