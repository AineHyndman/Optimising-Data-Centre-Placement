from typing import List

from actions import Action
from models import SuiteState


def no_op_planner(state: SuiteState) -> List[Action]:
    return []
