import unittest
from dataclasses import dataclass
from src.simulation.state import SuiteState, EmergencyState
from src.model.position import Position


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


# ── Tests for total_rsu_per_kw() and green_score() (issue #36) ────────────

class TestTotalRsuPerKw(unittest.TestCase):

    def test_basic(self):
        state = make_state([MockRack(powerNeed=19, capacity=2.8)] * 10)
        expected = round((2.8 * 10) / (19 * 10), 4)
        self.assertAlmostEqual(state.total_rsu_per_kw(), expected, places=3)

    def test_empty_suite_returns_zero(self):
        state = make_state([MockRack(powerNeed=0, capacity=0.0)])
        self.assertEqual(state.total_rsu_per_kw(), 0.0)

    def test_mixed_racks(self):
        state = make_state([MockRack(powerNeed=11, capacity=1.0),
                            MockRack(powerNeed=20, capacity=1.0)])
        expected = round(2.0 / 31, 4)
        self.assertAlmostEqual(state.total_rsu_per_kw(), expected, places=4)


class TestGreenScore(unittest.TestCase):

    def test_worst_case_scores_zero(self):
        state = make_state([MockRack(powerNeed=20, capacity=1.0)] * 10)
        self.assertAlmostEqual(state.green_score(), 0.0, places=1)

    def test_best_case_scores_100(self):
        state = make_state([MockRack(powerNeed=19, capacity=2.8)] * 10)
        self.assertAlmostEqual(state.green_score(), 100.0, places=0)

    def test_empty_suite_returns_zero(self):
        state = make_state([MockRack(powerNeed=0, capacity=0.0)])
        self.assertEqual(state.green_score(), 0.0)

    def test_clamps_below_zero(self):
        state = make_state([MockRack(powerNeed=100, capacity=1.0)] * 5)
        self.assertGreaterEqual(state.green_score(), 0.0)

    def test_clamps_above_100(self):
        state = make_state([MockRack(powerNeed=1, capacity=100.0)] * 5)
        self.assertLessEqual(state.green_score(), 100.0)

    def test_returns_float(self):
        state = make_state([MockRack(powerNeed=15, capacity=1.4)] * 5)
        self.assertIsInstance(state.green_score(), float)


# ── Tests for end_day_snapshot() (issue #40) ──────────────────────────────

from src.simulation.tasks.rack_replacer import RackReplacer
from src.model.rack import Rack


def make_real_state():
    """Build a minimal SuiteState using actual Rack objects (c23 racks)."""
    positions = {}
    racks = {}
    for i in range(5):
        rack = Rack("c23")
        pos = Position(suite=0, row=0, position=i)
        positions[pos] = rack
        racks[f"c23-{i}"] = rack
    return SuiteState(day=0, positions=positions, racks=racks)


class TestEndDaySnapshot(unittest.TestCase):

    def test_power_saved_kw_present_in_snapshot(self):
        state = make_real_state()
        rr = RackReplacer()
        final_state = rr(state)
        record = rr.end_day_snapshot(day=1, suite_id="test", state=final_state)
        self.assertIn("power_saved_kw", record["summary"])

    def test_power_saved_kw_is_correct(self):
        state = make_real_state()
        initial_power = state.total_power_kw()
        rr = RackReplacer()
        final_state = rr(state)
        record = rr.end_day_snapshot(day=1, suite_id="test", state=final_state)
        expected = initial_power - final_state.total_power_kw()
        self.assertEqual(record["summary"]["power_saved_kw"], expected)

    def test_no_replacements_power_saved_is_zero(self):
        state = make_real_state()
        rr = RackReplacer(max_moves_per_day=0)
        final_state = rr(state)
        record = rr.end_day_snapshot(day=1, suite_id="test", state=final_state)
        self.assertEqual(record["summary"]["power_saved_kw"], 0)


if __name__ == '__main__':
    unittest.main()
