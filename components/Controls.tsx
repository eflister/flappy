
import React from 'react';
import { SimulationConfig } from '../types';
import { CONSTRAINTS } from '../constants';
import { Play, Pause } from 'lucide-react';

interface ControlsProps {
  config: SimulationConfig;
  onChange: (key: keyof SimulationConfig, value: number) => void;
}

// Reusable slider row to reduce repetition
const ControlRow: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (val: number) => void;
}> = ({ label, value, min, max, step = 1, unit = '', onChange }) => (
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
    <div className="text-xs font-mono text-slate-500 w-12 text-right shrink-0">
      {Math.round(value)}{unit}
    </div>
  </div>
);

export const Controls: React.FC<ControlsProps> = ({ config, onChange }) => {
  // Logic: 0% Extension = Closed = Slider Right
  // 100% Extension = Open = Slider Left
  // User wants a "Closed -> Open" slider visual, usually 0 -> 100.
  // We map directly: 0% Ext (Closed) to 0 Slider.
  const isPlaying = config.animationSpeed > 0;

  return (
    <div className="flex flex-col gap-1 w-full max-w-md mx-auto pt-2">
      
      {/* Top Section: Playback & Actuation */}
      <div className="flex items-center gap-2 h-8 select-none mb-2 border-b border-slate-100 pb-2">
        
        {/* Play/Pause Button */}
        <button 
          onClick={() => onChange('animationSpeed', isPlaying ? 0 : 0.5)}
          className={`p-1.5 rounded transition-colors shrink-0 flex items-center justify-center ${isPlaying ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-100 text-slate-600'}`}
          title={isPlaying ? "Pause Animation" : "Play Animation"}
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>

        {/* Speed Slider */}
        <div className="flex items-center gap-2 flex-1 min-w-0 border-r border-slate-200 pr-2 mr-2">
          <label className="text-[10px] font-bold text-slate-500">SPEED</label>
          <input
            type="range"
            min={CONSTRAINTS.SPEED.MIN}
            max={CONSTRAINTS.SPEED.MAX}
            step={CONSTRAINTS.SPEED.STEP}
            value={config.animationSpeed}
            onChange={(e) => onChange('animationSpeed', parseFloat(e.target.value))}
            className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-400"
          />
        </div>

        {/* Position Slider */}
        <div className="flex items-center gap-2 flex-[1.5] min-w-0">
          <label className="text-[10px] font-bold text-slate-700">POS</label>
          <input
            type="range"
            min={0}
            max={100}
            value={config.actuatorExtension}
            onChange={(e) => {
              onChange('actuatorExtension', parseFloat(e.target.value));
              if (isPlaying) onChange('animationSpeed', 0); // Stop animation on manual drag
            }}
            className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
           <div className="text-[10px] font-mono text-slate-500 w-8 text-right shrink-0">
            {Math.round(config.actuatorExtension)}%
          </div>
        </div>
      </div>

      {/* Configuration Section */}
      <ControlRow
        label="Flap Length"
        value={config.flapHeight}
        min={CONSTRAINTS.FLAP_HEIGHT.MIN}
        max={CONSTRAINTS.FLAP_HEIGHT.MAX}
        unit="px"
        onChange={(v) => onChange('flapHeight', v)}
      />

      <ControlRow
        label="Motor Spacing"
        value={config.motorSpacing}
        min={CONSTRAINTS.MOTOR_SPACING.MIN}
        max={CONSTRAINTS.MOTOR_SPACING.MAX}
        unit="px"
        onChange={(v) => onChange('motorSpacing', v)}
      />
    </div>
  );
};
