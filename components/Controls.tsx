import React from 'react';
import { SimulationConfig } from '../types';
import { SIM_LIMITS } from '../constants';

interface ControlsProps {
  config: SimulationConfig;
  onChange: (key: keyof SimulationConfig, value: number) => void;
}

const CompactControl: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (val: number) => void;
  action?: React.ReactNode;
}> = ({ label, value, min, max, step = 1, unit = "", onChange, action }) => (
  <div className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
    <label className="text-xs font-semibold text-slate-700 w-24 shrink-0 truncate" title={label}>{label}</label>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-700"
    />
    <div className="w-12 text-right text-xs font-mono text-slate-500 shrink-0">
      {step < 1 ? value.toFixed(2) : Math.round(value)}{unit}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

export const Controls: React.FC<ControlsProps> = ({ config, onChange }) => {
  return (
    <div className="flex flex-col h-full">
      <CompactControl
        label="Speed"
        value={config.animationSpeed}
        min={SIM_LIMITS.SPEED.MIN}
        max={SIM_LIMITS.SPEED.MAX}
        step={SIM_LIMITS.SPEED.STEP}
        unit="Hz"
        onChange={(v) => onChange('animationSpeed', v)}
      />

      <CompactControl
        label="Flap Open"
        value={config.actuatorExtension}
        min={SIM_LIMITS.EXTENSION.MIN}
        max={SIM_LIMITS.EXTENSION.MAX}
        unit="%"
        onChange={(v) => {
          onChange('actuatorExtension', v);
          // Auto-stop animation if manual control is used
          if (config.animationSpeed > 0) onChange('animationSpeed', 0);
        }}
      />
      
      <div className="mt-2 space-y-0.5">
        <CompactControl
          label="Top Panel Height"
          value={config.topPanelHeight}
          min={SIM_LIMITS.TOP_PANEL_HEIGHT.MIN}
          max={SIM_LIMITS.TOP_PANEL_HEIGHT.MAX}
          unit="px"
          onChange={(v) => onChange('topPanelHeight', v)}
        />
        <CompactControl
          label="Flap Length"
          value={config.flapHeight}
          min={SIM_LIMITS.FLAP_HEIGHT.MIN}
          max={SIM_LIMITS.FLAP_HEIGHT.MAX}
          unit="px"
          onChange={(v) => onChange('flapHeight', v)}
        />
      </div>

      <div className="mt-auto pt-4 text-[10px] text-slate-400 text-center">
        Scale: ~10px = 1 inch
      </div>
    </div>
  );
};
