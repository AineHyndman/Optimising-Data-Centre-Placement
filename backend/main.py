import json

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from src.simulation.engine import SimulationEngine
from src.simulation.tasks.rack_replacer import RackReplacer
from copy import deepcopy
from src.domain.models import Position, Rack, PlanData, SuitePlan, SuiteState

#from src.simulation_engine.planners import example_planner

app = FastAPI()

# --- NEW: Allow the Frontend to talk to us ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # The address of your React app
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ---------------------------------------------

def plan_to_suite_state(plan: PlanData, suite_index: int = 0) -> SuiteState:
        suite: SuitePlan = plan.cluster_plans[suite_index]

        positions_dict = {}
        racks_dict = {}

        for i, pos in enumerate(suite.positions):
            rack = None

            if hasattr(pos, "rack_type") and pos.rack_type != "empty":
                

                rack_id = f"{pos.row}-{pos.position}"
                rack = Rack(
                    rack_id=rack_id,
                    generation=pos.rack_type,
                    rack_type=pos.rack_type,
                    service="unknown",
                    year=2023,
                    color="gray"
                )
                racks_dict[rack_id] = rack

            positions_dict[(int(pos.row), int(pos.position))] = rack
        
        return SuiteState(day=0, positions=positions_dict, racks=racks_dict)

def suite_state_to_plan(suite_state: SuiteState, original_plan: PlanData, suite_index: int = 0) -> PlanData:
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

