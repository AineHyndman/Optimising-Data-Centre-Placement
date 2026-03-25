import { IcoArrowRight } from './icons';

interface Move {
  row: number;
  col: number;
  rackType: string | null;
}

interface PlannedModificationsProps {
  moves: Move[];
  onClear: () => void;
  onUndo: (index: number) => void;
}

export const PlannedModifications: React.FC<PlannedModificationsProps> = ({ moves, onClear, onUndo }) => (
  <div className="rounded-xl border border-[#1e2028] p-5" style={{ backgroundColor: 'hsl(222 18% 11%)' }}>
    <div className="flex justify-between items-center mb-4">
      <span className="font-semibold text-[14px]">Planned Modifications ({moves.length})</span>
      <button
        onClick={onClear}
        className="text-xs text-red-400 bg-red-500/10 px-3 py-1 rounded border border-red-500/30 hover:bg-red-500/20 transition-colors"
      >
        Clear All
      </button>
    </div>
    <div className="space-y-2 max-h-40 overflow-y-auto">
      {moves.map((m, i) => (
        <div key={i} className="bg-[#0d1017] px-3 py-2 rounded border border-[#1e2028] text-sm flex justify-between items-center">
          <span className="flex items-center gap-2">
            <span className="text-[#555] font-mono">R{m.row.toString().padStart(2, '0')} P{m.col}</span>
            <IcoArrowRight />
            <span className="font-mono font-semibold" style={{ color: m.rackType ? 'hsl(210 100% 56%)' : 'hsl(160 84% 45%)' }}>
              {m.rackType || 'EMPTY'}
            </span>
          </span>
          <button onClick={() => onUndo(i)} className="text-[#555] hover:text-white text-xs transition-colors">Undo</button>
        </div>
      ))}
    </div>
  </div>
);
