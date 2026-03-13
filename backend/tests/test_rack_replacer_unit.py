"""
Unit tests for RackReplacer.

These tests isolate RackReplacer behavior as much as possible by:
- using monkeypatch for planner behavior
- checking direct method behavior
- checking counters/history updates
- checking snapshot writing/reset logic
"""

import json
import pytest

from src.simulation.state import SuiteState, EmergencyState, test_suite as build_test_suite
from src.simulation.tasks.rack_replacer import RackReplacer
from src.simulation.constraints import Constraints
from src.model.rack import Rack


@pytest.fixture
def initial_state():
    return build_test_suite()


@pytest.fixture
def rack_replacer():
    return RackReplacer()


def _find_position_with_code(state, code):
    for pos, rack in state.positions.items():
        if rack is not None and rack.code == code:
            return pos
    pytest.skip(f"No position with rack code {code!r} found in test suite")


# --- is_valid_rack ---

def test_is_valid_rack_returns_true_for_replaceable_code(rack_replacer):
    assert rack_replacer.is_valid_rack(Rack("c23")) is True


def test_is_valid_rack_returns_false_for_none(rack_replacer):
    assert rack_replacer.is_valid_rack(None) is False


def test_is_valid_rack_returns_true_for_empty_code(rack_replacer):
    # Your current REPLACEMENT_MAP includes "" : ""
    assert rack_replacer.is_valid_rack(Rack("")) is True


def test_is_valid_rack_returns_false_for_non_replaceable_code(rack_replacer):
    assert rack_replacer.is_valid_rack(Rack("c25")) is False


# --- __call__ ---

def test_call_increments_day_and_returns_suite_state(initial_state):
    rr = RackReplacer()
    assert rr.day == -1

    result = rr(initial_state)

    assert rr.day == 0
    assert isinstance(result, SuiteState)


# --- replace_rack ---

def test_replace_rack_returns_same_state_when_max_moves_reached(initial_state):
    rr = RackReplacer(max_moves_per_day=0)
    pos = next(iter(initial_state.positions.keys()))
    constraint = Constraints(initial_state)

    new_state = rr.replace_rack(initial_state, pos, constraint)

    assert new_state == initial_state
    assert rr.racks_changed == 0
    assert rr.net_RSU_change == 0.0
    assert rr.net_power_change == 0.0
    assert rr.history == []


def test_replace_rack_returns_same_state_for_invalid_rack_code(initial_state):
    rr = RackReplacer()
    pos = _find_position_with_code(initial_state, "c25")
    constraint = Constraints(initial_state)

    new_state = rr.replace_rack(initial_state, pos, constraint)

    assert new_state == initial_state
    assert rr.racks_changed == 0
    assert rr.history == []


def test_replace_rack_returns_same_state_when_planner_returns_same_code(initial_state, monkeypatch):
    rr = RackReplacer()
    pos = _find_position_with_code(initial_state, "c23")
    old_rack = initial_state.positions[pos]
    constraint = Constraints(initial_state)

    monkeypatch.setattr(
        "src.simulation.tasks.rack_replacer.choose_rack",
        lambda state, rack, constraint: Rack(old_rack.code)
    )

    new_state = rr.replace_rack(initial_state, pos, constraint)

    assert new_state == initial_state
    assert rr.racks_changed == 0
    assert rr.net_RSU_change == 0.0
    assert rr.net_power_change == 0.0
    assert rr.history == []


def test_replace_rack_updates_state_when_planner_returns_new_code(initial_state, monkeypatch):
    rr = RackReplacer()
    pos = _find_position_with_code(initial_state, "c23")
    old_rack = initial_state.positions[pos]
    constraint = Constraints(initial_state)

    monkeypatch.setattr(
        "src.simulation.tasks.rack_replacer.choose_rack",
        lambda state, rack, constraint: Rack("c25")
    )

    new_state = rr.replace_rack(initial_state, pos, constraint)

    assert new_state.positions[pos].code == "c25"
    assert rr.racks_changed == 1
    assert rr.net_RSU_change == Rack("c25").capacity - old_rack.capacity
    assert rr.net_power_change == Rack("c25").powerNeed - old_rack.powerNeed
    assert len(rr.history) == 1
    assert rr.history[0]["from"] == "c23"
    assert rr.history[0]["to"] == "c25"


def test_replace_rack_does_not_change_state_when_power_budget_would_be_exceeded(initial_state, monkeypatch):
    rr = RackReplacer()
    pos = _find_position_with_code(initial_state, "c23")
    constraint = Constraints(initial_state)

    class DummyRack:
        def __init__(self):
            self.code = "c25"
            self.type = "Compute"
            self.capacity = 999999
            self.powerNeed = constraint.allowed_power_kw() + 999999

    monkeypatch.setattr(
        "src.simulation.tasks.rack_replacer.choose_rack",
        lambda state, rack, constraint: DummyRack()
    )

    new_state = rr.replace_rack(initial_state, pos, constraint)

    assert new_state == initial_state
    assert rr.racks_changed == 0
    assert rr.net_RSU_change == 0.0
    assert rr.net_power_change == 0.0
    assert rr.history == []


# --- emergency_replace_rack ---

def test_emergency_replace_rack_returns_same_state_for_empty_rack(initial_state):
    rr = RackReplacer()
    pos = _find_position_with_code(initial_state, "")
    constraint = Constraints(initial_state)

    new_state = rr.emergency_replace_rack(initial_state, pos, constraint)

    assert new_state == initial_state
    assert rr.racks_changed == 0
    assert rr.history == []


def test_emergency_replace_rack_removes_valid_rack_when_allowed(initial_state):
    rr = RackReplacer()
    constraint = Constraints(initial_state)

    candidate_pos = None
    candidate_rack = None

    # Find a non-empty rack that can be safely removed under current mins
    for pos, rack in initial_state.positions.items():
        if rack is None or rack.code == "":
            continue
        rsu = initial_state.get_rsu_per_service()
        if rack.type == "Compute" and rsu["Compute"] - rack.capacity >= constraint.compute_min:
            candidate_pos = pos
            candidate_rack = rack
            break
        if rack.type == "Storage" and rsu["Storage"] - rack.capacity >= constraint.storage_min:
            candidate_pos = pos
            candidate_rack = rack
            break
        if rack.type == "AI" and rsu["AI"] - rack.capacity >= constraint.AI_min:
            candidate_pos = pos
            candidate_rack = rack
            break

    if candidate_pos is None:
        pytest.skip("No removable non-empty rack found in test suite")

    new_state = rr.emergency_replace_rack(initial_state, candidate_pos, constraint)

    assert new_state.positions[candidate_pos].code == ""
    assert rr.racks_changed == 1
    assert rr.net_RSU_change == -candidate_rack.capacity
    assert rr.net_power_change == -candidate_rack.powerNeed
    assert len(rr.history) == 1
    assert rr.history[0]["from"] == candidate_rack.code
    assert rr.history[0]["to"] == ""


# --- _record_change ---

def test_record_change_appends_history(rack_replacer, initial_state):
    pos = next(iter(initial_state.positions.keys()))

    rack_replacer._record_change(pos, "c23", "c25")

    assert len(rack_replacer.history) == 1
    entry = rack_replacer.history[0]
    assert entry["suite"] == pos.suite
    assert entry["row"] == pos.row
    assert entry["pos"] == pos.position
    assert entry["from"] == "c23"
    assert entry["to"] == "c25"
    assert "ts" in entry


# --- end_day_snapshot ---

def test_end_day_snapshot_does_nothing_when_history_empty(tmp_path, rack_replacer):
    file_path = tmp_path / "history.jsonl"

    rack_replacer.end_day_snapshot(day=0, suite_id="Suite-A", filepath=str(file_path))

    assert not file_path.exists()


def test_end_day_snapshot_writes_jsonl_and_resets_counters(tmp_path, rack_replacer, initial_state):
    file_path = tmp_path / "history.jsonl"
    pos = next(iter(initial_state.positions.keys()))

    rack_replacer._record_change(pos, "c23", "c25")
    rack_replacer.racks_changed = 2
    rack_replacer.net_RSU_change = 10.0
    rack_replacer.net_power_change = 4.5
    rack_replacer.Compute_RSU_change = 10.0
    rack_replacer.Storage_RSU_change = 0.0
    rack_replacer.AI_RSU_change = 0.0

    rack_replacer.end_day_snapshot(day=3, suite_id="Suite-A", filepath=str(file_path))

    assert file_path.exists()

    lines = file_path.read_text(encoding="utf-8").strip().splitlines()
    assert len(lines) == 1

    record = json.loads(lines[0])
    assert record["day"] == 3
    assert record["suite_id"] == "Suite-A"
    assert len(record["changes"]) == 1
    assert record["summary"]["racks_changed"] == 2
    assert record["summary"]["net_RSU_change"] == 10.0
    assert record["summary"]["net_power_change"] == 4.5

    # Counters/history should be reset after snapshot
    assert rack_replacer.history == []
    assert rack_replacer.racks_changed == 0
    assert rack_replacer.net_RSU_change == 0.0
    assert rack_replacer.net_power_change == 0.0
    assert rack_replacer.Compute_RSU_change == 0.0
    assert rack_replacer.Storage_RSU_change == 0.0
    assert rack_replacer.AI_RSU_change == 0.0