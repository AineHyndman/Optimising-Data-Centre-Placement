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

    # advances the simulation by one day and returns new suite state
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

    # advances the simulation forward by a number of days
    def fast_forward(self, days: int):
        for _ in range(days):
            self.step()

    # reverts the simulation to a specific setting and removes any history after it
    def rollback(self, day: int):
        if day not in self.history:
            raise ValueError("Day not in history")

        self.current_day = day
        self.current_state = self.history[day]

        for d in list(self.history.keys()):
            if d > day:
                del self.history[d]
   
    def compare_power_before_after(self, before_day: int, after_day: int) -> dict:
        
        if before_day not in self.history:
            raise ValueError(f"Day {before_day} not in history")

        if after_day not in self.history:
            raise ValueError(f"Day {after_day} not in history")

        before_state = self.history[before_day]
        after_state = self.history[after_day]

        before_power = before_state.total_power_kw()
        after_power = after_state.total_power_kw()

        absolute_change = after_power - before_power

        if before_power == 0:
            percentage_change = None
        else:
            percentage_change = (absolute_change / before_power) * 100

        return {
            "before_day": before_day,
            "after_day": after_day,
            "before_power_kw": before_power,
            "after_power_kw": after_power,
            "absolute_change_kw": absolute_change,
            "percentage_change": round(percentage_change, 2) if percentage_change is not None else None,
        }



"""
Setting up the test for it
"""
def test():

    #Setting up the test version of SuiteState
    testSuite = test_suite()

    #Actual test for the new engine starts here
    testEngine = SimulationEngine(testSuite)

    testEngine.step()
    testEngine.step()
    testEngine.step()
    testEngine.step()
    testEngine.step()

    
    testEngine.fast_forward(20)
    for key in testEngine.history.keys():
        print(testEngine.history[key].get_2023_count(), testEngine.history[key].get_rsu_per_service(), testEngine.history[key].get_type_counts(), testEngine.history[key].get_generation_counts())


if __name__ == "__main__":
    test()