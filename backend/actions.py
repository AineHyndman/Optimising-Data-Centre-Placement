from dataclasses import replace
from typing import Callable

from models import Position, Rack, RackId, SuiteState

Action = Callable[[SuiteState], SuiteState]


def remove_rack(rack_id: RackId) -> Action:
    def _action(state: SuiteState) -> SuiteState:
        new_positions = dict(state.positions)
        new_racks = dict(state.racks)

        for pos, rack in new_positions.items():
            if rack and rack.rack_id == rack_id:
                new_positions[pos] = None
                break

        new_racks.pop(rack_id, None)
        return replace(state, positions=new_positions, racks=new_racks)

    return _action


def move_rack(rack_id: RackId, new_pos: Position) -> Action:
    def _action(state: SuiteState) -> SuiteState:
        new_positions = dict(state.positions)

        old_pos = None
        rack_obj = None

        for pos, rack in new_positions.items():
            if rack and rack.rack_id == rack_id:
                old_pos = pos
                rack_obj = rack
                break

        if old_pos is None:
            return state

        if new_positions.get(new_pos) is not None:
            raise ValueError("Target position occupied")

        new_positions[old_pos] = None
        new_positions[new_pos] = rack_obj

        return replace(state, positions=new_positions)

    return _action


def add_rack(rack: Rack, pos: Position) -> Action:
    def _action(state: SuiteState) -> SuiteState:
        if state.positions.get(pos) is not None:
            raise ValueError("Position occupied")

        new_positions = dict(state.positions)
        new_racks = dict(state.racks)

        new_positions[pos] = rack
        new_racks[rack.rack_id] = rack

        return replace(state, positions=new_positions, racks=new_racks)

    return _action
