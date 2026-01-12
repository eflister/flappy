
import React, { useMemo } from 'react';
import { SimulationConfig } from '../types';
import { useSimulationPhysics } from '../hooks/useSimulationPhysics';
import { DIMENSIONS, STYLES } from '../constants';
import { rotatePoint } from '../utils/geometry';

// ============================================================================
// TYPES & HELPERS
// ============================================================================

interface LabelDef {
  id: string;
  text: string;
  target: { x: number, y: number };
  idealY: number;
  y?: number;
  type?: 'straight' | 'ortho-top' | 'ortho-bottom';
}

const resolveLabelLayout = (labels: LabelDef[], minSpacing: number) => {
  if (labels.length === 0) return [];
  
  // 1. Sort by ideal Y (Physics Order)
  const sorted = [...labels].sort((a, b) => a.idealY - b.idealY);
  
  // 2. Stack downwards to prevent overlap
  sorted[0].y = sorted[0].idealY;

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    
    if (curr.idealY < (prev.y! + minSpacing)) {
      curr.y = prev.y! + minSpacing;
    } else {
      curr.y = curr.idealY;
    }
  }
  return sorted;
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const MotorUnit: React.FC<{
  pivot: { x: number, y: number };
  angle: number;
  shaftStart: { x: number, y: number };
  shaftLength: number;
  stopperPos: number;
  threadOffset: number;
}> = ({ pivot, angle, shaftStart, shaftLength, stopperPos, threadOffset }) => {
  const { MOTOR } = DIMENSIONS;
  const motorX = MOTOR.HINGE_LEAF_LENGTH - MOTOR.WIDTH;
  const motorY = -MOTOR.HINGE_THICKNESS / 2 - MOTOR.HEIGHT;

  return (
    <g transform={`translate(${pivot.x}, ${pivot.y}) rotate(${angle})`}>
      <rect x={0} y={-MOTOR.HINGE_THICKNESS / 2} width={MOTOR.HINGE_LEAF_LENGTH} height={MOTOR.HINGE_THICKNESS} fill={STYLES.COLORS.METAL.FILL} stroke={STYLES.COLORS.METAL.STROKE} rx={1} />
      <rect x={motorX} y={motorY} width={MOTOR.WIDTH} height={MOTOR.HEIGHT} rx={4} fill={STYLES.COLORS.METAL.DARK} stroke={STYLES.COLORS.METAL.STROKE} />
      <text x={motorX + MOTOR.WIDTH / 2} y={motorY + MOTOR.HEIGHT / 2 + 4} fill="#cbd5e1" fontSize="10" fontWeight={600} textAnchor="middle" style={{ transformBox: "fill-box", transformOrigin: "center", transform: "rotate(180deg)" }}>Motor</text>
      <g transform={`translate(${MOTOR.HINGE_LEAF_LENGTH}, ${-((MOTOR.HINGE_THICKNESS/2) + (MOTOR.HEIGHT/2))})`}>
        <rect x={0} y={-MOTOR.ROD_THICKNESS / 2} width={shaftLength} height={MOTOR.ROD_THICKNESS} fill={STYLES.COLORS.METAL.FILL} stroke={STYLES.COLORS.METAL.STROKE} rx={1} />
        <rect x={0} y={-MOTOR.ROD_THICKNESS / 2} width={shaftLength} height={MOTOR.ROD_THICKNESS} fill="url(#threads)" />
        <rect x={shaftLength - 4} y={-5} width={5} height={10} fill={STYLES.COLORS.BRASS.FILL} stroke={STYLES.COLORS.BRASS.STROKE} rx={1} />
        {/* Render stopper if it's within visual bounds or at the zero limit */}
        {stopperPos !== undefined && (
          <rect x={Math.max(0, stopperPos - MOTOR.STOPPER_WIDTH)} y={-6} width={MOTOR.STOPPER_WIDTH} height={12} fill={STYLES.COLORS.BRASS.FILL} stroke={STYLES.COLORS.BRASS.STROKE} rx={1} />
        )}
      </g>
    </g>
  );
};

const LabelLine: React.FC<{
  item: LabelDef;
  direction: 'left' | 'right';
  originX: number;
}> = ({ item, direction, originX }) => {
  const textX = direction === 'left' ? originX - 10 : originX + 10;
  const textAnchor = direction === 'left' ? "end" : "start";

  let d = '';
  if (item.type === 'ortho-top' || item.type === 'ortho-bottom') {
    // Horizontal then Vertical (Up or Down depending on target Y)
    d = `M ${originX} ${item.y} L ${item.target.x} ${item.y} L ${item.target.x} ${item.target.y}`;
  } else {
    // Standard Direct Line
    d = `M ${originX} ${item.y} L ${item.target.x} ${item.target.y}`;
  }

  return (
    <g className="opacity-90 hover:opacity-100 transition-opacity group">
      <path 
        d={d} 
        stroke="#94a3b8" 
        strokeWidth="1" 
        fill="none" 
        markerEnd="url(#arrowhead)"
      />
      <text x={textX} y={item.y} dy="4" textAnchor={textAnchor} fontSize="11" fontFamily="monospace" fontWeight="500">
        <tspan fill="#0f172a" fontWeight="800">{item.id}.</tspan>
        <tspan fill="#334155" dx="4">{item.text}</tspan>
      </text>
    </g>
  );
};

const VerticalPartLabel: React.FC<{
  label: string;
  x: number;
  y: number;
}> = ({ label, x, y }) => (
  <text 
    x={x} 
    y={y} 
    fill="#1e293b" 
    fontSize="10" 
    fontWeight="700" 
    textAnchor="middle"
    dominantBaseline="middle"
    transform={`rotate(-90, ${x}, ${y})`}
    style={{ textShadow: '0px 0px 4px rgba(255,255,255,0.9)' }}
  >
    {label}
  </text>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const SimulationCanvas: React.FC<{ config: SimulationConfig }> = ({ config }) => {
  const sys = useSimulationPhysics(config);
  const { FRAME, INSULATION, MECHANICS, MOTOR, HARDWARE } = DIMENSIONS;
  const { layout, static: staticParts, dynamic } = sys;

  // --- Geometry Construction ---
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
  const topPanelY = sys.layout.screenTopY + FRAME.THICKNESS + 100;
  const topPanelH = 100; 
  const botPanelTopY = staticParts.pivot.y - MECHANICS.PIVOT_OFFSET_Y;
  const botPanelH = (sys.layout.screenBottomY - FRAME.THICKNESS) - botPanelTopY;

  // --- Bracket & Holes ---
  const brkX = -(MECHANICS.BRACKET_WIDTH / 2);
  const brkW = MECHANICS.BRACKET_WIDTH;
  const brkY_Top = -MECHANICS.BRACKET_LENGTH; 
  const brkY_Bot = 7.5; 
  const brkH = brkY_Bot - brkY_Top;
  const radius = 1;
  const bracketRectPath = `M ${brkX + radius} ${brkY_Top} h ${brkW - 2*radius} a ${radius} ${radius} 0 0 1 ${radius} ${radius} v ${brkH - 2*radius} a ${radius} ${radius} 0 0 1 -${radius} ${radius} h -${brkW - 2*radius} a ${radius} ${radius} 0 0 1 -${radius} -${radius} v -${brkH - 2*radius} a ${radius} ${radius} 0 0 1 ${radius} -${radius} z`;
  const holePaths = INSULATION.SCREW_HOLES.map(dy => {
    const r = MECHANICS.WASHER_THICKNESS - 0.5;
    const cy = -dy;
    return `M ${-r} ${cy} a ${r} ${r} 0 1 0 ${2*r} 0 a ${r} ${r} 0 1 0 -${2*r} 0 z`;
  }).join(' ');
  const combinedBracketPath = `${bracketRectPath} ${holePaths}`;

  const topSealY = topPanelY - 17;
  const botSealY = botPanelTopY + 12.5;

  // --- DYNAMIC CALCULATIONS ---
  const motorAngleRad = dynamic.motorAngleDeg * Math.PI / 180;
  const flapAngleRad = sys.currentAngleDeg * Math.PI / 180;

  const flapCenterGlobal = rotatePoint(
    { x: staticParts.pivot.x + (sys.layout.insulationX - staticParts.pivot.x) - (INSULATION.THICKNESS / 2), y: staticParts.pivot.y - (MECHANICS.FLAP_OFFSET_Y + (config.flapHeight / 2)) },
    staticParts.pivot, flapAngleRad
  );
  const washerGlobal = rotatePoint(
    { x: staticParts.pivot.x + (sys.layout.insulationX - staticParts.pivot.x) - 2, y: staticParts.pivot.y - (config.flapHeight + MECHANICS.FLAP_OFFSET_Y) + MECHANICS.MOUNT_MARGIN_TOP + 6 },
    staticParts.pivot, flapAngleRad
  );
  const nutMountGlobal = rotatePoint(
    { x: staticParts.pivot.x + (sys.layout.insulationX - staticParts.pivot.x) - INSULATION.THICKNESS - (staticParts.mountLength/2), y: staticParts.pivot.y - (config.flapHeight + MECHANICS.FLAP_OFFSET_Y) + MECHANICS.MOUNT_MARGIN_TOP + (MECHANICS.MOUNT_HEIGHT/2) },
    staticParts.pivot, flapAngleRad
  );
  const hingeMovingGlobal = rotatePoint(
    { x: staticParts.pivot.x - MECHANICS.BRACKET_WIDTH/2, y: staticParts.pivot.y - MECHANICS.BRACKET_LENGTH/2 },
    staticParts.pivot, flapAngleRad
  );
  const shaftMidpointGlobal = {
    x: (dynamic.shaftStart.x + dynamic.nut.x) / 2,
    y: (dynamic.shaftStart.y + dynamic.nut.y) / 2
  };
  const shaftEndGlobal = {
    x: dynamic.shaftStart.x + Math.cos(motorAngleRad) * dynamic.shaftLength,
    y: dynamic.shaftStart.y + Math.sin(motorAngleRad) * dynamic.shaftLength
  };
  const motorLeafGlobal = rotatePoint(
    { x: staticParts.motorPivot.x + MOTOR.HINGE_LEAF_LENGTH/2, y: staticParts.motorPivot.y },
    staticParts.motorPivot, motorAngleRad
  );
  const stopperGlobal = rotatePoint(
    { x: staticParts.motorPivot.x + MOTOR.HINGE_LEAF_LENGTH + Math.max(0, dynamic.stopperPos), y: staticParts.motorPivot.y - ((MOTOR.HINGE_THICKNESS/2) + (MOTOR.HEIGHT/2)) },
    staticParts.motorPivot, motorAngleRad
  );

  // ==========================================================================
  // LABEL LAYOUT SYSTEM
  // ==========================================================================
  
  // MIN_ARROW_LEN: User requested M = ~50px
  const MIN_ARROW_LEN = 50;
  const getChar = (i: number) => String.fromCharCode(65 + i);

  // ORDERED LIST for ID Assignment (Left Top->Bot, then Right Top->Bot)
  const ORDERED_LABELS_RAW = [
    // --- 1. LEFT SIDE (Top to Bottom) ---
    { side: 'left',  text: "Shaft End Cap", target: shaftEndGlobal, idealY: shaftEndGlobal.y },
    { side: 'left',  text: "Striker Plate (Washer)", target: washerGlobal, idealY: washerGlobal.y },
    { side: 'left',  text: "Pivoting Drive Nut", target: dynamic.nut, idealY: dynamic.nut.y },
    { side: 'left',  text: "Leadscrew (Trapezoidal)", target: shaftMidpointGlobal, idealY: shaftMidpointGlobal.y },
    { side: 'left',  text: "Travel Limit Collar", target: stopperGlobal, idealY: stopperGlobal.y },

    // --- 2. RIGHT SIDE (Top to Bottom) ---
    { side: 'right', text: "Extruded Vinyl Profile (Head)", target: { x: sys.layout.screenRightX - FRAME.WIDTH/2, y: sys.layout.screenTopY }, idealY: sys.layout.screenTopY - 20, type: 'ortho-top' as const },
    { side: 'right', text: "Compression Weather Seal", target: { x: sys.layout.insulationX + INSULATION.THICKNESS/2, y: topPanelY - topPanelH }, idealY: topPanelY - topPanelH + 10 },
    { side: 'right', text: "Insect Screen", target: { x: sys.layout.screenRightX, y: (sys.layout.screenTopY + 80 + topPanelY - topPanelH) / 2 }, idealY: topPanelY - topPanelH + 30 },
    { side: 'right', text: "Magnetic Catch", target: { x: sys.layout.insulationX, y: topPanelY - 34 }, idealY: topPanelY - 34 },
    { side: 'right', text: "Drive Nut Mount", target: nutMountGlobal, idealY: nutMountGlobal.y },
    { side: 'right', text: "Compression Weather Seal", target: { x: sys.layout.insulationX, y: topSealY }, idealY: topSealY },
    
    { side: 'right', text: "Articulating XPS Panel", target: flapCenterGlobal, idealY: flapCenterGlobal.y },
    
    { side: 'right', text: "Compression Weather Seal", target: { x: sys.layout.insulationX, y: botSealY }, idealY: staticParts.pivot.y - 50 },
    { side: 'right', text: "Moving Hinge Bracket", target: hingeMovingGlobal, idealY: staticParts.pivot.y - 25 },
    { side: 'right', text: "Fixed Hinge Bracket", target: { x: sys.layout.insulationX, y: staticParts.pivot.y }, idealY: staticParts.pivot.y },
    { side: 'right', text: "Pivot Pin (Primary)", target: staticParts.pivot, idealY: staticParts.pivot.y + 25 },
    
    { side: 'right', text: "Motor Mount Strap", target: motorLeafGlobal, idealY: motorLeafGlobal.y },
    { side: 'right', text: "Clevis Pin (Motor Mount)", target: staticParts.motorPivot, idealY: staticParts.motorPivot.y + 10 },
    { side: 'right', text: "Fixed Standoff Bracket", target: { x: staticParts.motorPivot.x, y: staticParts.motorPivot.y + 15 }, idealY: staticParts.motorPivot.y + 40 },
    
    { side: 'right', text: "Compression Weather Seal", target: { x: sys.layout.insulationX + INSULATION.THICKNESS/2, y: botPanelTopY + botPanelH }, idealY: botPanelTopY + botPanelH },
    { side: 'right', text: "Extruded Vinyl Profile (Sill)", target: { x: sys.layout.screenRightX - FRAME.WIDTH/2, y: sys.layout.screenBottomY }, idealY: botFrameTopY + 30, type: 'ortho-bottom' as const },
  ];

  const LABELS_WITH_IDS = ORDERED_LABELS_RAW.map((l, i) => ({ ...l, id: getChar(i) }));
  const leftLabelsRaw = LABELS_WITH_IDS.filter(l => l.side === 'left');
  const rightLabelsRaw = LABELS_WITH_IDS.filter(l => l.side === 'right');

  // Dynamic Margins
  const minLeftTargetX = Math.min(...leftLabelsRaw.map(l => l.target.x));
  const maxRightTargetX = Math.max(...rightLabelsRaw.map(l => l.target.x));
  
  const LEFT_MARGIN_X = minLeftTargetX - MIN_ARROW_LEN;
  // Ensure we have enough space for the widest element on the right
  const RIGHT_MARGIN_X = Math.max(740, maxRightTargetX + MIN_ARROW_LEN);

  const leftLabels = useMemo(() => resolveLabelLayout(leftLabelsRaw, 24), [sys, config]);
  const rightLabels = useMemo(() => resolveLabelLayout(rightLabelsRaw, 24), [sys, config]);

  // --- Dynamic ViewBox Calculation ---
  // Calculates the bounding box of all labels + geometry + padding to ensure nothing is cut off
  // and the svg auto-zooms to fit the container.
  
  const allLabels = [...leftLabels, ...rightLabels];
  const labelMinY = Math.min(...allLabels.map(l => l.y || 0));
  const labelMaxY = Math.max(...allLabels.map(l => l.y || 0));
  
  // Padding around the content
  const PADDING_Y = 40; // Enough for text height
  const TEXT_WIDTH_EST = 260; // Estimated max width of label text

  const vbMinY = Math.min(0, labelMinY) - PADDING_Y;
  const vbMaxY = Math.max(sys.layout.canvasHeight, labelMaxY) + PADDING_Y;
  const vbMinX = LEFT_MARGIN_X - TEXT_WIDTH_EST;
  const vbMaxX = RIGHT_MARGIN_X + TEXT_WIDTH_EST;
  
  const viewBox = `${vbMinX} ${vbMinY} ${vbMaxX - vbMinX} ${vbMaxY - vbMinY}`;

  return (
    <div className="w-full h-full relative flex items-center justify-center bg-slate-50 p-4">
      <div className="absolute top-4 left-6 z-10 pointer-events-none">
        <h1 className="text-2xl font-bold text-slate-400 font-mono tracking-tight">The Flappy v3</h1>
      </div>

      <div className="w-full h-full flex items-center justify-center">
        <svg 
          viewBox={viewBox} 
          className="max-w-full max-h-full" 
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', height: '100%' }}
        >
          <defs>
            <pattern id="insulationPattern" width="10" height="10" patternUnits="userSpaceOnUse">
               <circle cx="2" cy="2" r="1" fill={STYLES.COLORS.INSULATION.STROKE} opacity="0.2" />
               <circle cx="7" cy="7" r="1" fill={STYLES.COLORS.INSULATION.STROKE} opacity="0.2" />
            </pattern>
            <pattern id="threads" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform={`translate(${dynamic.rodExtension} 0) rotate(15)`}>
              <line x1="0" y1="0" x2="0" y2="4" stroke={STYLES.COLORS.METAL.STROKE} strokeWidth="1" opacity="0.6" />
            </pattern>
            <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
              <path d="M 0 0 L 6 2 L 0 4 z" fill="#94a3b8" />
            </marker>
          </defs>

          {/* LAYERS */}
          <path d={topFramePath} fill={STYLES.COLORS.VINYL.FILL} stroke={STYLES.COLORS.VINYL.STROKE} strokeWidth={STYLES.STROKE.DEFAULT} />
          <path d={botFramePath} fill={STYLES.COLORS.VINYL.FILL} stroke={STYLES.COLORS.VINYL.STROKE} strokeWidth={STYLES.STROKE.DEFAULT} />
          <line x1={sys.layout.screenRightX} y1={sys.layout.screenTopY} x2={sys.layout.screenRightX} y2={sys.layout.screenBottomY} stroke="black" strokeWidth="1" strokeDasharray={STYLES.STROKE.DASHED} opacity={0.3} />

          <g transform={`translate(${sys.layout.insulationX}, 0)`}>
            <rect y={topPanelY - topPanelH} width={INSULATION.THICKNESS} height={topPanelH} fill={STYLES.COLORS.INSULATION.FILL} stroke={STYLES.COLORS.INSULATION.STROKE} />
            <rect y={topPanelY - topPanelH} width={INSULATION.THICKNESS} height={topPanelH} fill="url(#insulationPattern)" />
            <rect y={botPanelTopY} width={INSULATION.THICKNESS} height={botPanelH} fill={STYLES.COLORS.INSULATION.FILL} stroke={STYLES.COLORS.INSULATION.STROKE} />
            <rect y={botPanelTopY} width={INSULATION.THICKNESS} height={botPanelH} fill="url(#insulationPattern)" />
            <ellipse cx={INSULATION.THICKNESS/2} cy={topPanelY - topPanelH} rx={HARDWARE.SEAL_W/2} ry={HARDWARE.SEAL_H/2} fill={STYLES.COLORS.SEALS} />
            <ellipse cx={INSULATION.THICKNESS/2} cy={botPanelTopY + botPanelH} rx={HARDWARE.SEAL_W/2} ry={HARDWARE.SEAL_H/2} fill={STYLES.COLORS.SEALS} />
            <ellipse cx={0} cy={topSealY} rx={HARDWARE.SEAL_H/2} ry={HARDWARE.SEAL_W/2} fill={STYLES.COLORS.SEALS} />
            <ellipse cx={0} cy={botSealY} rx={HARDWARE.SEAL_H/2} ry={HARDWARE.SEAL_W/2} fill={STYLES.COLORS.SEALS} />
          </g>

          <rect x={sys.layout.insulationX} y={topPanelY - 40} width={HARDWARE.MAGNET_W} height={HARDWARE.MAGNET_H} fill={STYLES.COLORS.SEALS} rx={1} />
          {/* Fixed Bracket: Attached to Fixed Insulation */}
          <rect x={staticParts.pivot.x - MECHANICS.BRACKET_WIDTH} y={staticParts.pivot.y - 10} width={sys.layout.insulationX - (staticParts.pivot.x - MECHANICS.BRACKET_WIDTH)} height={20} rx={2} fill={STYLES.COLORS.METAL.DARK} stroke={STYLES.COLORS.METAL.STROKE} />

          <g transform={`translate(${staticParts.pivot.x}, ${staticParts.pivot.y}) rotate(${sys.currentAngleDeg})`}>
            {/* Moving Bracket: Attached to Flap */}
            <path d={combinedBracketPath} fill={STYLES.COLORS.METAL.FILL} stroke={STYLES.COLORS.METAL.STROKE} fillRule="evenodd" />
            <g transform={`translate(${sys.layout.insulationX - staticParts.pivot.x}, 0)`}>
                <rect x={-INSULATION.THICKNESS} y={-(config.flapHeight + MECHANICS.FLAP_OFFSET_Y)} width={INSULATION.THICKNESS} height={config.flapHeight} fill={STYLES.COLORS.INSULATION.FILL} stroke={STYLES.COLORS.INSULATION.STROKE} />
                <rect x={-INSULATION.THICKNESS} y={-(config.flapHeight + MECHANICS.FLAP_OFFSET_Y)} width={INSULATION.THICKNESS} height={config.flapHeight} fill="url(#insulationPattern)" />
                <rect x={-4} y={-(config.flapHeight + MECHANICS.FLAP_OFFSET_Y) + MECHANICS.MOUNT_MARGIN_TOP} width={4} height={12} fill={STYLES.COLORS.SEALS} rx={0.5} />
                <rect x={-INSULATION.THICKNESS - staticParts.mountLength} y={-(config.flapHeight + MECHANICS.FLAP_OFFSET_Y) + MECHANICS.MOUNT_MARGIN_TOP} width={staticParts.mountLength} height={MECHANICS.MOUNT_HEIGHT} fill={STYLES.COLORS.METAL.DARK} stroke={STYLES.COLORS.METAL.STROKE} rx={1} />
            </g>
          </g>
          <circle cx={staticParts.pivot.x} cy={staticParts.pivot.y} r={MOTOR.PIN_RADIUS} fill={STYLES.COLORS.BRASS.FILL} stroke={STYLES.COLORS.BRASS.STROKE} />

          <rect x={staticParts.motorPivot.x - MOTOR.HINGE_THICKNESS/2} y={staticParts.motorPivot.y} width={MOTOR.HINGE_THICKNESS} height={MOTOR.PLATE_HEIGHT} fill={STYLES.COLORS.METAL.FILL} stroke={STYLES.COLORS.METAL.STROKE} rx={1} />
          <MotorUnit pivot={staticParts.motorPivot} angle={dynamic.motorAngleDeg} shaftStart={dynamic.shaftStart} shaftLength={dynamic.shaftLength} stopperPos={dynamic.stopperPos} threadOffset={dynamic.rodExtension} />
          <circle cx={staticParts.motorPivot.x} cy={staticParts.motorPivot.y} r={MOTOR.PIN_RADIUS} fill={STYLES.COLORS.BRASS.FILL} stroke={STYLES.COLORS.BRASS.STROKE} />

          <g transform={`translate(${dynamic.nut.x}, ${dynamic.nut.y}) rotate(${dynamic.motorAngleDeg})`}>
            <rect x={-HARDWARE.NUT_WIDTH/2} y={-HARDWARE.NUT_HEIGHT} width={HARDWARE.NUT_WIDTH} height={HARDWARE.NUT_HEIGHT * 2} rx={2} fill={STYLES.COLORS.BRASS.FILL} stroke={STYLES.COLORS.BRASS.STROKE} />
             <circle cx={0} cy={0} r={3} fill={STYLES.COLORS.BRASS.DARK} />
          </g>

          {/* ==================== ANNOTATIONS RENDER ==================== */}
          
          {/* 1. Left Column */}
          {leftLabels.map((l, i) => (
            <LabelLine key={l.id} item={l} direction="left" originX={LEFT_MARGIN_X} />
          ))}

          {/* 2. Right Column */}
          {rightLabels.map((l, i) => (
            <LabelLine key={l.id} item={l} direction="right" originX={RIGHT_MARGIN_X} />
          ))}

          {/* 3. Fixed Panel (Bottom Only) */}
          <VerticalPartLabel label="XPS Panel" x={sys.layout.insulationX + INSULATION.THICKNESS/2} y={botPanelTopY + botPanelH/2} />

        </svg>
      </div>
    </div>
  );
};
