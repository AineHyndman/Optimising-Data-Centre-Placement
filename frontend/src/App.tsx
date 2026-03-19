import { useState, useMemo } from 'react';
import './App.css';
import type { ClusterPlan, WeeklySummaryData } from './types';
import { parsePositionsToGrid } from './utils';
import { DataCentreGrid } from './DataCentreGrid';
import { Sidebar } from './Sidebar';
import { RackSelectorModal } from './RackSelectorModal';
import { WeeklySummary } from './WeeklySummary'; // NEW IMPORT

const LOCAL_API = 'http://localhost:8000';
const REMOTE_API = 'https://backend-125308697189.europe-north1.run.app';

async function getApiBase(): Promise<string> {
  try {
    const res = await fetch(`${LOCAL_API}/`, { method: 'GET', signal: AbortSignal.timeout(1000) });
    if (res.ok) return LOCAL_API;
  } catch { /* localhost not available */ }
  return REMOTE_API;
}

function App() {
  const [plan, setPlan] = useState<ClusterPlan | null>(null);
  const [selectedSuiteIndex, setSelectedSuiteIndex] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [viewMode, setViewMode] = useState<'type' | 'power'>('type');
  
  const [plannedMoves, setPlannedMoves] = useState<{row: number, col: number, rackType: string | null}[]>([]);
  const [modalPos, setModalPos] = useState<{row: number, col: number} | null>(null);

  // NEW STATE: Reporting & Simulation
  const [activeTab, setActiveTab] = useState<'layout' | 'report'>('layout');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [scheduleResults, setScheduleResults] = useState<WeeklySummaryData[] | null>(null);
  const [greenMode, setGreenMode] = useState<boolean>(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    setSelectedSuiteIndex(0);
    setPlannedMoves([]); 
    setScheduleResults(null); // Reset results on new file
    setActiveTab('layout'); // Reset to grid view
    setFileName(file.name);
    
    const formData = new FormData();
    formData.append('file', file);
    try {
      const api = await getApiBase();
      const response = await fetch(`${api}/upload-plan`, { method: 'POST', body: formData });
      if (!response.ok) throw new Error(`Server Error: ${response.statusText}`);
      const json = await response.json();
      setPlan(json);
    } catch {
      setError('Failed to process file. Is Docker running?');
    }
  };


  const currentSuite = plan?.cluster_plans?.[selectedSuiteIndex];
  const baseGrid = currentSuite ? parsePositionsToGrid(currentSuite.positions) : null;

  const localGrid = useMemo(() => {
    if (!baseGrid) return null;
    const newGrid = baseGrid.map(row => [...row]); 
    plannedMoves.forEach(move => {
      newGrid[move.row][move.col] = move.rackType; 
    });
    return newGrid;
  }, [baseGrid, plannedMoves]);

  const modifiedSuite = useMemo(() => {
    if (!currentSuite || !plan || plannedMoves.length === 0) return currentSuite;
    const moveMap = new Map(plannedMoves.map(m => [`${m.row},${m.col}`, m.rackType]));
    const rackSpecMap = new Map(plan.rack_types.map(r => [r.name, r]));
    const updatedPositions = currentSuite.positions.map(pos => {
      const key = `${Number(pos.row)},${Number(pos.position)}`;
      return moveMap.has(key) ? { ...pos, rack_type: moveMap.get(key) ?? '' } : pos;
    });
    let totalPower = 0, compute = 0, storage = 0, ai = 0;
    updatedPositions.forEach(pos => {
      const spec = pos.rack_type ? rackSpecMap.get(pos.rack_type) : undefined;
      if (!spec) return;
      totalPower += spec.power_need;
      compute += spec.resources.compute;
      storage += spec.resources.storage;
      ai += spec.resources.ai;
    });
    return { ...currentSuite, positions: updatedPositions, total_power_usage: totalPower, compute, storage, ai };
  }, [currentSuite, plannedMoves, plan]);

  const handleRackSelect = (newType: string | null) => {
    if (!modalPos || !localGrid) return;
    const currentType = localGrid[modalPos.row][modalPos.col];

    if (newType !== currentType) {
      setPlannedMoves(prev => {
        const filtered = prev.filter(m => m.row !== modalPos.row || m.col !== modalPos.col);
        return [...filtered, { row: modalPos.row, col: modalPos.col, rackType: newType }];
      });
    }
    setModalPos(null);
  };

  // NEW FUNCTION: Call Backend Schedule Endpoint
  const handleRunOptimization = async () => {
    if (!plan) return;
    setIsSimulating(true);
    setError('');
    
    try {
      const api = await getApiBase();
      const response = await fetch(`${api}/schedule?days=30`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...plan, optimisation_mode: greenMode ? 'green' : 'normal' })
      });
      
      if (!response.ok) throw new Error(`Simulation failed: ${response.statusText}`);
      
      const data = await response.json();
      
      // Handle either a direct array or a wrapped object depending on backend
      const summaries = data.weekly_summaries || data;
      setScheduleResults(summaries); 
      setActiveTab('report'); // Switch to the report view
      
    } catch (err) {
      setError('Failed to run optimization schedule. Check backend logs.');
      console.error(err);
    } finally {
      setIsSimulating(false);
    }
  };

  const rows = localGrid?.length || 0;
  const cols = localGrid?.[0]?.length || 0;

  return (
    <div className="px-6 py-4 min-h-screen bg-[#0f1115] text-white font-sans">
      <div className="flex justify-between items-center mb-5 pb-4 border-b border-[#222]">
        <h2 className="m-0 text-lg flex items-center gap-2.5">
          <img src="/meta.png" alt="Meta" className="h-6 w-auto" />
          <span className="text-[#4A90E2]">Data Centre Suite</span>
          {plan && <span className="text-[#666] text-[13px] font-normal border-l border-[#333] pl-3 ml-1">
            <span className="text-white font-bold mr-2">{fileName}</span> ({rows}x{cols})
          </span>}
        </h2>
        <div className="flex gap-3 items-center">
          {plan && (
            <select
              value={selectedSuiteIndex}
              onChange={(e) => {
                setSelectedSuiteIndex(Number(e.target.value));
                setPlannedMoves([]);
                setActiveTab('layout');
              }}
              className="py-2 px-3.5 bg-[#1a1d24] text-white border border-[#333] rounded-md text-[13px]"
            >
              {plan.cluster_plans.map((suite, index) => <option key={index} value={index}>{suite.datacenter} - {suite.suite}</option>)}
            </select>
          )}
          <div className="flex items-center gap-2 bg-[#1a1d24] border border-[#333] rounded-md px-3 py-1.5">
            <span className={`text-[12px] font-bold ${!greenMode ? 'text-white' : 'text-[#666]'}`}>Normal</span>
            <button
              onClick={() => setGreenMode(prev => !prev)}
              className={`relative w-10 h-5 rounded-full transition-colors ${greenMode ? 'bg-[#4CAF50]' : 'bg-[#444]'}`}
              aria-label="Toggle green mode"
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${greenMode ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
            <span className={`text-[12px] font-bold ${greenMode ? 'text-[#4CAF50]' : 'text-[#666]'}`}>Green</span>
          </div>
          <button
            onClick={handleRunOptimization}
            disabled={isSimulating || !plan}
            className={`py-2 px-5 rounded-md text-[13px] font-bold flex items-center gap-1.5 transition-colors
              ${isSimulating ? 'bg-[#333] text-[#888] cursor-not-allowed' : 'bg-transparent text-[#4CAF50] border border-[#4CAF50] hover:bg-[#4CAF50]/10'}`}
          >
            {isSimulating ? '⏳ Running...' : <><span>&#9655;</span> Run Optimization</>}
          </button>
        </div>
      </div>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      {plan && currentSuite && localGrid ? (
        
        // VIEW TOGGLE LOGIC
        activeTab === 'report' && scheduleResults ? (
          
          <WeeklySummary data={scheduleResults} onBack={() => setActiveTab('layout')} />
          
        ) : (
          
          <div className="flex gap-6 items-start">
            <div className="flex-1 min-w-0 flex flex-col gap-6">
              <div className="bg-[#1a1d24] p-6 rounded-lg border border-[#2a2d35]">
                <div className="flex justify-between items-center mb-4">
                  <div className="text-[15px] font-bold text-[#ccc]">Suite Layout</div>
                  <div className="flex bg-[#0f1115] rounded-md p-1 border border-[#333]">
                    <button onClick={() => setViewMode('type')} className={`px-3 py-1 text-xs font-bold rounded ${viewMode === 'type' ? 'bg-[#4A90E2] text-white' : 'text-[#888]'}`}>Rack View</button>
                    <button onClick={() => setViewMode('power')} className={`px-3 py-1 text-xs font-bold rounded ${viewMode === 'power' ? 'bg-[#F44336] text-white' : 'text-[#888]'}`}>Power Heatmap</button>
                  </div>
                </div>
                
                <DataCentreGrid 
                  grid={localGrid} 
                  title="" 
                  viewMode={viewMode} 
                  rackTypes={plan.rack_types} 
                  onCellClick={(row, col) => setModalPos({ row, col })}
                />
              </div>

              {plannedMoves.length > 0 && (
                <div className="bg-[#1a1d24] p-6 rounded-lg border border-[#2a2d35]">
                  <div className="flex justify-between mb-4">
                    <span className="font-bold">Planned Modifications ({plannedMoves.length})</span>
                    <button onClick={() => setPlannedMoves([])} className="text-xs text-red-500 bg-red-500/10 px-3 py-1 rounded border border-red-500/50">Clear All</button>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {plannedMoves.map((m, i) => (
                      <div key={i} className="bg-[#0f1115] p-3 rounded border border-[#333] text-sm flex justify-between items-center">
                        <span>
                          <span className="text-[#888] font-mono mr-2">Position: R{m.row.toString().padStart(2, '0')} P{m.col}</span> 
                          <span className="text-[#4A90E2] font-bold mx-2">→</span> 
                          <span className={`font-mono font-bold ${!m.rackType ? 'text-[#4CAF50]' : 'text-white'}`}>
                            {m.rackType || 'EMPTY'}
                          </span>
                        </span>
                        <button onClick={() => setPlannedMoves(prev => prev.filter((_, idx) => idx !== i))} className="text-[#666] hover:text-white text-xs">Undo</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <Sidebar suite={modifiedSuite!} constraints={plan.constraints} viewMode={viewMode} rackTypes={plan.rack_types} />
          </div>
        )
      ) : (
        <div className="flex flex-col items-center justify-center mt-20 p-20 bg-[#1a1d24] rounded-xl border border-dashed border-[#444] max-w-[600px] mx-auto text-center">
           <h3 className="text-xl mb-4">Upload a configuration to begin</h3>
           <label className="bg-[#4A90E2] text-white py-3 px-6 rounded-md cursor-pointer font-bold">
            Choose JSON File
            <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      )}

      {plan && modalPos && localGrid && (
        <RackSelectorModal
          isOpen={!!modalPos}
          onClose={() => setModalPos(null)}
          onSelect={handleRackSelect}
          position={modalPos}
          currentType={localGrid[modalPos.row][modalPos.col]}
          rackTypes={plan.rack_types}
        />
      )}
    </div>
  );
}
export default App;