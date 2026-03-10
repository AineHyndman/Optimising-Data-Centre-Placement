import React from 'react';
import type { RackSpec } from './types';

interface RackSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (rackType: string | null) => void;
  position: { row: number; col: number } | null;
  currentType: string | null;
  rackTypes: RackSpec[];
}

export const RackSelectorModal: React.FC<RackSelectorModalProps> = ({
  isOpen, onClose, onSelect, position, currentType, rackTypes
}) => {
  if (!isOpen || !position) return null;

  // Helper to group racks by their starting letter (C, S, A)
  const getRacksByCategory = (prefix: string) => 
    rackTypes.filter(r => r.name.startsWith(prefix) || r.type === prefix);

  const categories = [
    { label: 'Compute', prefix: 'C', color: 'text-[#4A90E2]', border: 'border-[#4A90E2]' },
    { label: 'Storage', prefix: 'S', color: 'text-[#50E3C2]', border: 'border-[#50E3C2]' },
    { label: 'AI', prefix: 'A', color: 'text-[#BD10E0]', border: 'border-[#BD10E0]' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      {/* Click outside the modal box to close */}
      <div className="absolute inset-0" onClick={onClose}></div>
      
      <div className="relative bg-[#1a1d24] border border-[#333] rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#333] flex justify-between items-center bg-[#1f2229] rounded-t-xl">
          <div>
            <h3 className="text-lg font-bold text-white">Modify Rack Configuration</h3>
            <p className="text-xs text-[#888] font-mono mt-0.5">
              Target Position: R{position.row.toString().padStart(2, '0')} P{position.col}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-6 overflow-y-auto">
          
          {/* Option 1: Empty Slot */}
          <div 
            onClick={() => onSelect(null)}
            className={`mb-6 p-4 rounded-lg border-2 cursor-pointer transition-all flex justify-between items-center group
              ${currentType === null ? 'border-[#4CAF50] bg-[#1b2e20]/50' : 'border-[#333] hover:border-[#555] bg-[#0f1115]'}`}
          >
            <div>
              <div className={`font-bold ${currentType === null ? 'text-[#4CAF50]' : 'text-gray-400 group-hover:text-white'}`}>Empty Slot</div>
              <div className="text-xs text-gray-500">Clear current rack from this position</div>
            </div>
            <div className="text-xs font-mono text-gray-600">0 kW / 0 RSU</div>
          </div>

          {/* Option 2: Available Rack Types Grouped by Category */}
          <div className="space-y-6">
            {categories.map((cat) => {
              const racks = getRacksByCategory(cat.prefix);
              if (racks.length === 0) return null; // Skip empty categories

              return (
                <div key={cat.label}>
                  <h4 className={`text-xs uppercase tracking-widest font-bold mb-3 ${cat.color} opacity-80`}>
                    {cat.label} Nodes
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {racks.map((rack) => {
                      const isSelected = currentType === rack.name;
                      return (
                        <div 
                          key={rack.name}
                          onClick={() => onSelect(rack.name)}
                          className={`p-3 rounded-md border-2 cursor-pointer transition-all relative overflow-hidden
                            ${isSelected ? `${cat.border} bg-[#1a2533]` : 'border-[#222] hover:border-[#444] bg-[#0f1115]'}`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className={`font-bold font-mono ${isSelected ? 'text-white' : 'text-[#ccc]'}`}>
                              {rack.name}
                            </span>
                            {isSelected && <span className="text-[10px] bg-white/10 px-1.5 rounded text-white">CURRENT</span>}
                          </div>
                          <div className="flex justify-between items-end text-[11px] text-gray-500 font-mono">
                            <span>{rack.power_need} kW</span>
                            <span>1 RSU</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};