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
    <div style={{ padding: '16px 24px', minHeight: '100vh', backgroundColor: '#0f1115', color: '#fff', fontFamily: 'sans-serif' }}>

      {/* Top Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #222' }}>
        <h2 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: '#4A90E2' }}>Data Centre Suite</span>
          {plan && currentSuite ? (
            <span style={{ color: '#666', fontSize: '13px', fontWeight: 'normal' }}>{rows}x{cols} Configuration Viewer</span>
          ) : (
            <span style={{ color: '#666', fontSize: '13px', fontWeight: 'normal' }}>Configuration Viewer</span>
          )}
        </h2>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {plan && (
            <>
              <input type="file" accept=".json" onChange={handleFileUpload} disabled={loading} style={{ display: 'none' }} id="file-upload" />
              <select
                value={selectedSuiteIndex}
                onChange={(e) => setSelectedSuiteIndex(Number(e.target.value))}
                style={{ padding: '8px 14px', backgroundColor: '#1a1d24', color: '#fff', border: '1px solid #333', borderRadius: '6px', fontSize: '13px' }}
              >
                {plan.cluster_plans.map((suite, index) => (
                    <option key={index} value={index}>{suite.datacenter} - {suite.suite}</option>
                ))}
              </select>
            </>
          )}
          <button
            style={{
              padding: '8px 20px', backgroundColor: 'transparent', color: '#4CAF50',
              border: '1px solid #4CAF50', borderRadius: '6px', cursor: 'pointer',
              fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <span>&#9655;</span> Run Optimization
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div>
        {error && <div style={{ color: '#ff4444', marginBottom: '20px', textAlign: 'center' }}>{error}</div>}

        {plan && currentSuite && grid ? (
          <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, backgroundColor: '#1a1d24', padding: '24px', borderRadius: '8px', border: '1px solid #2a2d35', minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#ccc' }}>Suite Layout</div>
                <div style={{ fontSize: '12px', color: '#666' }}>{rows} rows &times; {cols} positions</div>
              </div>
              <DataCentreGrid
                title=""
                grid={grid}
              />
            </div>
            <Sidebar suite={currentSuite} />
          </div>
        ) : (
          !loading && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              marginTop: '80px', padding: '60px 20px', backgroundColor: '#1a1d24',
              borderRadius: '12px', border: '1px dashed #444', maxWidth: '600px', margin: '80px auto'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>📁</div>
              <h3 style={{ margin: '0 0 10px 0', color: '#E0E0E0', fontSize: '20px' }}>No Suite Configuration Loaded</h3>
              <p style={{ color: '#888', marginBottom: '30px', textAlign: 'center', fontSize: '14px', lineHeight: '1.5' }}>
                Upload a data centre layout file (.json) to visualize the rack configuration, <br/>
                compute capacity, and power distribution.
              </p>

              <label style={{
                backgroundColor: '#4A90E2', color: '#fff', padding: '12px 24px',
                borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px',
                transition: 'background-color 0.2s'
              }}>
                Choose JSON File
                <input type="file" accept=".json" onChange={handleFileUpload} style={{ display: 'none' }} />
              </label>
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default App;
