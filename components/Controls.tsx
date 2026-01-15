
import React, { useRef } from 'react';
import { SimulationConfig } from '../types';
import { CONSTRAINTS } from '../constants';
import { Play, Pause } from 'lucide-react';

interface ControlsProps {
  config: SimulationConfig;
  onChange: (key: keyof SimulationConfig, value: number) => void;
}

const ControlRow: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  showValue?: boolean;
  onChange: (val: number) => void;
}> = ({ label, value, min, max, step = 1, unit = '', showValue = true, onChange }) => (
  <div className="flex items-center gap-3 h-8 select-none">
    <label className="text-xs font-bold text-slate-700 w-24 shrink-0 truncate" title={label}>{label}</label>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-700 min-w-20"
    />
    {showValue && (
      <div className="text-xs font-mono text-slate-500 w-12 text-right shrink-0">
        {Math.round(value)}{unit}
      </div>
    )}
  </div>
);

export const Controls: React.FC<ControlsProps> = ({ config, onChange }) => {
  const isPlaying = config.animationSpeed > 0;
  const visualPosValue = 100 - config.actuatorExtension;
  const animationRef = useRef<number>();

  const handlePosChange = (visualVal: number) => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (isPlaying) onChange('animationSpeed', 0);
    onChange('actuatorExtension', 100 - visualVal);
  };

  const animateTo = (targetExtension: number) => {
    if (isPlaying) onChange('animationSpeed', 0);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);

    const start = config.actuatorExtension;
    const change = targetExtension - start;
    if (Math.abs(change) < 0.1) return;

    const duration = 800; // ms
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
      const currentVal = start + (change * ease);
      onChange('actuatorExtension', currentVal);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(tick);
      } else {
        animationRef.current = undefined;
      }
    };
    
    animationRef.current = requestAnimationFrame(tick);
  };

  return (
    <div className="flex flex-col gap-1 w-full max-w-md mx-auto pt-2">
      
      {/* Top Row: Play | Hz | Position */}
      <div className="flex items-center gap-3 h-8 select-none">
        
        {/* Play/Pause */}
        <button 
          onClick={() => onChange('animationSpeed', isPlaying ? 0 : 0.5)}
          className={`p-1.5 rounded transition-colors shrink-0 flex items-center justify-center w-8 h-8 ${isPlaying ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-100 text-slate-600'}`}
          title={isPlaying ? "Pause Animation" : "Play Animation"}
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>

        {/* Hz Control */}
        <div className="flex items-center gap-2 shrink-0">
          <input
            type="range"
            min={CONSTRAINTS.SPEED.MIN}
            max={CONSTRAINTS.SPEED.MAX}
            step={CONSTRAINTS.SPEED.STEP}
            value={config.animationSpeed}
            onChange={(e) => onChange('animationSpeed', parseFloat(e.target.value))}
            className="w-16 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-700"
          />
          <div className="text-xs font-mono text-slate-500 w-auto text-right whitespace-nowrap">
            {config.animationSpeed} <span className="font-bold text-slate-700 ml-1">Hz</span>
          </div>
        </div>

        {/* Position Control Group */}
        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end ml-2">
          
          <div className="text-xs font-mono text-slate-500 w-9 text-right shrink-0">
             {Math.round(config.actuatorExtension)}%
          </div>

          <button 
            onClick={() => animateTo(100)}
            className="text-xs font-bold text-slate-700 border border-slate-300 rounded px-2 py-1 bg-white hover:bg-slate-50 hover:border-slate-400 transition-colors shadow-sm shrink-0"
            title="Animate to Fully Open"
          >
            Open
          </button>
          
          <input
            type="range"
            min={0}
            max={100}
            value={visualPosValue}
            onChange={(e) => handlePosChange(parseFloat(e.target.value))}
            className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-600 min-w-[30px]"
            title="Drag Left to Open, Right to Close"
          />
          
          <button 
            onClick={() => animateTo(0)}
            className="text-xs font-bold text-slate-700 border border-slate-300 rounded px-2 py-1 bg-white hover:bg-slate-50 hover:border-slate-400 transition-colors shadow-sm shrink-0"
            title="Animate to Fully Closed"
          >
            Close
          </button>
        </div>
      </div>

      {/* Row 2: Gap Height */}
      <ControlRow
        label="Vent Height"
        value={config.gapHeight}
        min={CONSTRAINTS.GAP_HEIGHT.MIN}
        max={CONSTRAINTS.GAP_HEIGHT.MAX}
        unit="px"
        showValue={false}
        onChange={(v) => onChange('gapHeight', v)}
      />

      {/* Row 3: Motor Offset */}
      <ControlRow
        label="Motor Offset"
        value={config.motorSpacing}
        min={CONSTRAINTS.MOTOR_SPACING.MIN}
        max={CONSTRAINTS.MOTOR_SPACING.MAX}
        unit="mm"
        showValue={false}
        onChange={(v) => onChange('motorSpacing', v)}
      />
    </div>
  );
};
