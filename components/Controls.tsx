import React from 'react';
import { SimulationConfig } from '../types';
import { SIM_LIMITS } from '../constants';
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
    <label className="text-xs font-bold text-slate-700 w-24 shrink-0 truncate">{label}</label>
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
  // Calculate visual slider value (0 = Open/Left, 100 = Closed/Right)
  // config.actuatorExtension: 100 = Open, 0 = Closed.
  // We want Slider Left (0) -> Open (100).
  // We want Slider Right (100) -> Closed (0).
  // So sliderValue = 100 - config.actuatorExtension.
  const invertedSliderValue = 100 - config.actuatorExtension;

  return (
    <div className="flex flex-col gap-1 w-full max-w-md mx-auto pt-2">
      
      {/* Top Row: Speed and Open Position Combined */}
      <div className="flex items-center gap-2 h-8 select-none">
        
        {/* Speed Control Section */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
           <button 
              onClick={() => onChange('animationSpeed', config.animationSpeed > 0 ? 0 : 0.2)}
              className="p-1 -ml-1 rounded hover:bg-slate-100 text-slate-600 transition-colors shrink-0 flex items-center justify-center"
              title={config.animationSpeed > 0 ? "Pause" : "Play"}
            >
              {config.animationSpeed > 0 ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <label className="text-[10px] font-bold text-slate-700 shrink-0">Hz</label>
            <input
              type="range"
              min={SIM_LIMITS.SPEED.MIN}
              max={SIM_LIMITS.SPEED.MAX}
              step={SIM_LIMITS.SPEED.STEP}
              value={config.animationSpeed}
              onChange={(e) => onChange('animationSpeed', parseFloat(e.target.value))}
              className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-700 min-w-10"
            />
             <div className="text-[10px] font-mono text-slate-500 w-6 text-right shrink-0">
              {config.animationSpeed.toFixed(1)}
            </div>
        </div>

        {/* Divider */}
        <div className="w-px h-4 bg-slate-200 shrink-0" />

        {/* Open Position Section */}
        <div className="flex items-center gap-2 flex-[1.2] min-w-0">
            <div className="text-[10px] font-mono text-slate-500 w-8 text-right shrink-0">
              {Math.round(config.actuatorExtension)}%
            </div>
            
            <label className="text-[10px] font-bold text-slate-700 shrink-0">OPEN</label>
            
            <input
              type="range"
              min={0}
              max={100}
              value={invertedSliderValue}
              onChange={(e) => {
                const sliderVal = parseFloat(e.target.value);
                // Convert slider value (Left=0=Open, Right=100=Closed) back to extension (100=Open, 0=Closed)
                const extension = 100 - sliderVal;
                onChange('actuatorExtension', extension);
                if (config.animationSpeed > 0) onChange('animationSpeed', 0);
              }}
              className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-700 min-w-10"
            />
            
            <label className="text-[10px] font-bold text-slate-700 shrink-0">CLOSE</label>
        </div>
      </div>

      {/* Configuration Rows */}
      <ControlRow
        label="Flap Length"
        value={config.flapHeight}
        min={SIM_LIMITS.FLAP_HEIGHT.MIN}
        max={SIM_LIMITS.FLAP_HEIGHT.MAX}
        unit="px"
        onChange={(v) => onChange('flapHeight', v)}
      />

      <ControlRow
        label="Motor Spacing"
        value={config.motorSpacing}
        min={SIM_LIMITS.MOTOR_SPACING.MIN}
        max={SIM_LIMITS.MOTOR_SPACING.MAX}
        unit="px"
        onChange={(v) => onChange('motorSpacing', v)}
      />
    </div>
  );
};