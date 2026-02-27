import { useState, useMemo } from 'react';
import './App.css';
import type { ClusterPlan } from './types';
import { parsePositionsToGrid } from './utils';
import { DataCentreGrid } from './DataCentreGrid';
import { Sidebar } from './Sidebar';
import { RackSelectorModal } from './RackSelectorModal'; // IMPORT THE NEW MODAL

function App() {
  const [plan, setPlan] = useState<ClusterPlan | null>(null);
  const [selectedSuiteIndex, setSelectedSuiteIndex] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string>('');
  const [viewMode, setViewMode] = useState<'type' | 'power'>('type');
  
  // NEW STATE: Planned Moves & Modal Tracking
  const [plannedMoves, setPlannedMoves] = useState<{row: number, col: number, rackType: string | null}[]>([]);
  const [modalPos, setModalPos] = useState<{row: number, col: number} | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError('');
    setSelectedSuiteIndex(0);
    setPlannedMoves([]); 
    setFileName(file.name);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch('http://localhost:8000/upload-plan', { method: 'POST', body: formData });
      if (!response.ok) throw new Error(`Server Error: ${response.statusText}`);
      const json = await response.json();
      setPlan(json);
    } catch {
      setError('Failed to process file. Is Docker running?');
    } finally {
      setLoading(false);
    }
  };

  const currentSuite = plan?.cluster_plans?.[selectedSuiteIndex];
  const baseGrid = currentSuite ? parsePositionsToGrid(currentSuite.positions) : null;

  // Derive the local grid by applying planned moves on top of the base grid
  const localGrid = useMemo(() => {
    if (!baseGrid) return null;
    const newGrid = baseGrid.map(row => [...row]); 
    plannedMoves.forEach(move => {
      newGrid[move.row][move.col] = move.rackType; 
    });
    return newGrid;
  }, [baseGrid, plannedMoves]);

  // Handle the selection from the modal
  const handleRackSelect = (newType: string | null) => {
    if (!modalPos || !localGrid) return;
    const currentType = localGrid[modalPos.row][modalPos.col];

    // Only record if it actually changed
    if (newType !== currentType) {
      setPlannedMoves(prev => {
        // Remove any previous moves for this exact cell to prevent duplicates
        const filtered = prev.filter(m => m.row !== modalPos.row || m.col !== modalPos.col);
        return [...filtered, {
          row: modalPos.row,
          col: modalPos.col,
          rackType: newType
        }];
      });
    }
    setModalPos(null); // Close modal
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
          {plan && <select value={selectedSuiteIndex} onChange={(e) => { setSelectedSuiteIndex(Number(e.target.value)); setPlannedMoves([]); }} className="py-2 px-3.5 bg-[#1a1d24] text-white border border-[#333] rounded-md text-[13px]">
            {plan.cluster_plans.map((suite, index) => <option key={index} value={index}>{suite.datacenter} - {suite.suite}</option>)}
          </select>}
          <button className="py-2 px-5 bg-transparent text-[#4CAF50] border border-[#4CAF50] rounded-md text-[13px] font-bold">Run Optimization</button>
        </div>
      </div>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      {plan && currentSuite && localGrid ? (
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
                onCellClick={(row, col) => setModalPos({ row, col })} // Open Modal on Click
              />
            </div>

            {/* PLANNED MOVES PANEL */}
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
          
          <Sidebar suite={currentSuite} constraints={plan.constraints} viewMode={viewMode} rackTypes={plan.rack_types} />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center mt-20 p-20 bg-[#1a1d24] rounded-xl border border-dashed border-[#444] max-w-[600px] mx-auto text-center">
           <h3 className="text-xl mb-4">Upload a configuration to begin</h3>
           <label className="bg-[#4A90E2] text-white py-3 px-6 rounded-md cursor-pointer font-bold">
            Choose JSON File
            <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      )}

      {/* RENDER THE MODAL */}
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