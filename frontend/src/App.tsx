import { useState } from 'react';
import './App.css';
import type { ClusterPlan } from './types'; 
import { parsePositionsToGrid } from './utils';
import { DataCentreGrid } from './DataCentreGrid';

function App() {
  const [plan, setPlan] = useState<ClusterPlan | null>(null);
  const [selectedSuiteIndex, setSelectedSuiteIndex] = useState<number>(0); // <--- New State
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');
    // Reset selection to the first suite when a new file is uploaded
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

  // Helper to safely get the current suite
  const currentSuite = plan?.cluster_plans?.[selectedSuiteIndex];

  return (
    <div style={{ padding: '20px' }}>
      <h1>Data Centre Visualiser</h1>
      
      {/* File Upload Section */}
      <div style={{ marginBottom: '20px' }}>
        <input type="file" accept=".json" onChange={handleFileUpload} disabled={loading} />
        {loading && <p>Processing on server...</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </div>

      {/* Main Visualization Section */}
      {plan && currentSuite ? (
        <div>
          {/* --- THE NEW DROPDOWN --- */}
          <div style={{ marginBottom: '20px' }}>
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

          {/* Render ONLY the selected suite */}
          <DataCentreGrid 
            title={`Viewing: ${currentSuite.datacenter} - ${currentSuite.suite}`}
            grid={parsePositionsToGrid(currentSuite.positions)}
          />
          
          <p style={{ fontSize: '0.9rem', color: '#666' }}>
            Showing suite {selectedSuiteIndex + 1} of {plan.cluster_plans.length}
          </p>
        </div>
      ) : (
        !loading && <p>Please upload a plan to see the visualization.</p>
      )}
    </div>
  );
}

export default App;