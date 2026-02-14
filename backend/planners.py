from typing import List
from models import SuiteState
from actions import Action


def no_op_planner(state: SuiteState) -> List[Action]:
    return []
