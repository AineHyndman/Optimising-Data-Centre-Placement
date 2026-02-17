from typing import List

from simulation_engine.actions import Action
from simulation_engine.models import SuiteState


def no_op_planner(state: SuiteState) -> List[Action]:
    return []
