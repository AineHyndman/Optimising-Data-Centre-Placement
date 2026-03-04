from dataclasses import replace
from typing import Callable, Dict, List
#from .actions import Action
from src.simulation.state import SuiteState, test_suite
from src.simulation.tasks.rack_replacer import RackReplacer


class SimulationEngine:
    def __init__(self, initial_state: SuiteState):
        self.history: Dict[Day, SuiteState] = {initial_state.day: initial_state}
        self.current_day = initial_state.day
        self.current_state = initial_state
        self.rack_replacer = RackReplacer()

    def step(self) -> SuiteState:
        state = self.current_state

        """
        Replaced actions with rack replacer
        """

        state = self.rack_replacer(state)

        new_day = self.current_day + 1
        new_state = replace(state, day=new_day)

        self.history[new_day] = new_state
        self.current_day = new_day
        self.current_state = new_state

        return new_state

    def fast_forward(self, days: int):
        for _ in range(days):
            self.step()

    def rollback(self, day: int):
        if day not in self.history:
            raise ValueError("Day not in history")

        self.current_day = day
        self.current_state = self.history[day]

        for d in list(self.history.keys()):
            if d > day:
                del self.history[d]



"""
Setting up the test for it
"""

def test():

    """
    Setting up the SuiteState for the test
    """
    
    testSuite = test_suite()

    """
    Actual test for the new engine starts here
    """

    testEngine = SimulationEngine(testSuite)

    testEngine.step()
    testEngine.step()
    testEngine.step()
    testEngine.step()
    testEngine.step()
    testEngine.step()
    
    testEngine.fast_forward(10)
    for key in testEngine.history.keys():
        print(testEngine.history[key].get_2023_count())



test()