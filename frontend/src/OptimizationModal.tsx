import { IcoLightning } from './icons';

interface OptimizationModalProps {
  optWeeks: number;
  setOptWeeks: (n: number) => void;
  optMaxPerDay: number;
  setOptMaxPerDay: (n: number) => void;
  greenMode: boolean;
  onClose: () => void;
  onRun: (weeks: number, maxPerDay: number) => void;
}

export const OptimizationModal: React.FC<OptimizationModalProps> = ({
  optWeeks, setOptWeeks, optMaxPerDay, setOptMaxPerDay, greenMode, onClose, onRun,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}>
    <div className="w-[420px] rounded-2xl border border-[#2a2d35] p-6 shadow-2xl" style={{ backgroundColor: 'hsl(222 20% 10%)' }}>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-[15px] font-bold text-white flex items-center gap-2">
          <IcoLightning /> Optimization Settings
        </h3>
        <button onClick={onClose} className="text-[#555] hover:text-white transition-colors text-lg leading-none">✕</button>
      </div>

      {/* Duration */}
      <div className="mb-5">
        <label className="block text-[11px] text-[#555] uppercase font-bold tracking-widest mb-2">
          Duration (weeks)
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range" min={1} max={52} value={optWeeks}
            onChange={e => setOptWeeks(Number(e.target.value))}
            className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, hsl(210 100% 56%) 0%, hsl(210 100% 56%) ${((optWeeks - 1) / 51) * 100}%, hsl(222 15% 20%) ${((optWeeks - 1) / 51) * 100}%, hsl(222 15% 20%) 100%)`,
            }}
          />
          <input
            type="number" min={1} max={52} value={optWeeks}
            onChange={e => setOptWeeks(Math.min(52, Math.max(1, Number(e.target.value))))}
            className="w-16 text-center py-1.5 text-white text-[13px] font-mono font-bold rounded-md border border-[#2a2d35] bg-[#1a1d24] focus:outline-none focus:border-[hsl(210_100%_56%)]"
          />
          <span className="text-[12px] text-[#555] w-10">wks</span>
        </div>
        <p className="text-[11px] text-[#444] mt-1.5">{optWeeks * 7} days · ~{optWeeks * 5} working days</p>
      </div>

      {/* Max racks per day */}
      <div className="mb-6">
        <label className="block text-[11px] text-[#555] uppercase font-bold tracking-widest mb-2">
          Max rack replacements / day
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range" min={1} max={100} value={optMaxPerDay}
            onChange={e => setOptMaxPerDay(Number(e.target.value))}
            className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, hsl(160 84% 45%) 0%, hsl(160 84% 45%) ${((optMaxPerDay - 1) / 99) * 100}%, hsl(222 15% 20%) ${((optMaxPerDay - 1) / 99) * 100}%, hsl(222 15% 20%) 100%)`,
            }}
          />
          <input
            type="number" min={1} max={100} value={optMaxPerDay}
            onChange={e => setOptMaxPerDay(Math.min(100, Math.max(1, Number(e.target.value))))}
            className="w-16 text-center py-1.5 text-white text-[13px] font-mono font-bold rounded-md border border-[#2a2d35] bg-[#1a1d24] focus:outline-none focus:border-[hsl(160_84%_45%)]"
          />
          <span className="text-[12px] text-[#555] w-10">/ day</span>
        </div>
        <p className="text-[11px] text-[#444] mt-1.5">Controls maintenance throughput — how many racks technicians can replace per day.</p>
      </div>

      {/* Mode summary */}
      <div className="flex items-center justify-between mb-6 px-4 py-3 rounded-xl border border-[#2a2d35] bg-[#1a1d24]">
        <span className="text-[12px] text-[#666]">Optimization mode</span>
        <span className={`text-[12px] font-bold px-3 py-1 rounded-full border ${greenMode ? 'text-[#22C55E] border-[#22C55E]/40 bg-[#22C55E]/10' : 'text-[#aaa] border-[#2a2d35]'}`}>
          {greenMode ? 'Green' : 'Normal'}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded-lg text-[13px] font-semibold border border-[#2a2d35] text-[#666] hover:text-white hover:border-[#444] transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => onRun(optWeeks, optMaxPerDay)}
          className="flex-1 py-2.5 rounded-lg text-[13px] font-semibold border border-[#22C55E] text-[#22C55E] hover:bg-[#22C55E]/10 transition-colors flex items-center justify-center gap-2"
        >
          <IcoLightning /> Run Optimization
        </button>
      </div>
    </div>
  </div>
);
