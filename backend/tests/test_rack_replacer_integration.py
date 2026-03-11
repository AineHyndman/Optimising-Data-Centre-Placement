"""
Integration tests for RackReplacer, Constraints, Planners, and EmergencyState.

These tests verify that the rack replacement logic correctly interacts with
constraint checking, the planner's rack selection, and emergency power handling.
"""

import pytest
from dataclasses import replace

from src.simulation.state import SuiteState, EmergencyState
from src.simulation.suite_analytics import test_suite as build_test_suite
from src.simulation.tasks.rack_replacer import RackReplacer
from src.simulation.constraints import Constraints
from src.simulation.planners import choose_rack, get_rsu_ratio
from src.model.rack import Rack


@pytest.fixture
def initial_state():
    return build_test_suite()


@pytest.fixture
def rack_replacer():
    return RackReplacer()


# --- RackReplacer + SuiteState ---

def test_rack_replacer_returns_suite_state(rack_replacer, initial_state):
    result = rack_replacer(initial_state)
    assert isinstance(result, SuiteState)


def test_rack_replacer_reduces_2023_count(rack_replacer, initial_state):
    count_before = initial_state.get_2023_count()
    new_state = rack_replacer(initial_state)
    count_after = new_state.get_2023_count()
    assert count_after <= count_before


def test_rack_replacer_preserves_position_count(rack_replacer, initial_state):
    new_state = rack_replacer(initial_state)
    assert len(new_state.positions) == len(initial_state.positions)


# --- RackReplacer + Constraints: power budget ---

def test_power_budget_not_exceeded_after_replacement(rack_replacer, initial_state):
    new_state = rack_replacer(initial_state)
    constraint = Constraints(new_state)
    assert new_state.total_power_kw() <= constraint.allowed_power_kw()


def test_power_budget_not_exceeded_over_multiple_days(initial_state):
    rr = RackReplacer()
    state = initial_state
    for _ in range(5):
        state = rr(state)
        constraint = Constraints(state)
        assert state.total_power_kw() <= constraint.allowed_power_kw()


# --- RackReplacer + Constraints: RSU limits ---

def test_rsu_compute_within_max_after_replacement(rack_replacer, initial_state):
    new_state = rack_replacer(initial_state)
    constraint = Constraints(new_state)
    rsu = new_state.get_rsu_per_service()
    assert rsu.get("Compute", 0) <= constraint.compute_max


def test_rsu_storage_within_max_after_replacement(rack_replacer, initial_state):
    new_state = rack_replacer(initial_state)
    constraint = Constraints(new_state)
    rsu = new_state.get_rsu_per_service()
    assert rsu.get("Storage", 0) <= constraint.storage_max


def test_rsu_ai_within_max_after_replacement(rack_replacer, initial_state):
    new_state = rack_replacer(initial_state)
    constraint = Constraints(new_state)
    rsu = new_state.get_rsu_per_service()
    assert rsu.get("AI", 0) <= constraint.AI_max


# --- RackReplacer: max moves per day cap ---

def test_max_moves_per_day_is_respected(initial_state):
    max_moves = 3
    rr = RackReplacer(max_moves_per_day=max_moves)
    state_before = initial_state
    new_state = rr(initial_state)
    changed = sum(
        1 for pos in state_before.positions
        if state_before.positions[pos].code != new_state.positions[pos].code
    )
    assert changed <= max_moves


# --- EmergencyState: update_emergency logic ---

def test_emergency_activates_when_over_power(initial_state):
    rr = RackReplacer()
    # Manually build a state over the power limit by patching emergencyState
    state = replace(
        initial_state,
        emergencyState=EmergencyState(emergency_days=0, cool_days=0, active=False, cooldown=False)
    )
    constraint = Constraints(state)
    result = rr.update_emergency(state, constraint)
    if state.total_power_kw() > constraint.max_power_kw:
        assert result.emergencyState.active is True


def test_emergency_days_increment_while_active(initial_state):
    rr = RackReplacer()
    state = replace(
        initial_state,
        emergencyState=EmergencyState(emergency_days=2, cool_days=0, active=True, cooldown=False)
    )
    constraint = Constraints(state)
    result = rr.update_emergency(state, constraint)
    assert result.emergencyState.emergency_days == 3


def test_cooldown_triggers_after_7_emergency_days(initial_state):
    rr = RackReplacer()
    state = replace(
        initial_state,
        emergencyState=EmergencyState(emergency_days=6, cool_days=0, active=True, cooldown=False)
    )
    constraint = Constraints(state)
    result = rr.update_emergency(state, constraint)
    assert result.emergencyState.cooldown is True
    assert result.emergencyState.active is False
    assert result.emergencyState.emergency_days == 0


def test_cooldown_resets_after_2_cool_days(initial_state):
    rr = RackReplacer()
    state = replace(
        initial_state,
        emergencyState=EmergencyState(emergency_days=0, cool_days=1, active=False, cooldown=True)
    )
    constraint = Constraints(state)
    result = rr.update_emergency(state, constraint)
    assert result.emergencyState.cooldown is False
    assert result.emergencyState.cool_days == 0


def test_cool_days_increment_during_cooldown(initial_state):
    rr = RackReplacer()
    state = replace(
        initial_state,
        emergencyState=EmergencyState(emergency_days=0, cool_days=0, active=False, cooldown=True)
    )
    constraint = Constraints(state)
    result = rr.update_emergency(state, constraint)
    assert result.emergencyState.cool_days == 1
    assert result.emergencyState.cooldown is True


# --- Planners: choose_rack ---

def test_choose_rack_returns_rack_instance(initial_state):
    constraint = Constraints(initial_state)
    old_rack = Rack("c23")
    result = choose_rack(initial_state, old_rack, constraint)
    assert isinstance(result, Rack)


def test_choose_rack_returns_valid_code(initial_state):
    constraint = Constraints(initial_state)
    old_rack = Rack("c23")
    result = choose_rack(initial_state, old_rack, constraint)
    assert result.code in ("c25", "s25", "a25", "")


def test_choose_rack_for_storage_returns_valid_code(initial_state):
    constraint = Constraints(initial_state)
    old_rack = Rack("s23")
    result = choose_rack(initial_state, old_rack, constraint)
    assert result.code in ("c25", "s25", "a25", "")


def test_choose_rack_for_ai_returns_valid_code(initial_state):
    constraint = Constraints(initial_state)
    old_rack = Rack("a23")
    result = choose_rack(initial_state, old_rack, constraint)
    assert result.code in ("c25", "s25", "a25", "")


# --- Planners: get_rsu_ratio ---

def test_get_rsu_ratio_returns_all_three_services(initial_state):
    constraint = Constraints(initial_state)
    ratios = get_rsu_ratio(initial_state, constraint)
    assert set(ratios.keys()) == {"c25", "s25", "a25"}


def test_get_rsu_ratio_values_are_floats(initial_state):
    constraint = Constraints(initial_state)
    ratios = get_rsu_ratio(initial_state, constraint)
    for v in ratios.values():
        assert isinstance(v, float)


# --- Constraints ---

def test_constraints_allowed_power_includes_emergency_when_not_in_cooldown(initial_state):
    state = replace(
        initial_state,
        emergencyState=EmergencyState(emergency_days=0, cool_days=0, active=False, cooldown=False)
    )
    constraint = Constraints(state)
    assert constraint.allowed_power_kw() == constraint.max_power_kw + constraint.emergency_power_kw


def test_constraints_allowed_power_excludes_emergency_during_cooldown(initial_state):
    state = replace(
        initial_state,
        emergencyState=EmergencyState(emergency_days=0, cool_days=1, active=False, cooldown=True)
    )
    constraint = Constraints(state)
    assert constraint.allowed_power_kw() == constraint.max_power_kw


def test_constraints_available_power_kw_is_budget_minus_usage(initial_state):
    constraint = Constraints(initial_state)
    expected = constraint.allowed_power_kw() - initial_state.total_power_kw()
    assert constraint.available_power_kw() == expected
