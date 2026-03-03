import { useState } from 'react';
import './App.css';
import type { ClusterPlan } from './types';
import { parsePositionsToGrid } from './utils';
import { DataCentreGrid } from './DataCentreGrid';
import { Sidebar } from './Sidebar';

function App() {
  const [plan, setPlan] = useState<ClusterPlan | null>(null);
  const [selectedSuiteIndex, setSelectedSuiteIndex] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string>('');
  const [viewMode, setViewMode] = useState<'type' | 'power'>('type');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    setSelectedSuiteIndex(0);
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
    }
  };

  const handleRunOptimization = async () => {
    if (!plan) {
      setError('No plan loaded');
      return;
    }
    setIsOptimizing(true);
    setError('');
    try {
      const response = await fetch('http://localhost:8000/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plan),
      });
      if (!response.ok) throw new Error(`Server Error: ${response.statusText}`);
      const optimizedPlan = await response.json();
      setPlan(optimizedPlan);
    } catch (err) {
      setError(`Optimization failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsOptimizing(false);
    }
  };

  const currentSuite = plan?.cluster_plans?.[selectedSuiteIndex];
  const baseGrid = currentSuite ? parsePositionsToGrid(currentSuite.positions) : null;

  const rows = baseGrid?.length || 0;
  const cols = baseGrid?.[0]?.length || 0;

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
          {plan && <select value={selectedSuiteIndex} onChange={(e) => { setSelectedSuiteIndex(Number(e.target.value)); }} className="py-2 px-3.5 bg-[#1a1d24] text-white border border-[#333] rounded-md text-[13px]">
            {plan.cluster_plans.map((suite, index) => <option key={index} value={index}>{suite.datacenter} - {suite.suite}</option>)}
          </select>}
          <button
            disabled={!plan || isOptimizing}
            onClick={handleRunOptimization}
            className={`py-2 px-5 rounded-md text-[13px] font-bold border ${isOptimizing ? 'bg-[#666] text-white border-[#666] cursor-not-allowed' : 'bg-transparent text-[#4CAF50] border border-[#4CAF50] hover:bg-[#4CAF50] hover:text-black cursor-pointer'}`}>
            {isOptimizing ? 'Optimizing...' : 'Run Optimization'}
          </button>
        </div>
      </div>

      {error && <div className="mb-4 p-4 bg-red-900/20 border border-red-500 rounded-lg text-red-400 text-[14px]">{error}</div>}

      {plan && currentSuite && baseGrid ? (
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
              <DataCentreGrid grid={baseGrid} title="" viewMode={viewMode} rackTypes={plan.rack_types} />
            </div>
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
