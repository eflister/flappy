import React, { useState, useEffect, useRef } from 'react';
import { Controls } from './components/Controls';
import { SimulationCanvas } from './components/SimulationCanvas';
import { SimulationConfig } from './types';
import { SIM_LIMITS } from './constants';

const INITIAL_CONFIG: SimulationConfig = {
  actuatorExtension: SIM_LIMITS.EXTENSION.DEFAULT,
  flapHeight: SIM_LIMITS.FLAP_HEIGHT.DEFAULT,
  topPanelHeight: SIM_LIMITS.TOP_PANEL_HEIGHT.DEFAULT,
  animationSpeed: SIM_LIMITS.SPEED.DEFAULT,
};

export default function App() {
  const [config, setConfig] = useState<SimulationConfig>(INITIAL_CONFIG);
  
  // Animation refs
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const directionRef = useRef<1 | -1>(1);
  const speedRef = useRef(config.animationSpeed);

  // Sync ref with state for use inside animation loop
  useEffect(() => {
    speedRef.current = config.animationSpeed;
  }, [config.animationSpeed]);

  const handleConfigChange = (key: keyof SimulationConfig, value: number) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    const animate = (time: number) => {
      if (lastTimeRef.current !== 0) {
        const deltaTime = time - lastTimeRef.current;
        const speed = speedRef.current; // Hz (Cycles per second)
        
        if (speed > 0) {
          // A cycle is defined as 0% -> 100% -> 0%
          const range = SIM_LIMITS.EXTENSION.MAX - SIM_LIMITS.EXTENSION.MIN;
          const totalDistancePerCycle = range * 2;
          
          // Distance to move in this frame = (Total Distance/Cycle) * (Cycles/Sec) * (Sec/Frame)
          const moveAmount = (totalDistancePerCycle * speed * deltaTime) / 1000;
          
          setConfig(prev => {
            let nextExt = prev.actuatorExtension + (moveAmount * directionRef.current);
            
            if (nextExt >= SIM_LIMITS.EXTENSION.MAX) {
              nextExt = SIM_LIMITS.EXTENSION.MAX;
              directionRef.current = -1;
            } else if (nextExt <= SIM_LIMITS.EXTENSION.MIN) {
              nextExt = SIM_LIMITS.EXTENSION.MIN;
              directionRef.current = 1;
            }
            
            return { ...prev, actuatorExtension: nextExt };
          });
        }
      }
      lastTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-slate-900 overflow-hidden">
      <main className="flex-1 flex flex-col lg:flex-row min-h-screen">
        {/* Visualization Area */}
        <section className="relative bg-slate-50 border-b lg:border-b-0 lg:border-r border-slate-200 lg:flex-1 flex justify-center items-center">
           <SimulationCanvas config={config} />
        </section>

        {/* Sidebar Controls */}
        <aside className="w-full lg:w-96 flex-shrink-0 bg-white p-4 overflow-y-auto">
          <Controls 
            config={config} 
            onChange={handleConfigChange}
          />
        </aside>
      </main>
    </div>
  );
}
