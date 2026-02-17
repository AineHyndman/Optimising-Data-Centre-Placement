from typing import List

from backend.simulation_engine.actions import Action
from models import SuiteState


def no_op_planner(state: SuiteState) -> List[Action]:
    return []
