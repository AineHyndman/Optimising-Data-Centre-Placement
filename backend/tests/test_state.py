import unittest
from dataclasses import dataclass
from src.simulation.state import SuiteState, EmergencyState


@dataclass
class MockRack:
    """Minimal rack substitute for testing — avoids loading racks.json."""
    powerNeed: int
    capacity: float
    generation: int = 2023
    type: str = "Compute"


def make_state(racks_list):
    positions = {i: rack for i, rack in enumerate(racks_list)}
    racks = {str(i): rack for i, rack in enumerate(racks_list)}
    return SuiteState(day=0, positions=positions, racks=racks)


class TestTotalRsuPerKw(unittest.TestCase):

    def test_basic(self):
        # 10x c25 racks: 2.8 RSU / 19 kW each
        state = make_state([MockRack(powerNeed=19, capacity=2.8)] * 10)
        expected = round((2.8 * 10) / (19 * 10), 4)
        self.assertAlmostEqual(state.total_rsu_per_kw(), expected, places=3)

    def test_empty_suite_returns_zero(self):
        state = make_state([MockRack(powerNeed=0, capacity=0.0)])
        self.assertEqual(state.total_rsu_per_kw(), 0.0)

    def test_mixed_racks(self):
        # c23 (1 RSU/11 kW) + s23 (1 RSU/20 kW)
        state = make_state([MockRack(powerNeed=11, capacity=1.0),
                            MockRack(powerNeed=20, capacity=1.0)])
        expected = round(2.0 / 31, 4)
        self.assertAlmostEqual(state.total_rsu_per_kw(), expected, places=4)


class TestGreenScore(unittest.TestCase):

    def test_worst_case_scores_zero(self):
        # All s23 racks = worst baseline (0.05 RSU/kW) → score = 0
        state = make_state([MockRack(powerNeed=20, capacity=1.0)] * 10)
        self.assertAlmostEqual(state.green_score(), 0.0, places=1)

    def test_best_case_scores_100(self):
        # All c25 racks = best baseline (2.8/19 RSU/kW) → score = 100
        state = make_state([MockRack(powerNeed=19, capacity=2.8)] * 10)
        self.assertAlmostEqual(state.green_score(), 100.0, places=0)

    def test_empty_suite_returns_zero(self):
        state = make_state([MockRack(powerNeed=0, capacity=0.0)])
        self.assertEqual(state.green_score(), 0.0)

    def test_clamps_below_zero(self):
        # Very inefficient rack → score must not go below 0
        state = make_state([MockRack(powerNeed=100, capacity=1.0)] * 5)
        self.assertGreaterEqual(state.green_score(), 0.0)

    def test_clamps_above_100(self):
        # Unrealistically efficient rack → score must not exceed 100
        state = make_state([MockRack(powerNeed=1, capacity=100.0)] * 5)
        self.assertLessEqual(state.green_score(), 100.0)

    def test_returns_float(self):
        state = make_state([MockRack(powerNeed=15, capacity=1.4)] * 5)
        self.assertIsInstance(state.green_score(), float)


if __name__ == '__main__':
    unittest.main()
