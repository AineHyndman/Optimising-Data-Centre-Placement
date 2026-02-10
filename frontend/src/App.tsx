import { useState, useMemo } from 'react';
import './App.css';
import type { ClusterPlan } from './types'; 
import { parsePositionsToGrid } from './utils';
import { DataCentreGrid } from './DataCentreGrid';

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

      if (!response.ok) {
        throw new Error(`Server Error: ${response.statusText}`);
      }

      const json = await response.json();
      setPlan(json);
      
    } catch (err) {
      setError('Failed to process file with backend. Is Docker running?');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Safely get the current suite
  const currentSuite = plan?.cluster_plans?.[selectedSuiteIndex];

  // --- Stats Calculation Logic ---
  const stats = useMemo(() => {
    if (!currentSuite) return { gen23: 0, gen24: 0, gen25: 0 };

    let gen23 = 0;
    let gen24 = 0;
    let gen25 = 0;

    currentSuite.positions.forEach(pos => {
        const id = pos.rack_type;
        if (id.endsWith('23')) gen23++;
        if (id.endsWith('24')) gen24++;
        if (id.endsWith('25')) gen25++;
    });

    return { gen23, gen24, gen25 };
  }, [currentSuite]);
  // ------------------------------

  return (
    <div style={{ padding: '20px' }}>
      <h1>Data Centre Visualiser</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <input type="file" accept=".json" onChange={handleFileUpload} disabled={loading} />
        {loading && <p>Processing on server...</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </div>

      {plan && currentSuite ? (
        <div>
          {/* Controls Container (Dropdown + Stats) */}
          <div style={{ marginBottom: '20px', display: 'flex', gap: '20px', alignItems: 'center' }}>
            
            {/* Suite Selector */}
            <div>
                <label style={{ marginRight: '10px', fontWeight: 'bold' }}>Select Suite:</label>
                <select 
                  value={selectedSuiteIndex} 
                  onChange={(e) => setSelectedSuiteIndex(Number(e.target.value))}
                  style={{ padding: '5px', fontSize: '16px' }}
                >
                  {plan.cluster_plans.map((suite, index) => (
                      <option key={index} value={index}>
                      {suite.datacenter} - {suite.suite}
                      </option>
                  ))}
                </select>
            </div>
            
            {/* Stats Bar (Dark Theme) */}
            <div style={{ 
                  padding: '10px', 
                  backgroundColor: '#333',
                  color: '#eee',
                  borderRadius: '5px', 
                  display: 'flex', 
                  gap: '15px',
                  border: '1px solid #555'
              }}>
                  <span><strong>2023:</strong> {stats.gen23}</span>
                  <span><strong>2024:</strong> {stats.gen24}</span>
                  <span><strong>2025:</strong> {stats.gen25}</span>
            </div>
            
          </div> {/* <-- This closing div was the likely cause of the error */}

          {/* Grid Visualization */}
          <DataCentreGrid 
            title={`Viewing: ${currentSuite.datacenter} - ${currentSuite.suite}`}
            grid={parsePositionsToGrid(currentSuite.positions)}
          />
        </div>
      ) : (
        !loading && <p>Please upload a plan to see the visualization.</p>
      )}
    </div>
  );
}

export default App;