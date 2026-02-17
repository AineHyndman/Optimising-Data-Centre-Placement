from typing import List

from backend.simulation_engine.actions import Action
from backend.simulation_engine.models import SuiteState


def no_op_planner(state: SuiteState) -> List[Action]:
    return []
