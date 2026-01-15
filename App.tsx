
import React, { useState, useEffect, useRef } from 'react';
import { Controls } from './components/Controls';
import { SimulationCanvas } from './components/SimulationCanvas';
import { SimulationConfig } from './types';
import { CONSTRAINTS } from './constants';

// Initial Application State
const INITIAL_CONFIG: SimulationConfig = {
  actuatorExtension: CONSTRAINTS.EXTENSION.DEFAULT,
  gapHeight:         CONSTRAINTS.GAP_HEIGHT.DEFAULT,
  animationSpeed:    CONSTRAINTS.SPEED.DEFAULT,
  motorSpacing:      CONSTRAINTS.MOTOR_SPACING.DEFAULT,
};

export default function App() {
  const [config, setConfig] = useState<SimulationConfig>(INITIAL_CONFIG);
  
  // Animation State Refs (Mutable to avoid re-renders in loop)
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const directionRef = useRef<1 | -1>(1); // 1 = Opening, -1 = Closing
  
  // Update Config Helper
  const handleConfigChange = (key: keyof SimulationConfig, value: number) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  // Animation Loop
  useEffect(() => {
    const animate = (time: number) => {
      if (lastTimeRef.current !== 0 && config.animationSpeed > 0) {
        const deltaTime = time - lastTimeRef.current;
        const distancePerSec = 200 * config.animationSpeed; 
        const moveStep = (distancePerSec * deltaTime) / 1000;
        
        setConfig(prev => {
          let nextExt = prev.actuatorExtension + (moveStep * directionRef.current);
          
          // Bounce logic
          if (nextExt >= CONSTRAINTS.EXTENSION.MAX) {
            nextExt = CONSTRAINTS.EXTENSION.MAX;
            directionRef.current = -1;
          } else if (nextExt <= CONSTRAINTS.EXTENSION.MIN) {
            nextExt = CONSTRAINTS.EXTENSION.MIN;
            directionRef.current = 1;
          }
          
          return { ...prev, actuatorExtension: nextExt };
        });
      }
      
      lastTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [config.animationSpeed]);

  return (
    <div className="h-screen bg-slate-50 flex flex-col font-sans text-slate-900 overflow-hidden">
        
      {/* Top: Visualization */}
      <section className="flex-1 min-h-0 relative flex justify-center items-center overflow-hidden">
          <SimulationCanvas config={config} />
      </section>

      {/* Bottom: Controls */}
      <aside className="w-full shrink-0 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-20">
        <Controls 
          config={config} 
          onChange={handleConfigChange}
        />
      </aside>
    </div>
  );
}
