from dataclasses import replace
from typing import Callable, Dict, List
from .actions import Action
from .models import Day, SuiteState
from src.rack_replacer import RackReplacer


class SimulationEngine:
    def __init__(self, initial_state: SuiteState):
        self.history: Dict[Day, SuiteState] = {initial_state.day: initial_state}
        self.current_day = initial_state.day
        self.current_state = initial_state
        self.rack_replacer = RackReplacer()

    def step(self, actions: List[Action]) -> SuiteState:
        state = self.current_state

        for action in actions:
            state = action(state)

        new_day = self.current_day + 1
        new_state = replace(state, day=new_day)

        self.history[new_day] = new_state
        self.current_day = new_day
        self.current_state = new_state

        return new_state

    def fast_forward(self, days: int, planner: Callable[[SuiteState], List[Action]]):
        for _ in range(days):
            actions = planner(self.current_state)
            self.step(actions)

    def rollback(self, day: Day):
        if day not in self.history:
            raise ValueError("Day not in history")

        self.current_day = day
        self.current_state = self.history[day]

        for d in list(self.history.keys()):
            if d > day:
                del self.history[d]