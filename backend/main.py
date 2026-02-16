import json

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from models import PlanData

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

@app.get("/")
def read_root():
    return {"Hello": "World"}

@app.post("/upload-plan", response_model=PlanData)
async def upload_plan(file: UploadFile = File(...)):
    content = await file.read()
    
    try:
        data = json.loads(content)
        plan = PlanData(**data)
        return plan
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file format")
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))