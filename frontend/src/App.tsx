import { useState } from 'react';
import './App.css';
// Matches "types.ts" from your list
import type { ClusterPlan, SuitePlan } from './types';
// Matches "utils.ts" from your list
import { parsePositionsToGrid } from './utils';
// Matches "DataCentreGrid.tsx" from your list
import { DataCentreGrid } from './DataCentreGrid';

function App() {
  const [plan, setPlan] = useState<ClusterPlan | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');

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

  return (
    <div style={{ padding: '20px' }}>
      <h1>Data Centre Visualiser (Full Stack)</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <input type="file" accept=".json" onChange={handleFileUpload} disabled={loading} />
        
        {loading && <p>Processing on server...</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </div>

      {plan ? (
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          {plan.cluster_plans.map((suite: SuitePlan, index: number) => (
            <DataCentreGrid 
              key={index}
              title={`Suite: ${suite.datacenter || 'Unknown'} - ${suite.suite || index + 1}`}
              grid={parsePositionsToGrid(suite.positions)}
            />
          ))}
        </div>
      ) : (
        <p>Please upload a plan to see the visualization.</p>
      )}
    </div>
  );
}

export default App;