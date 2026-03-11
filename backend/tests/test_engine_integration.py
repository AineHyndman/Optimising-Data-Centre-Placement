"""
Integration tests for SimulationEngine + RackReplacer.

These tests verify that the engine correctly drives the simulation:
stepping through days, recording history, and rolling back state.
"""

import pytest
from src.simulation.engine import SimulationEngine
from src.simulation.suite_analytics import test_suite as build_test_suite


@pytest.fixture
def initial_state():
    return build_test_suite()


@pytest.fixture
def engine(initial_state):
    return SimulationEngine(initial_state)


# --- step() ---

def test_step_increments_day(engine, initial_state):
    new_state = engine.step()
    assert new_state.day == initial_state.day + 1


def test_step_updates_current_state(engine):
    new_state = engine.step()
    assert engine.current_state is new_state
    assert engine.current_day == new_state.day


def test_step_records_new_state_in_history(engine, initial_state):
    engine.step()
    assert initial_state.day + 1 in engine.history


def test_step_preserves_initial_day_in_history(engine, initial_state):
    engine.step()
    assert initial_state.day in engine.history


def test_step_returns_suite_state_with_positions(engine):
    new_state = engine.step()
    assert len(new_state.positions) > 0


# --- fast_forward() ---

def test_fast_forward_advances_correct_number_of_days(engine, initial_state):
    engine.fast_forward(5)
    assert engine.current_day == initial_state.day + 5


def test_fast_forward_builds_full_history(engine, initial_state):
    engine.fast_forward(3)
    # initial day + 3 stepped days = 4 entries
    assert len(engine.history) == 4
    for d in range(initial_state.day, initial_state.day + 4):
        assert d in engine.history


def test_fast_forward_zero_days_is_noop(engine, initial_state):
    engine.fast_forward(0)
    assert engine.current_day == initial_state.day
    assert len(engine.history) == 1


# --- rollback() ---

def test_rollback_restores_correct_day(engine, initial_state):
    engine.fast_forward(5)
    engine.rollback(initial_state.day + 2)
    assert engine.current_day == initial_state.day + 2


def test_rollback_restores_correct_state(engine, initial_state):
    engine.fast_forward(3)
    state_at_day_1 = engine.history[initial_state.day + 1]
    engine.rollback(initial_state.day + 1)
    assert engine.current_state == state_at_day_1


def test_rollback_removes_future_history(engine, initial_state):
    engine.fast_forward(5)
    engine.rollback(initial_state.day + 2)
    for d in range(initial_state.day + 3, initial_state.day + 6):
        assert d not in engine.history


def test_rollback_to_start_clears_all_future(engine, initial_state):
    engine.fast_forward(4)
    engine.rollback(initial_state.day)
    assert engine.current_state == initial_state
    assert len(engine.history) == 1


def test_rollback_invalid_day_raises_value_error(engine):
    with pytest.raises(ValueError):
        engine.rollback(999)


# --- simulation correctness ---

def test_2023_rack_count_does_not_increase_over_time(engine, initial_state):
    count_before = initial_state.get_2023_count()
    engine.fast_forward(10)
    count_after = engine.current_state.get_2023_count()
    assert count_after <= count_before


def test_simulation_state_has_valid_power_after_many_steps(engine):
    engine.fast_forward(10)
    assert engine.current_state.total_power_kw() >= 0


def test_each_history_entry_is_one_day_apart(engine, initial_state):
    engine.fast_forward(5)
    days = sorted(engine.history.keys())
    for i in range(len(days) - 1):
        assert days[i + 1] - days[i] == 1
