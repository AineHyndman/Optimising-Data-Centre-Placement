import { useState } from 'react';
import './App.css';
import type { ClusterPlan } from './types'; 
import { parsePositionsToGrid } from './utils';
import { DataCentreGrid } from './DataCentreGrid';
import { Sidebar } from './Sidebar'; // <-- Import the new Sidebar

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

  return (
    <div style={{ padding: '20px', minHeight: '100vh', backgroundColor: '#0f1115', color: '#fff', fontFamily: 'sans-serif' }}>
      
      {/* Top Header Section */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #333', paddingBottom: '15px' }}>
        <h2 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: '#4A90E2' }}>🗄️ Data Centre Suite</span> 
          <span style={{ color: '#666', fontSize: '12px', fontWeight: 'normal' }}>Configuration Viewer</span>
        </h2>
        
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <input type="file" accept=".json" onChange={handleFileUpload} disabled={loading} style={{ fontSize: '14px', color: '#ccc' }}/>
          
          {plan && (
            <select 
              value={selectedSuiteIndex} 
              onChange={(e) => setSelectedSuiteIndex(Number(e.target.value))}
              style={{ padding: '6px 12px', backgroundColor: '#1a1d24', color: '#fff', border: '1px solid #333', borderRadius: '4px' }}
            >
              {plan.cluster_plans.map((suite, index) => (
                  <option key={index} value={index}>{suite.datacenter} - {suite.suite}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {error && <div style={{ color: '#ff4444', marginBottom: '20px' }}>{error}</div>}
        
        {plan && currentSuite ? (
          // Two-Column Flex Layout
          <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
            
            {/* Left Column: Grid */}
            <div style={{ flex: 1, backgroundColor: '#1a1d24', padding: '24px', borderRadius: '8px', border: '1px solid #333' }}>
              <div style={{ marginBottom: '20px', fontSize: '14px', fontWeight: 'bold', color: '#ccc' }}>Suite Layout</div>
              <DataCentreGrid 
                title="" 
                grid={parsePositionsToGrid(currentSuite.positions)}
              />
            </div>

            {/* Right Column: Sidebar */}
            <Sidebar suite={currentSuite} />

          </div>
        ) : (
          !loading && <div style={{ textAlign: 'center', color: '#666', marginTop: '100px' }}>Upload a JSON plan to begin.</div>
        )}
      </div>
    </div>
  );
}

export default App;