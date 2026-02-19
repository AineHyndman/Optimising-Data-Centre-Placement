from typing import List
import sys

from dataclasses import replace as dc_replace
from src.simulation.actions import Action
from src.domain.models import SuiteState, Rack
from typing import Tuple

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

def no_op_planner(state: SuiteState) -> List[Action]:
    return []
