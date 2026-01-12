
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
  // The pivot is at the hinge center.
  const motorX = MOTOR.HINGE_LEAF_LENGTH - MOTOR.WIDTH;
  const motorY = -MOTOR.HINGE_THICKNESS / 2 - MOTOR.HEIGHT;

  // We rotate the whole group around the pivot point
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
      {/* 
          We use a separate group for the rod to handle its specific offset.
          Since 'shaftStart' is passed as Global, we need to map it back to local or just draw it relative to pivot.
          However, calculating local coords here is cleaner:
          The rod is strictly parallel to the Hinge Leaf, offset by -(Thick/2 + Height/2)
      */}
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
        {/* Thread Texture (Pattern) */}
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
  // 1. Invoke Physics Engine
  const sys = useSimulationPhysics(config);
  
  // 2. Derive View Helper Variables
  const { FRAME, INSULATION, MECHANICS, MOTOR, HARDWARE } = DIMENSIONS;
  const { layout, static: staticParts, dynamic } = sys;

  // Frame SVG Paths
  const topFramePath = `
    M ${DIMENSIONS.LAYOUT.ORIGIN_X} ${sys.layout.screenTopY + FRAME.CHANNEL_DEPTH + FRAME.THICKNESS + 100} 
    L ${DIMENSIONS.LAYOUT.ORIGIN_X} ${sys.layout.screenTopY} 
    L ${sys.layout.screenRightX} ${sys.layout.screenTopY} 
    L ${sys.layout.screenRightX} ${sys.layout.screenTopY + FRAME.CHANNEL_DEPTH + FRAME.THICKNESS + 100} 
    L ${sys.layout.screenRightX - FRAME.LIP} ${sys.layout.screenTopY + FRAME.CHANNEL_DEPTH + FRAME.THICKNESS + 100} 
    L ${sys.layout.screenRightX - FRAME.LIP} ${sys.layout.screenTopY + FRAME.THICKNESS + 100} 
    L ${DIMENSIONS.LAYOUT.ORIGIN_X + FRAME.LIP} ${sys.layout.screenTopY + FRAME.THICKNESS + 100} 
    L ${DIMENSIONS.LAYOUT.ORIGIN_X + FRAME.LIP} ${sys.layout.screenTopY + FRAME.CHANNEL_DEPTH + FRAME.THICKNESS + 100} Z`;

  // Calculate bottom frame geometry based on dynamic screen height
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

  // Determine fixed panel heights
  const topPanelY = sys.layout.screenTopY + FRAME.THICKNESS + 100;
  // const topPanelH = 100 (Implicit in previous logic, hardcoded as start offset)
  // Let's be rigorous: The top panel ends where the overlap starts relative to flap top
  const topPanelH = 100; // Arbitrary fixed height for the top section
  
  const botPanelTopY = staticParts.pivot.y - MECHANICS.PIVOT_OFFSET_Y;
  const botPanelH = (sys.layout.screenBottomY - FRAME.THICKNESS) - botPanelTopY;

  return (
    <div className="w-full h-full relative flex justify-center bg-slate-50 overflow-hidden">
      
      {/* Title Overlay */}
      <div className="absolute top-4 left-6 z-10 pointer-events-none">
        <h1 className="text-2xl font-bold text-slate-400 font-mono tracking-tight">The Flappy v3</h1>
        <div className="text-xs text-slate-300 font-mono mt-1">
          ANGLE: {sys.currentAngleDeg.toFixed(1)}° / MAX: {sys.maxAngleDeg.toFixed(1)}°
        </div>
      </div>

      <div className="w-full flex justify-center bg-slate-50 overflow-x-auto">
        <svg 
          viewBox={`0 0 800 ${sys.layout.canvasHeight}`} 
          className="h-auto" 
          style={{ maxHeight: '100vh', width: '100%', minWidth: '800px' }}
        >
          <defs>
            {/* Insulation Pattern */}
            <pattern id="insulationPattern" width="10" height="10" patternUnits="userSpaceOnUse">
               <circle cx="2" cy="2" r="1" fill={STYLES.COLORS.INSULATION.STROKE} opacity="0.2" />
               <circle cx="7" cy="7" r="1" fill={STYLES.COLORS.INSULATION.STROKE} opacity="0.2" />
            </pattern>
            {/* Thread Pattern (Moves with nut to simulate turning) */}
            <pattern id="threads" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform={`translate(${dynamic.rodExtension} 0) rotate(15)`}>
              <line x1="0" y1="0" x2="0" y2="4" stroke={STYLES.COLORS.METAL.STROKE} strokeWidth="1" opacity="0.6" />
            </pattern>
          </defs>

          {/* 1. Static Frame Vinyl */}
          <path d={topFramePath} fill={STYLES.COLORS.VINYL.FILL} stroke={STYLES.COLORS.VINYL.STROKE} strokeWidth={STYLES.STROKE.DEFAULT} />
          <path d={botFramePath} fill={STYLES.COLORS.VINYL.FILL} stroke={STYLES.COLORS.VINYL.STROKE} strokeWidth={STYLES.STROKE.DEFAULT} />
          
          {/* Reference Line (Window Plane) */}
          <line 
            x1={sys.layout.screenRightX} y1={sys.layout.screenTopY} 
            x2={sys.layout.screenRightX} y2={sys.layout.screenBottomY} 
            stroke="black" strokeWidth="1" strokeDasharray={STYLES.STROKE.DASHED} 
          />

          {/* 2. Static Insulation Panels (Top & Bottom) */}
          <g transform={`translate(${sys.layout.insulationX}, 0)`}>
            {/* Top Panel */}
            <rect y={topPanelY - topPanelH} width={INSULATION.THICKNESS} height={topPanelH} fill={STYLES.COLORS.INSULATION.FILL} stroke={STYLES.COLORS.INSULATION.STROKE} />
            <rect y={topPanelY - topPanelH} width={INSULATION.THICKNESS} height={topPanelH} fill="url(#insulationPattern)" />
            
            {/* Bottom Panel */}
            <rect y={botPanelTopY} width={INSULATION.THICKNESS} height={botPanelH} fill={STYLES.COLORS.INSULATION.FILL} stroke={STYLES.COLORS.INSULATION.STROKE} />
            <rect y={botPanelTopY} width={INSULATION.THICKNESS} height={botPanelH} fill="url(#insulationPattern)" />
            
            {/* Seals */}
            <ellipse cx={INSULATION.THICKNESS/2} cy={topPanelY - topPanelH} rx={HARDWARE.SEAL_W/2} ry={HARDWARE.SEAL_H/2} fill={STYLES.COLORS.SEALS} />
            <ellipse cx={INSULATION.THICKNESS/2} cy={sys.layout.screenBottomY - FRAME.THICKNESS} rx={HARDWARE.SEAL_W/2} ry={HARDWARE.SEAL_H/2} fill={STYLES.COLORS.SEALS} />
          </g>

          {/* 3. Static Hardware (Magnet, Bracket) */}
          <rect 
            x={sys.layout.insulationX} 
            y={topPanelY - 40} 
            width={HARDWARE.MAGNET_W} 
            height={HARDWARE.MAGNET_H} 
            fill={STYLES.COLORS.SEALS} 
            rx={1} 
          />
          {/* Main Metal Bracket on Frame */}
          <rect 
            x={staticParts.pivot.x - MECHANICS.BRACKET_WIDTH} 
            y={staticParts.bracketTopY} 
            width={(sys.layout.insulationX - (staticParts.pivot.x - MECHANICS.BRACKET_WIDTH)) + 5} 
            height={20} 
            rx={2} 
            fill={STYLES.COLORS.METAL.DARK} 
            stroke={STYLES.COLORS.METAL.STROKE} 
          />

          {/* 4. Moving Flap Assembly */}
          <g transform={`rotate(${sys.currentAngleDeg}, ${staticParts.pivot.x}, ${staticParts.pivot.y})`}>
            {/* Insulation Panel */}
            <rect 
              x={sys.layout.insulationX - INSULATION.THICKNESS} 
              y={staticParts.pivot.y - (config.flapHeight + MECHANICS.FLAP_OFFSET_Y)} 
              width={INSULATION.THICKNESS} 
              height={config.flapHeight} 
              fill={STYLES.COLORS.INSULATION.FILL} 
              stroke={STYLES.COLORS.INSULATION.STROKE} 
            />
            <rect 
              x={sys.layout.insulationX - INSULATION.THICKNESS} 
              y={staticParts.pivot.y - (config.flapHeight + MECHANICS.FLAP_OFFSET_Y)} 
              width={INSULATION.THICKNESS} 
              height={config.flapHeight} 
              fill="url(#insulationPattern)" 
            />
            
            {/* Magnet Washer */}
            <rect 
              x={sys.layout.insulationX - 4} 
              y={staticParts.pivot.y - (config.flapHeight + MECHANICS.FLAP_OFFSET_Y) + MECHANICS.MOUNT_MARGIN_TOP} 
              width={4} 
              height={12} 
              fill={STYLES.COLORS.SEALS} 
              rx={0.5} 
            />

            {/* Actuator Bracket Mount */}
            <rect 
              x={sys.layout.insulationX - INSULATION.THICKNESS - staticParts.mountLength} 
              y={staticParts.pivot.y - (config.flapHeight + MECHANICS.FLAP_OFFSET_Y) + MECHANICS.MOUNT_MARGIN_TOP} 
              width={staticParts.mountLength} 
              height={MECHANICS.MOUNT_HEIGHT} 
              fill={STYLES.COLORS.METAL.DARK} 
              stroke={STYLES.COLORS.METAL.STROKE} 
              rx={1} 
            />

            {/* Pivot Hinge Bracket */}
            <rect 
              x={staticParts.pivot.x - MECHANICS.BRACKET_WIDTH} 
              y={staticParts.pivot.y - MECHANICS.BRACKET_LENGTH} 
              width={MECHANICS.BRACKET_WIDTH} 
              height={MECHANICS.BRACKET_LENGTH} 
              fill={STYLES.COLORS.METAL.FILL} 
              stroke={STYLES.COLORS.METAL.STROKE} 
              rx={1} 
            />
            
            {/* Screw Holes */}
            {INSULATION.SCREW_HOLES.map(dy => (
              <circle 
                key={dy} 
                cx={staticParts.pivot.x - MECHANICS.BRACKET_WIDTH/2} 
                cy={staticParts.pivot.y - dy} 
                r={MECHANICS.WASHER_THICKNESS - 0.5} 
                fill={STYLES.COLORS.METAL.FILL} 
              />
            ))}
          </g>

          {/* Pivot Pin */}
          <circle cx={staticParts.pivot.x} cy={staticParts.pivot.y} r={MOTOR.PIN_RADIUS} fill={STYLES.COLORS.BRASS.FILL} stroke={STYLES.COLORS.BRASS.STROKE} />

          {/* 5. Motor Assembly */}
          {/* Wall Plate */}
          <rect 
            x={staticParts.motorPivot.x - MOTOR.HINGE_THICKNESS} 
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
