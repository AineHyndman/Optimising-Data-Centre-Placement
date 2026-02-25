import { useState, useMemo } from 'react';
import './App.css';
import type { ClusterPlan, RackSpec } from './types';
import { parsePositionsToGrid, type Grid } from './utils';
import { DataCentreGrid } from './DataCentreGrid';
import { Sidebar } from './Sidebar';

function App() {
  const [plan, setPlan] = useState<ClusterPlan | null>(null);
  const [selectedSuiteIndex, setSelectedSuiteIndex] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string>('');
  const [viewMode, setViewMode] = useState<'type' | 'power'>('type');
  const [plannedMoves, setPlannedMoves] = useState<{from: [number,number], to: [number,number], rackType: string}[]>([]);

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
    } catch (err) {
      setError('Failed to process file. Is Docker running?');
    } finally {
      setLoading(false);
    }
  };

  const currentSuite = plan?.cluster_plans?.[selectedSuiteIndex];
  const baseGrid = currentSuite ? parsePositionsToGrid(currentSuite.positions) : null;
  
  // Apply Moves to Grid
  const localGrid = useMemo(() => {
    if (!baseGrid) return null;
    const newGrid = baseGrid.map(row => [...row]); 
    plannedMoves.forEach(move => {
      newGrid[move.from[0]][move.from[1]] = null; 
      newGrid[move.to[0]][move.to[1]] = move.rackType; 
    });
    return newGrid;
  }, [baseGrid, plannedMoves]);

  // Issue 3: Power Summary Logic
  const powerSummary = useMemo(() => {
    if (!plan || !localGrid || !baseGrid) return { before: 0, after: 0 };
    const calculateGridPower = (g: Grid) => {
      let total = 0;
      g.forEach(row => row.forEach(cell => {
        if (cell) {
          const spec = plan.rack_types.find(r => r.type.charAt(0).toUpperCase() === cell.charAt(0).toUpperCase());
          total += spec?.power_need || 0;
        }
      }));
      return total;
    };
    return { before: calculateGridPower(baseGrid), after: calculateGridPower(localGrid) };
  }, [plan, baseGrid, localGrid]);

  const handleMove = (fromRow: number, fromCol: number, toRow: number, toCol: number) => {
    if (!localGrid) return;
    const rackType = localGrid[fromRow][fromCol];
    if (!rackType) return;
    setPlannedMoves(prev => [...prev, { from: [fromRow, fromCol], to: [toRow, toCol], rackType }]);
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
              <DataCentreGrid grid={localGrid} title="" viewMode={viewMode} rackTypes={plan.rack_types} onMove={handleMove} />
            </div>

            {plannedMoves.length > 0 && (
              <div className="bg-[#1a1d24] p-6 rounded-lg border border-[#2a2d35]">
                <div className="flex justify-between items-center mb-4">
                  <div className="text-[15px] font-bold text-[#ccc]">Planned Moves ({plannedMoves.length})</div>
                  <button onClick={() => setPlannedMoves([])} className="text-xs bg-red-500/10 text-red-500 border border-red-500 px-3 py-1 rounded">Clear All</button>
                </div>
                {/* Issue 3: Before vs After Summary */}
                <div className="mb-4 p-3 bg-[#0f1115] rounded border border-[#333] flex justify-between text-sm">
                   <span className="text-[#888]">Power Impact: <span className="text-white font-mono">{powerSummary.before}kW</span> → <span className={`font-mono ${powerSummary.after > plan.constraints.power_budget ? 'text-red-500' : 'text-[#4CAF50]'}`}>{powerSummary.after}kW</span></span>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {plannedMoves.map((move, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-[#0f1115] p-2 rounded text-xs border border-[#222]">
                      <span>{move.rackType}: R{move.from[0]} P{move.from[1]} → R{move.to[0]} P{move.to[1]}</span>
                      <button onClick={() => setPlannedMoves(prev => prev.filter((_, i) => i !== idx))} className="text-[#666] hover:text-white">Undo</button>
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
    </div>
  );
}
export default App;