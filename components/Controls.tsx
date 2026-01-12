
import React from 'react';
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
  const isPlaying = config.animationSpeed > 0;
  const visualPosValue = 100 - config.actuatorExtension;

  const handlePosChange = (visualVal: number) => {
    onChange('actuatorExtension', 100 - visualVal);
    if (isPlaying) onChange('animationSpeed', 0);
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
          <label className="text-xs font-bold text-slate-700">Hz</label>
          <input
            type="range"
            min={CONSTRAINTS.SPEED.MIN}
            max={CONSTRAINTS.SPEED.MAX}
            step={CONSTRAINTS.SPEED.STEP}
            value={config.animationSpeed}
            onChange={(e) => onChange('animationSpeed', parseFloat(e.target.value))}
            className="w-16 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-700"
          />
          <div className="text-xs font-mono text-slate-500 w-6 text-right">{config.animationSpeed}</div>
        </div>

        {/* Position Control */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xs font-bold text-slate-700 truncate shrink-0 w-16 text-right">
            {Math.round(config.actuatorExtension)}% Open
          </span>
          
          <input
            type="range"
            min={0}
            max={100}
            value={visualPosValue}
            onChange={(e) => handlePosChange(parseFloat(e.target.value))}
            className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-600 min-w-10"
            title="Drag Left to Open, Right to Close"
          />
          
          <span className="text-xs font-bold text-slate-700 shrink-0 w-10">
            Close
          </span>
        </div>
      </div>

      {/* Row 2: Flap Length */}
      <ControlRow
        label="Flap Length"
        value={config.flapHeight}
        min={CONSTRAINTS.FLAP_HEIGHT.MIN}
        max={CONSTRAINTS.FLAP_HEIGHT.MAX}
        unit="px"
        onChange={(v) => onChange('flapHeight', v)}
      />

      {/* Row 3: Motor Spacing */}
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
