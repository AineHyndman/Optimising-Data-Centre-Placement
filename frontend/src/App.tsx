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
  const [loading, setLoading] = useState<boolean>(false);
  // NEW STATE FOR HEATMAP TOGGLE
  const [viewMode, setViewMode] = useState<'type' | 'power'>('type');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');
    setSelectedSuiteIndex(0);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:8000/upload-plan', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error(`Server Error: ${response.statusText}`);

      const json = await response.json();
      setPlan(json);

    } catch (err) {
      setError('Failed to process file with backend. Is Docker running?');
    } finally {
      setLoading(false);
    }
  };

  const currentSuite = plan?.cluster_plans?.[selectedSuiteIndex];
  const grid = currentSuite ? parsePositionsToGrid(currentSuite.positions) : null;
  const rows = grid?.length || 0;
  const cols = grid?.[0]?.length || 0;

  return (
    <div className="px-6 py-4 min-h-screen bg-[#0f1115] text-white font-sans">

      {/* Top Header Section */}
      <div className="flex justify-between items-center mb-5 pb-4 border-b border-[#222]">
        <h2 className="m-0 text-lg flex items-center gap-2.5">
          <img src="/meta.png" alt="Meta" className="h-6 w-auto" />
          <span className="text-[#4A90E2]">Data Centre Suite</span>
          {plan && currentSuite ? (
            <span className="text-[#666] text-[13px] font-normal">{rows}x{cols} Configuration Viewer</span>
          ) : (
            <span className="text-[#666] text-[13px] font-normal">Configuration Viewer</span>
          )}
        </h2>

        <div className="flex gap-3 items-center">
          {plan && (
            <>
              <input type="file" accept=".json" onChange={handleFileUpload} disabled={loading} className="hidden" id="file-upload" />
              <select
                value={selectedSuiteIndex}
                onChange={(e) => setSelectedSuiteIndex(Number(e.target.value))}
                className="py-2 px-3.5 bg-[#1a1d24] text-white border border-[#333] rounded-md text-[13px]"
              >
                {plan.cluster_plans.map((suite, index) => (
                    <option key={index} value={index}>{suite.datacenter} - {suite.suite}</option>
                ))}
              </select>
            </>
          )}
          <button className="py-2 px-5 bg-transparent text-[#4CAF50] border border-[#4CAF50] rounded-md cursor-pointer text-[13px] font-bold flex items-center gap-1.5">
            <span>&#9655;</span> Run Optimization
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div>
        {error && <div className="text-red-500 mb-5 text-center">{error}</div>}

        {plan && currentSuite && grid ? (
          <div className="flex gap-6 items-start">
            <div className="flex-1 bg-[#1a1d24] p-6 rounded-lg border border-[#2a2d35] min-w-0">
              
              {/* SUITE LAYOUT HEADER WITH TOGGLE BUTTONS */}
              <div className="flex justify-between items-center mb-4">
                <div>
                  <div className="text-[15px] font-bold text-[#ccc]">Suite Layout</div>
                  <div className="text-xs text-[#666]">{rows} rows &times; {cols} positions</div>
                </div>
                
                <div className="flex bg-[#0f1115] rounded-md p-1 border border-[#333]">
                  <button 
                    onClick={() => setViewMode('type')}
                    className={`px-3 py-1 text-xs font-bold rounded transition-colors ${viewMode === 'type' ? 'bg-[#4A90E2] text-white' : 'text-[#888] hover:text-[#ccc]'}`}
                  >
                    Rack View
                  </button>
                  <button 
                    onClick={() => setViewMode('power')}
                    className={`px-3 py-1 text-xs font-bold rounded transition-colors ${viewMode === 'power' ? 'bg-[#F44336] text-white' : 'text-[#888] hover:text-[#ccc]'}`}
                  >
                    Power Heatmap
                  </button>
                </div>
              </div>

              {/* UPDATED GRID CALL */}
              <DataCentreGrid
                title=""
                grid={grid}
                viewMode={viewMode}
                rackTypes={plan.rack_types}
              />
            </div>
            
            {/* UPDATED SIDEBAR CALL */}
            <Sidebar suite={currentSuite} viewMode={viewMode} />
          </div>
        ) : (
          !loading && (
            <div className="flex flex-col items-center justify-center mt-20 p-[60px_20px] bg-[#1a1d24] rounded-xl border border-dashed border-[#444] max-w-[600px] mx-auto">
              <div className="text-5xl mb-5">📁</div>
              <h3 className="m-0 mb-2.5 text-[#E0E0E0] text-xl">No Suite Configuration Loaded</h3>
              <p className="text-[#888] mb-7 text-center text-sm leading-relaxed">
                Upload a data centre layout file (.json) to visualize the rack configuration, <br/>
                compute capacity, and power distribution.
              </p>

              <label className="bg-[#4A90E2] text-white py-3 px-6 rounded-md cursor-pointer font-bold text-sm transition-colors duration-200 hover:bg-[#3a7bd5]">
                Choose JSON File
                <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default App;