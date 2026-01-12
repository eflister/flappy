
import React from 'react';
import { SimulationConfig } from '../types';
import { useSimulationPhysics } from '../hooks/useSimulationPhysics';
import { DIMENSIONS, STYLES } from '../constants';

// ============================================================================
// SUB-COMPONENTS (Pure presentation for complex parts)
// ============================================================================

const MotorUnit: React.FC<{
  pivot: { x: number, y: number };
  angle: number;
  shaftStart: { x: number, y: number }; // Global coordinates
  shaftLength: number;
  stopperPos: number;
  threadOffset: number;
}> = ({ pivot, angle, shaftStart, shaftLength, stopperPos, threadOffset }) => {
  const { MOTOR } = DIMENSIONS;
  
  // Calculate local coordinates for the motor body rectangle relative to pivot
  const motorX = MOTOR.HINGE_LEAF_LENGTH - MOTOR.WIDTH;
  const motorY = -MOTOR.HINGE_THICKNESS / 2 - MOTOR.HEIGHT;

  return (
    <g transform={`translate(${pivot.x}, ${pivot.y}) rotate(${angle})`}>
      {/* 1. Hinge Leaf (The metal strap) */}
      <rect 
        x={0} 
        y={-MOTOR.HINGE_THICKNESS / 2} 
        width={MOTOR.HINGE_LEAF_LENGTH} 
        height={MOTOR.HINGE_THICKNESS} 
        fill={STYLES.COLORS.METAL.FILL} 
        stroke={STYLES.COLORS.METAL.STROKE} 
        rx={1} 
      />

      {/* 2. Motor Main Body */}
      <rect 
        x={motorX} 
        y={motorY} 
        width={MOTOR.WIDTH} 
        height={MOTOR.HEIGHT} 
        rx={4} 
        fill={STYLES.COLORS.METAL.DARK} 
        stroke={STYLES.COLORS.METAL.STROKE} 
      />
      <text 
        x={motorX + MOTOR.WIDTH / 2} 
        y={motorY + MOTOR.HEIGHT / 2 + 4} 
        fill="#cbd5e1" 
        fontSize="10" 
        fontWeight={600} 
        textAnchor="middle" 
        style={{ transformBox: "fill-box", transformOrigin: "center", transform: "rotate(180deg)" }}
      >
        Motor
      </text>

      {/* 3. Threaded Rod */}
      <g transform={`translate(${MOTOR.HINGE_LEAF_LENGTH}, ${-((MOTOR.HINGE_THICKNESS/2) + (MOTOR.HEIGHT/2))})`}>
        {/* Rod Base */}
        <rect 
          x={0} 
          y={-MOTOR.ROD_THICKNESS / 2} 
          width={shaftLength} 
          height={MOTOR.ROD_THICKNESS} 
          fill={STYLES.COLORS.METAL.FILL} 
          stroke={STYLES.COLORS.METAL.STROKE} 
          rx={1} 
        />
        {/* Thread Texture */}
        <rect 
          x={0} 
          y={-MOTOR.ROD_THICKNESS / 2} 
          width={shaftLength} 
          height={MOTOR.ROD_THICKNESS} 
          fill="url(#threads)" 
        />
        {/* End Cap */}
        <rect 
          x={shaftLength - 4} 
          y={-5} 
          width={5} 
          height={10} 
          fill={STYLES.COLORS.BRASS.FILL} 
          stroke={STYLES.COLORS.BRASS.STROKE} 
          rx={1} 
        />
        {/* Limit Stopper */}
        {stopperPos > 0 && stopperPos < shaftLength && (
          <rect 
            x={stopperPos - MOTOR.STOPPER_WIDTH} 
            y={-6} 
            width={MOTOR.STOPPER_WIDTH} 
            height={12} 
            fill={STYLES.COLORS.BRASS.FILL} 
            stroke={STYLES.COLORS.BRASS.STROKE} 
            rx={1} 
          />
        )}
      </g>
    </g>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const SimulationCanvas: React.FC<{ config: SimulationConfig }> = ({ config }) => {
  const sys = useSimulationPhysics(config);
  const { FRAME, INSULATION, MECHANICS, MOTOR, HARDWARE } = DIMENSIONS;
  const { layout, static: staticParts, dynamic } = sys;

  // --- Frame Geometry (Mirrored Top/Bottom) ---
  const topFrameBottomY = sys.layout.screenTopY + FRAME.CHANNEL_DEPTH;
  const topFramePath = `
    M ${DIMENSIONS.LAYOUT.ORIGIN_X} ${topFrameBottomY} 
    L ${DIMENSIONS.LAYOUT.ORIGIN_X} ${sys.layout.screenTopY} 
    L ${sys.layout.screenRightX} ${sys.layout.screenTopY} 
    L ${sys.layout.screenRightX} ${topFrameBottomY} 
    L ${sys.layout.screenRightX - FRAME.LIP} ${topFrameBottomY} 
    L ${sys.layout.screenRightX - FRAME.LIP} ${sys.layout.screenTopY + FRAME.THICKNESS} 
    L ${DIMENSIONS.LAYOUT.ORIGIN_X + FRAME.LIP} ${sys.layout.screenTopY + FRAME.THICKNESS} 
    L ${DIMENSIONS.LAYOUT.ORIGIN_X + FRAME.LIP} ${topFrameBottomY} Z`;

  const botFrameTopY = sys.layout.screenBottomY - FRAME.CHANNEL_DEPTH;
  const botFramePath = `
    M ${DIMENSIONS.LAYOUT.ORIGIN_X} ${botFrameTopY} 
    L ${DIMENSIONS.LAYOUT.ORIGIN_X} ${sys.layout.screenBottomY} 
    L ${sys.layout.screenRightX} ${sys.layout.screenBottomY} 
    L ${sys.layout.screenRightX} ${botFrameTopY} 
    L ${sys.layout.screenRightX - FRAME.LIP} ${botFrameTopY} 
    L ${sys.layout.screenRightX - FRAME.LIP} ${sys.layout.screenBottomY - FRAME.THICKNESS} 
    L ${DIMENSIONS.LAYOUT.ORIGIN_X + FRAME.LIP} ${sys.layout.screenBottomY - FRAME.THICKNESS} 
    L ${DIMENSIONS.LAYOUT.ORIGIN_X + FRAME.LIP} ${botFrameTopY} Z`;

  // --- Insulation Geometry ---
  const topPanelY = sys.layout.screenTopY + FRAME.THICKNESS + 100; // Bottom edge of top panel
  const topPanelH = 100; 
  const botPanelTopY = staticParts.pivot.y - MECHANICS.PIVOT_OFFSET_Y;
  const botPanelH = (sys.layout.screenBottomY - FRAME.THICKNESS) - botPanelTopY;

  // --- Dynamic Path for Moving Bracket (with Holes cut out) ---
  // Bracket is a rounded rect. We simulate it with a path.
  // Coordinates relative to pivot (0,0) inside the transformed group
  const brkX = -(MECHANICS.BRACKET_WIDTH / 2);
  const brkW = MECHANICS.BRACKET_WIDTH;
  
  // Bracket Y Extents:
  // Top: Defined by BRACKET_LENGTH (negative Y)
  // Bottom: Extends past pivot (0) to half the hole spacing (7.5px) to enclose the pivot hole.
  const brkY_Top = -MECHANICS.BRACKET_LENGTH; 
  const brkY_Bot = 7.5; // Half of 15px spacing
  const brkH = brkY_Bot - brkY_Top;
  const radius = 1;
  
  // Outer Rect Path (Clockwise)
  const bracketRectPath = `
    M ${brkX + radius} ${brkY_Top}
    h ${brkW - 2*radius}
    a ${radius} ${radius} 0 0 1 ${radius} ${radius}
    v ${brkH - 2*radius}
    a ${radius} ${radius} 0 0 1 -${radius} ${radius}
    h -${brkW - 2*radius}
    a ${radius} ${radius} 0 0 1 -${radius} -${radius}
    v -${brkH - 2*radius}
    a ${radius} ${radius} 0 0 1 ${radius} -${radius}
    z
  `;

  // Hole Paths (Counter-Clockwise to create holes in evenodd rule)
  // Drawn relative to pivot. 
  const holePaths = INSULATION.SCREW_HOLES.map(dy => {
    const r = MECHANICS.WASHER_THICKNESS - 0.5;
    const cy = -dy;
    // Circle path: M cx-r cy ...
    return `
      M ${-r} ${cy}
      a ${r} ${r} 0 1 0 ${2*r} 0
      a ${r} ${r} 0 1 0 -${2*r} 0
      z
    `;
  }).join(' ');

  const combinedBracketPath = `${bracketRectPath} ${holePaths}`;

  // --- Seal Positioning ---
  // Top Seal: Centered between Magnet (center ~topPanelY-34) and Vent Gap (topPanelY)
  // Midpoint approx topPanelY - 17
  const topSealY = topPanelY - 17;

  // Bottom Seal: Centered in the overlap between Flap Bottom and Bottom Panel Top
  // Flap overlap region is 25px tall (defined by offset constants)
  const botSealY = botPanelTopY + 12.5;

  return (
    <div className="w-full h-full relative flex justify-center bg-slate-50 overflow-hidden">
      
      {/* Title Overlay */}
      <div className="absolute top-4 left-6 z-10 pointer-events-none">
        <h1 className="text-2xl font-bold text-slate-400 font-mono tracking-tight">The Flappy v3</h1>
      </div>

      <div className="w-full flex justify-center bg-slate-50 overflow-x-auto">
        <svg 
          viewBox={`0 0 800 ${sys.layout.canvasHeight}`} 
          className="h-auto" 
          style={{ maxHeight: '100vh', width: '100%', minWidth: '800px' }}
        >
          <defs>
            <pattern id="insulationPattern" width="10" height="10" patternUnits="userSpaceOnUse">
               <circle cx="2" cy="2" r="1" fill={STYLES.COLORS.INSULATION.STROKE} opacity="0.2" />
               <circle cx="7" cy="7" r="1" fill={STYLES.COLORS.INSULATION.STROKE} opacity="0.2" />
            </pattern>
            <pattern id="threads" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform={`translate(${dynamic.rodExtension} 0) rotate(15)`}>
              <line x1="0" y1="0" x2="0" y2="4" stroke={STYLES.COLORS.METAL.STROKE} strokeWidth="1" opacity="0.6" />
            </pattern>
          </defs>

          {/* 1. Static Frame Vinyl */}
          <path d={topFramePath} fill={STYLES.COLORS.VINYL.FILL} stroke={STYLES.COLORS.VINYL.STROKE} strokeWidth={STYLES.STROKE.DEFAULT} />
          <path d={botFramePath} fill={STYLES.COLORS.VINYL.FILL} stroke={STYLES.COLORS.VINYL.STROKE} strokeWidth={STYLES.STROKE.DEFAULT} />
          
          {/* Reference Line */}
          <line 
            x1={sys.layout.screenRightX} y1={sys.layout.screenTopY} 
            x2={sys.layout.screenRightX} y2={sys.layout.screenBottomY} 
            stroke="black" strokeWidth="1" strokeDasharray={STYLES.STROKE.DASHED} 
          />

          {/* 2. Static Insulation Panels & Seals */}
          <g transform={`translate(${sys.layout.insulationX}, 0)`}>
            {/* Top Panel */}
            <rect y={topPanelY - topPanelH} width={INSULATION.THICKNESS} height={topPanelH} fill={STYLES.COLORS.INSULATION.FILL} stroke={STYLES.COLORS.INSULATION.STROKE} />
            <rect y={topPanelY - topPanelH} width={INSULATION.THICKNESS} height={topPanelH} fill="url(#insulationPattern)" />
            
            {/* Bottom Panel */}
            <rect y={botPanelTopY} width={INSULATION.THICKNESS} height={botPanelH} fill={STYLES.COLORS.INSULATION.FILL} stroke={STYLES.COLORS.INSULATION.STROKE} />
            <rect y={botPanelTopY} width={INSULATION.THICKNESS} height={botPanelH} fill="url(#insulationPattern)" />
            
            {/* Frame Seals (Insulation <-> Frame) - Horizontal */}
            <ellipse cx={INSULATION.THICKNESS/2} cy={topPanelY - topPanelH} rx={HARDWARE.SEAL_W/2} ry={HARDWARE.SEAL_H/2} fill={STYLES.COLORS.SEALS} />
            <ellipse cx={INSULATION.THICKNESS/2} cy={botPanelTopY + botPanelH} rx={HARDWARE.SEAL_W/2} ry={HARDWARE.SEAL_H/2} fill={STYLES.COLORS.SEALS} />

            {/* Vent Interface Seals (Insulation <-> Flap) - Vertical Orientation */}
            <ellipse cx={0} cy={topSealY} rx={HARDWARE.SEAL_H/2} ry={HARDWARE.SEAL_W/2} fill={STYLES.COLORS.SEALS} />
            <ellipse cx={0} cy={botSealY} rx={HARDWARE.SEAL_H/2} ry={HARDWARE.SEAL_W/2} fill={STYLES.COLORS.SEALS} />
          </g>

          {/* 3. Static Hardware */}
          {/* Top Magnet */}
          <rect 
            x={sys.layout.insulationX} 
            y={topPanelY - 40} 
            width={HARDWARE.MAGNET_W} 
            height={HARDWARE.MAGNET_H} 
            fill={STYLES.COLORS.SEALS} 
            rx={1} 
          />
          
          {/* Main Fixed Bracket (Dark Grey) */}
          {/* Flush attachment: End X = insulationX */}
          <rect 
            x={staticParts.pivot.x - MECHANICS.BRACKET_WIDTH} 
            y={staticParts.pivot.y - 10} 
            width={sys.layout.insulationX - (staticParts.pivot.x - MECHANICS.BRACKET_WIDTH)} 
            height={20} 
            rx={2} 
            fill={STYLES.COLORS.METAL.DARK} 
            stroke={STYLES.COLORS.METAL.STROKE} 
          />

          {/* 4. Moving Flap Assembly */}
          <g transform={`translate(${staticParts.pivot.x}, ${staticParts.pivot.y}) rotate(${sys.currentAngleDeg})`}>
            
            {/* Pivot Hinge Bracket (Light Grey) with HOLES cut out */}
            <path 
              d={combinedBracketPath} 
              fill={STYLES.COLORS.METAL.FILL} 
              stroke={STYLES.COLORS.METAL.STROKE} 
              fillRule="evenodd"
            />
            
            {/* Insulation Panel (Relative to pivot) */}
            <g transform={`translate(${sys.layout.insulationX - staticParts.pivot.x}, 0)`}>
                <rect 
                x={-INSULATION.THICKNESS} 
                y={-(config.flapHeight + MECHANICS.FLAP_OFFSET_Y)} 
                width={INSULATION.THICKNESS} 
                height={config.flapHeight} 
                fill={STYLES.COLORS.INSULATION.FILL} 
                stroke={STYLES.COLORS.INSULATION.STROKE} 
                />
                <rect 
                x={-INSULATION.THICKNESS} 
                y={-(config.flapHeight + MECHANICS.FLAP_OFFSET_Y)} 
                width={INSULATION.THICKNESS} 
                height={config.flapHeight} 
                fill="url(#insulationPattern)" 
                />
                
                {/* Magnet Washer */}
                <rect 
                x={-4} 
                y={-(config.flapHeight + MECHANICS.FLAP_OFFSET_Y) + MECHANICS.MOUNT_MARGIN_TOP} 
                width={4} 
                height={12} 
                fill={STYLES.COLORS.SEALS} 
                rx={0.5} 
                />

                {/* Actuator Bracket Mount */}
                <rect 
                x={-INSULATION.THICKNESS - staticParts.mountLength} 
                y={-(config.flapHeight + MECHANICS.FLAP_OFFSET_Y) + MECHANICS.MOUNT_MARGIN_TOP} 
                width={staticParts.mountLength} 
                height={MECHANICS.MOUNT_HEIGHT} 
                fill={STYLES.COLORS.METAL.DARK} 
                stroke={STYLES.COLORS.METAL.STROKE} 
                rx={1} 
                />
            </g>
          </g>

          {/* Pivot Pin */}
          <circle cx={staticParts.pivot.x} cy={staticParts.pivot.y} r={MOTOR.PIN_RADIUS} fill={STYLES.COLORS.BRASS.FILL} stroke={STYLES.COLORS.BRASS.STROKE} />

          {/* 5. Motor Assembly */}
          {/* Wall Plate (Flush with fixed insulation face) */}
          <rect 
            x={staticParts.motorPivot.x - MOTOR.HINGE_THICKNESS/2} 
            y={staticParts.motorPivot.y} 
            width={MOTOR.HINGE_THICKNESS} 
            height={MOTOR.PLATE_HEIGHT} 
            fill={STYLES.COLORS.METAL.FILL} 
            stroke={STYLES.COLORS.METAL.STROKE} 
            rx={1} 
          />
          
          {/* Moving Motor Body */}
          <MotorUnit 
            pivot={staticParts.motorPivot} 
            angle={dynamic.motorAngleDeg} 
            shaftStart={dynamic.shaftStart} 
            shaftLength={dynamic.shaftLength} 
            stopperPos={dynamic.stopperPos} 
            threadOffset={dynamic.rodExtension}
          />
          
          {/* Lower Pivot Pin */}
          <circle cx={staticParts.motorPivot.x} cy={staticParts.motorPivot.y} r={MOTOR.PIN_RADIUS} fill={STYLES.COLORS.BRASS.FILL} stroke={STYLES.COLORS.BRASS.STROKE} />

          {/* 6. The Nut (Connecting Rod to Flap) */}
          <g transform={`translate(${dynamic.nut.x}, ${dynamic.nut.y}) rotate(${dynamic.motorAngleDeg})`}>
            <rect 
              x={-HARDWARE.NUT_WIDTH/2} 
              y={-HARDWARE.NUT_HEIGHT} 
              width={HARDWARE.NUT_WIDTH} 
              height={HARDWARE.NUT_HEIGHT * 2} 
              rx={2} 
              fill={STYLES.COLORS.BRASS.FILL} 
              stroke={STYLES.COLORS.BRASS.STROKE} 
            />
             <circle cx={0} cy={0} r={3} fill={STYLES.COLORS.BRASS.DARK} />
          </g>

        </svg>
      </div>
    </div>
  );
};
