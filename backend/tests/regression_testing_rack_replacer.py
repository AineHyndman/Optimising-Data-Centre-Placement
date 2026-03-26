"""Regression tests for RackReplacer behavior across representative suite layouts.

The goal is to catch unintended behavior changes after optimization/refactor work.
Each case writes explicit JSON inputs (suite + rows), builds a SuiteState from them,
runs one replacement day, and verifies:
- power never exceeds allowed budget
- RSU constraints remain valid
- suite state remains structurally valid
- generated snapshot matches expected baseline values
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List

import pytest
from src.model.position import Position
from src.model.rack import Rack
from src.simulation.constraints import Constraints
from src.simulation.state import EmergencyState, SuiteState
from src.simulation.tasks.rack_replacer import RackReplacer


@dataclass(frozen=True)
class RegressionCase:
    name: str
    description: str
    suite_json: dict
    rows_json: list[dict]
    expected_snapshot: dict


def _row(row_id: str, pattern: List[str]) -> dict:
    if len(pattern) != 16:
        raise ValueError("Each row must contain exactly 16 positions")
    return {"RowId": row_id, "Positions": pattern}


def _write_json(path: Path, payload: dict | list) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _apply_suite_constraints_to_class(suite_json: dict) -> None:
    """Patch Constraints class constants to reflect the case suite JSON."""
    Constraints.max_power_mw = float(suite_json["MaxPowerMW"])
    Constraints.emergency_power_mw = float(suite_json["EmergencyPowerMW"])
    Constraints.max_power_kw = Constraints.max_power_mw * 1000
    Constraints.emergency_power_kw = Constraints.emergency_power_mw * 1000

    Constraints.compute_min = int(suite_json["ComputeMinRSU"])
    Constraints.compute_max = int(suite_json["ComputeMaxRSU"])
    Constraints.storage_min = int(suite_json["StorageMinRSU"])
    Constraints.storage_max = int(suite_json["StorageMaxRSU"])
    Constraints.AI_min = int(suite_json["AIMinRSU"])
    Constraints.AI_max = int(suite_json["AIMaxRSU"])


def _build_state_from_rows(rows_json: list[dict]) -> SuiteState:
    positions: Dict[Position, Rack] = {}
    racks: Dict[str, Rack] = {}

    for row_idx, row in enumerate(rows_json):
        for col_idx, code in enumerate(row["Positions"]):
            rack = Rack(code)
            pos = Position(suite=0, row=row_idx, position=col_idx)
            positions[pos] = rack
            racks[rack.code] = rack

    return SuiteState(
        day=0, positions=positions, racks=racks, emergencyState=EmergencyState()
    )


def _count_position_changes(before: SuiteState, after: SuiteState) -> int:
    before_codes = sorted(
        (p.row, p.position, r.code) for p, r in before.positions.items()
    )
    after_codes = sorted(
        (p.row, p.position, r.code) for p, r in after.positions.items()
    )
    return sum(1 for b, a in zip(before_codes, after_codes) if b != a)


def _snapshot(case: RegressionCase, before: SuiteState, after: SuiteState) -> dict:
    constraint = Constraints(after)
    rsu = after.get_rsu_per_service()

    return {
        "case": case.name,
        "total_power_kw": after.total_power_kw(),
        "allowed_power_kw": constraint.allowed_power_kw(),
        "changed_positions": _count_position_changes(before, after),
        "generation_counts": dict(sorted(after.get_generation_counts().items())),
        "rsu": {
            "Compute": round(rsu.get("Compute", 0), 2),
            "Storage": round(rsu.get("Storage", 0), 2),
            "AI": round(rsu.get("AI", 0), 2),
        },
        "emergency": {
            "active": after.emergencyState.active,
            "cooldown": after.emergencyState.cooldown,
            "emergency_days": after.emergencyState.emergency_days,
            "cool_days": after.emergencyState.cool_days,
        },
    }


def _assert_valid_suite_state(state: SuiteState, expected_positions: int) -> None:
    assert isinstance(state, SuiteState)
    assert len(state.positions) == expected_positions
    for rack in state.positions.values():
        assert rack is not None
        assert rack.code is not None
        assert rack.powerNeed >= 0
        assert rack.capacity >= 0


def _assert_constraints_not_violated(state: SuiteState) -> None:
    constraint = Constraints(state)
    rsu = state.get_rsu_per_service()

    assert state.total_power_kw() <= constraint.allowed_power_kw()
    assert rsu.get("Compute", 0) >= constraint.compute_min
    assert rsu.get("Storage", 0) >= constraint.storage_min
    assert rsu.get("AI", 0) >= constraint.AI_min
    assert rsu.get("Compute", 0) <= constraint.compute_max
    assert rsu.get("Storage", 0) <= constraint.storage_max
    assert rsu.get("AI", 0) <= constraint.AI_max


def _make_cases() -> list[RegressionCase]:
    small_rows = [
        _row(
            "R01",
            [
                "c23",
                "s23",
                "a23",
                "",
                "c24",
                "s24",
                "a24",
                "",
                "c25",
                "s25",
                "a25",
                "",
                "c23",
                "s23",
                "a23",
                "",
            ],
        ),
        _row(
            "R02",
            [
                "c23",
                "s23",
                "a23",
                "",
                "c24",
                "s24",
                "a24",
                "",
                "c25",
                "s25",
                "a25",
                "",
                "c23",
                "s23",
                "a23",
                "",
            ],
        ),
        _row(
            "R03",
            [
                "c23",
                "s23",
                "a23",
                "",
                "c24",
                "s24",
                "a24",
                "",
                "c25",
                "s25",
                "a25",
                "",
                "c23",
                "s23",
                "a23",
                "",
            ],
        ),
        _row(
            "R04",
            [
                "c23",
                "s23",
                "a23",
                "",
                "c24",
                "s24",
                "a24",
                "",
                "c25",
                "s25",
                "a25",
                "",
                "c23",
                "s23",
                "a23",
                "",
            ],
        ),
    ]

    edge_rows = [
        _row(
            "R01",
            [
                "c23",
                "c23",
                "s23",
                "s23",
                "a23",
                "a23",
                "c23",
                "s23",
                "a23",
                "c23",
                "s23",
                "a23",
                "",
                "",
                "",
                "",
            ],
        ),
        _row(
            "R02",
            [
                "c23",
                "c23",
                "s23",
                "s23",
                "a23",
                "a23",
                "c23",
                "s23",
                "a23",
                "c23",
                "s23",
                "a23",
                "",
                "",
                "",
                "",
            ],
        ),
    ]

    dense_rows = [
        _row(
            "R01",
            [
                "c23",
                "c23",
                "c23",
                "s23",
                "s23",
                "s23",
                "a23",
                "a23",
                "c24",
                "s24",
                "a24",
                "c25",
                "s25",
                "a25",
                "c23",
                "s23",
            ],
        ),
        _row(
            "R02",
            [
                "c23",
                "c23",
                "c23",
                "s23",
                "s23",
                "s23",
                "a23",
                "a23",
                "c24",
                "s24",
                "a24",
                "c25",
                "s25",
                "a25",
                "a23",
                "s23",
            ],
        ),
        _row(
            "R03",
            [
                "c23",
                "c23",
                "c23",
                "s23",
                "s23",
                "s23",
                "a23",
                "a23",
                "c24",
                "s24",
                "a24",
                "c25",
                "s25",
                "a25",
                "c23",
                "a23",
            ],
        ),
        _row(
            "R04",
            [
                "c23",
                "c23",
                "c23",
                "s23",
                "s23",
                "s23",
                "a23",
                "a23",
                "c24",
                "s24",
                "a24",
                "c25",
                "s25",
                "a25",
                "c23",
                "s23",
            ],
        ),
        _row(
            "R05",
            [
                "c23",
                "c23",
                "c23",
                "s23",
                "s23",
                "s23",
                "a23",
                "a23",
                "c24",
                "s24",
                "a24",
                "c25",
                "s25",
                "a25",
                "a23",
                "s23",
            ],
        ),
        _row(
            "R06",
            [
                "c23",
                "c23",
                "c23",
                "s23",
                "s23",
                "s23",
                "a23",
                "a23",
                "c24",
                "s24",
                "a24",
                "c25",
                "s25",
                "a25",
                "c23",
                "a23",
            ],
        ),
        _row(
            "R07",
            [
                "c23",
                "c23",
                "c23",
                "s23",
                "s23",
                "s23",
                "a23",
                "a23",
                "c24",
                "s24",
                "a24",
                "c25",
                "s25",
                "a25",
                "c23",
                "s23",
            ],
        ),
        _row(
            "R08",
            [
                "c23",
                "c23",
                "c23",
                "s23",
                "s23",
                "s23",
                "a23",
                "a23",
                "c24",
                "s24",
                "a24",
                "c25",
                "s25",
                "a25",
                "a23",
                "s23",
            ],
        ),
        _row(
            "R09",
            [
                "c23",
                "c23",
                "c23",
                "s23",
                "s23",
                "s23",
                "a23",
                "a23",
                "c24",
                "s24",
                "a24",
                "c25",
                "s25",
                "a25",
                "c23",
                "a23",
            ],
        ),
        _row(
            "R10",
            [
                "c23",
                "c23",
                "c23",
                "s23",
                "s23",
                "s23",
                "a23",
                "a23",
                "c24",
                "s24",
                "a24",
                "c25",
                "s25",
                "a25",
                "c23",
                "s23",
            ],
        ),
    ]

    return [
        RegressionCase(
            name="small_case",
            description="Small mixed layout with empty slots",
            suite_json={
                "SuiteId": "Suite-Regression-Small",
                "MaxPowerMW": 1.5,
                "EmergencyPowerMW": 0.2,
                "ComputeMinRSU": 8,
                "ComputeMaxRSU": 80,
                "StorageMinRSU": 8,
                "StorageMaxRSU": 80,
                "AIMinRSU": 8,
                "AIMaxRSU": 80,
                "Rows": [r["RowId"] for r in small_rows],
            },
            rows_json=small_rows,
            expected_snapshot={},
        ),
        RegressionCase(
            name="edge_power_limit",
            description="Near budget cap: replacements should not exceed power",
            suite_json={
                "SuiteId": "Suite-Regression-EdgePower",
                "MaxPowerMW": 0.398,
                "EmergencyPowerMW": 0.0,
                "ComputeMinRSU": 1,
                "ComputeMaxRSU": 100,
                "StorageMinRSU": 1,
                "StorageMaxRSU": 100,
                "AIMinRSU": 1,
                "AIMaxRSU": 100,
                "Rows": [r["RowId"] for r in edge_rows],
            },
            rows_json=edge_rows,
            expected_snapshot={},
        ),
        RegressionCase(
            name="dense_racks",
            description="Dense non-empty rows with heavy 2023 mix",
            suite_json={
                "SuiteId": "Suite-Regression-Dense",
                "MaxPowerMW": 4.5,
                "EmergencyPowerMW": 0.2,
                "ComputeMinRSU": 35,
                "ComputeMaxRSU": 300,
                "StorageMinRSU": 30,
                "StorageMaxRSU": 260,
                "AIMinRSU": 20,
                "AIMaxRSU": 320,
                "Rows": [r["RowId"] for r in dense_rows],
            },
            rows_json=dense_rows,
            expected_snapshot={},
        ),
    ]


@pytest.mark.parametrize("case", _make_cases(), ids=lambda c: c.name)
def test_rack_replacer_regression(
    case: RegressionCase, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
):
    case_dir = tmp_path / "regression_inputs" / case.name
    suite_path = case_dir / "suite.json"
    rows_path = case_dir / "rows.json"

    _write_json(suite_path, case.suite_json)
    _write_json(rows_path, case.rows_json)

    before_state = _build_state_from_rows(case.rows_json)
    _apply_suite_constraints_to_class(case.suite_json)

    rr = RackReplacer()

    # Keep regression tests self-contained: avoid writing production history.jsonl.
    monkeypatch.setattr(rr, "end_day_snapshot", lambda *args, **kwargs: None)

    after_state = rr(before_state)

    _assert_valid_suite_state(after_state, expected_positions=len(case.rows_json) * 16)
    _assert_constraints_not_violated(after_state)

    snapshot = _snapshot(case, before_state, after_state)
    snapshot_path = case_dir / "snapshot.json"
    _write_json(snapshot_path, snapshot)

    assert snapshot == case.expected_snapshot
