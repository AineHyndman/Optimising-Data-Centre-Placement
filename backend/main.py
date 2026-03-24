import json

import os
from src.simulation.check_data import CheckData
from pydantic import BaseModel
from typing import List, Literal, Optional
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from src.simulation.engine import SimulationEngine
from src.simulation.tasks.rack_replacer import RackReplacer
from copy import deepcopy
from src.simulation.state import SuiteState as SimSuiteState, EmergencyState
from src.model.rack import Rack as SimRack
from src.model.position import Position as SimPosition
from src.domain.models import PlanData, Position, SuitePlan

#from src.simulation_engine.planners import example_planner

app = FastAPI()

# --- NEW: Allow the Frontend to talk to us ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://frontend-125308697189.europe-north1.run.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ---------------------------------------------

def plan_to_suite_state(plan: PlanData, suite_index: int = 0):
    suite = plan.cluster_plans[suite_index]
    positions_dict = {}
    racks_dict = {}

    for pos in suite.positions:
        code = pos.rack_type.lower() if pos.rack_type and pos.rack_type != "empty" else ""
        sim_pos = SimPosition(suite=suite_index, row=int(pos.row), position=int(pos.position))
        rack = SimRack(code)
        positions_dict[sim_pos] = rack
        racks_dict[code] = rack

    return SimSuiteState(day=0, positions=positions_dict, racks=racks_dict, emergencyState=EmergencyState())

def suite_state_to_plan(suite_state: SimSuiteState, original_plan: PlanData, suite_index: int = 0) -> PlanData:
    plan = deepcopy(original_plan)
    suite = plan.cluster_plans[suite_index]

    new_positions = []
    for (row,col), rack in suite_state.positions.items():
        new_positions.append(Position(
            row=str(row),
            position=str(col),
            rack_type=rack.generation if rack else "empty"
        ))

    suite.positions = new_positions
    plan.cluster_plans[suite_index] = suite
    return plan

@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.post("/upload-plan", response_model=PlanData)
async def upload_plan(file: UploadFile = File(...)):
    try:
        content = await file.read()
        data = json.loads(content)

        print("Received data:", data)

        plan = PlanData(**data)
        return plan

    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file format")
    
    except Exception as e:
        print("Error:", str(e))
        raise HTTPException(status_code=422, detail=str(e))
    
@app.post("/run-plan",response_model=PlanData)
async def run_plan(file: UploadFile = File(...)):
    try:
        content = await file.read()
        data = json.loads(content)

        plan = PlanData(**data)

        suite_state = plan_to_suite_state(plan,suite_index=0)

        engine = SimulationEngine(suite_state)
        engine.fast_forward(1,lambda state: [])

        updated_plan = suite_state_to_plan(engine.current_state,plan,suite_index=0)

        return updated_plan

    except json.JSONDecodeError:
        raise HTTPException(status_code=400,detail="Invalid JSON file format")

    except Exception as e:
        print("Error:", str(e))
        raise HTTPException(status_code=422, detail=str(e))

@app.post("/optimize", response_model=PlanData)
async def optimize_plan(plan: PlanData, days: int = 1):
    try:
        suite_state = plan_to_suite_state(plan, suite_index=0)

        engine = SimulationEngine(suite_state)
        rack_replacer = RackReplacer()
        engine.fast_forward(days, rack_replacer)

        updated_plan = suite_state_to_plan(engine.current_state, plan, suite_index=0)

        return updated_plan

    except Exception as e:
        print("Error during optimization:", str(e))
        raise HTTPException(status_code=422, detail=str(e))

class RsuTotals(BaseModel):
    compute: float
    storage: float
    ai: float

class ChangedPosition(BaseModel):
    row: int
    position: int
    old_rack: Optional[str]
    new_rack: Optional[str]

class WeeklySummaryResponse(BaseModel):
    week: int
    racks_replaced: int
    power_saved: float
    total_power_usage: float
    rsu_totals: RsuTotals
    changed_positions: List[ChangedPosition]

def _get_position_map(state: SimSuiteState) -> dict:
    """Returns {(row, position): rack.code} for a given SuiteState."""
    return {
        (pos.row, pos.position): rack.code
        for pos, rack in state.positions.items()
    }



class ScheduleRequest(PlanData):
    optimisation_mode: Literal["normal", "green"] = "normal"

def _state_to_positions(state: SimSuiteState) -> list:
    """Convert a SuiteState to a list of {row, position, rack_type} dicts (0-indexed)."""
    return [
        {"row": pos.row, "position": pos.position, "rack_type": rack.code}
        for pos, rack in state.positions.items()
        if rack and rack.code
    ]

def _get_position_map(state: SimSuiteState) -> dict:
    """Returns {(row, position): rack.code} for quick comparison between states."""
    return {
        (pos.row, pos.position): rack.code
        for pos, rack in state.positions.items()
    }

@app.post("/schedule")
async def schedule_plan(plan: ScheduleRequest, days: int = 30):
    try:
        if os.path.exists("history.jsonl"):
            os.remove("history.jsonl")

        suite_state = plan_to_suite_state(plan, suite_index=0)
        engine = SimulationEngine(suite_state)

        green = plan.optimisation_mode == "green"
        engine.fast_forward(days, green=green)

        checker = CheckData()
        num_weeks = (days + 6) // 7
        summaries = []
        initial_state = engine.history.get(0, engine.current_state)

        for week in range(num_weeks):
            week_data = checker.check_week(week, days)
            week_start_day = week * 7
            week_end_day = min((week + 1) * 7, days)
            prev_state = engine.history.get(week_start_day, initial_state)
            week_state = engine.history.get(week_end_day, engine.current_state)

            prev_map = _get_position_map(prev_state)
            curr_map = _get_position_map(week_state)
            changed_positions = [
                {"row": row, "position": pos, "old_rack": prev_map.get((row, pos)), "new_rack": new_rack}
                for (row, pos), new_rack in curr_map.items()
                if prev_map.get((row, pos)) != new_rack
            ]

            rsu = week_state.get_rsu_per_service()
            summaries.append({
                "week": week + 1,
                "racks_replaced": week_data.get("net_racks_changed", 0),
                "power_saved": -week_data.get("net_power_change", 0),
                "total_power_usage": week_state.total_power_kw(),
                "rsu_totals": {
                    "compute": rsu.get("Compute", 0),
                    "storage": rsu.get("Storage", 0),
                    "ai": rsu.get("AI", 0),
                },
                "changed_positions": changed_positions,
                "grid_positions": _state_to_positions(week_state),
            })

        return {
            "initial_positions": _state_to_positions(initial_state),
            "weeks": summaries,
        }

    except Exception as e:
        print("Error during schedule:", str(e))
        raise HTTPException(status_code=422, detail=str(e))