
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
  side: 'left' | 'right';
}

interface RawLabel {
  text: string;
  side: 'left' | 'right';
  defaultY: number;      // Y position in the CLOSED state (for sorting)
  defaultX: number;      // X position in the CLOSED state (for secondary sorting)
  currentTarget: { x: number, y: number }; // Where it points NOW
  type?: 'straight' | 'ortho-top' | 'ortho-bottom';
  idealYOffset?: number; // Optional offset to force orthogonal lines to have a vertical segment
}

const resolveLabelLayout = (labels: LabelDef[], minSpacing: number) => {
  if (labels.length === 0) return [];
  
  const sorted = [...labels].sort((a, b) => a.idealY - b.idealY);
  // Initial pass
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

const LabelLine: React.FC<{
  item: LabelDef;
  originX: number;
}> = ({ item, originX }) => {
  const isLeft = item.side === 'left';
  const textX = isLeft ? originX - 8 : originX + 8;
  const textAnchor = isLeft ? "end" : "start";

  let d = '';
  if (item.type === 'ortho-top') {
    // Horizontal then Vertical down to target
    d = `M ${originX} ${item.y} L ${item.target.x} ${item.y} L ${item.target.x} ${item.target.y}`;
  } else if (item.type === 'ortho-bottom') {
    // Horizontal then Vertical up to target
    d = `M ${originX} ${item.y} L ${item.target.x} ${item.y} L ${item.target.x} ${item.target.y}`;
  } else {
    d = `M ${originX} ${item.y} L ${item.target.x} ${item.target.y}`;
  }

  return (
    <g className="opacity-90 hover:opacity-100 transition-opacity group">
      <path d={d} stroke="#64748b" strokeWidth="1" fill="none" markerEnd="url(#arrowhead)" />
      <text x={textX} y={item.y} dy="3" textAnchor={textAnchor} fontSize="10" fontFamily="monospace" fontWeight="600">
        <tspan fill="#0f172a" fontWeight="800">{item.id}.</tspan>
        <tspan fill="#334155" dx="4">{item.text}</tspan>
      </text>
    </g>
  );
};

const VerticalPartLabel: React.FC<{ label: string; x: number; y: number; color?: string }> = ({ label, x, y, color = "#1e293b" }) => (
  <text 
    x={x} y={y} fill={color} fontSize="9" fontWeight="700" textAnchor="middle" dominantBaseline="middle"
    transform={`rotate(-90, ${x}, ${y})`}
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

  // --- Static Parts Calculations ---
  const topPanelTopY = staticParts.topPanelTopY;
  const topPanelBottomY = staticParts.topPanelBottomY;
  const topPanelH = topPanelBottomY - topPanelTopY;

  const botPanelTopY = staticParts.botPanelTopY; 
  // Calculate Bottom Panel Height based on frame bottom
  const botFrameInnerY = sys.layout.screenBottomY - FRAME.THICKNESS;
  const botPanelH = botFrameInnerY - botPanelTopY;

  // Frame Geometry
  const frameL = layout.screenRightX - FRAME.WIDTH;
  const frameR = layout.screenRightX;
  const topFrameBottomY = sys.layout.screenTopY + FRAME.CHANNEL_DEPTH;
  const topFramePath = `M ${frameL} ${topFrameBottomY} L ${frameL} ${sys.layout.screenTopY} L ${frameR} ${sys.layout.screenTopY} L ${frameR} ${topFrameBottomY} L ${frameR - FRAME.LIP} ${topFrameBottomY} L ${frameR - FRAME.LIP} ${sys.layout.screenTopY + FRAME.THICKNESS} L ${frameL + FRAME.LIP} ${sys.layout.screenTopY + FRAME.THICKNESS} L ${frameL + FRAME.LIP} ${topFrameBottomY} Z`;

  const botFrameTopY = sys.layout.screenBottomY - FRAME.CHANNEL_DEPTH;
  const botFramePath = `M ${frameL} ${botFrameTopY} L ${frameL} ${sys.layout.screenBottomY} L ${frameR} ${sys.layout.screenBottomY} L ${frameR} ${botFrameTopY} L ${frameR - FRAME.LIP} ${botFrameTopY} L ${frameR - FRAME.LIP} ${sys.layout.screenBottomY - FRAME.THICKNESS} L ${frameL + FRAME.LIP} ${sys.layout.screenBottomY - FRAME.THICKNESS} L ${frameL + FRAME.LIP} ${botFrameTopY} Z`;
  
  // Bar Holes
  const barHoles = [];
  for(let y = 0; y > -staticParts.barLength - 10; y -= MECHANICS.BAR_HOLE_SPACING) {
    barHoles.push(y);
  }
  barHoles.push(0); 

  // --- Dynamic Points & Centroids ---
  const flapAngleRad = sys.currentAngleDeg * Math.PI / 180;
  
  // Striker
  // staticParts.strikerY is the global Y of the Center of the striker in closed position
  const strikerLocalY = staticParts.strikerY - staticParts.pivot.y;
  // Inset Flush with Surface
  const strikerLocalX = (MECHANICS.BAR_WIDTH/2) + INSULATION.THICKNESS - HARDWARE.MAGNET_W;
  const strikerLocal = { x: strikerLocalX, y: strikerLocalY };
  const strikerGlobal = rotatePoint(
    { x: staticParts.pivot.x + strikerLocal.x, y: staticParts.pivot.y + strikerLocal.y },
    staticParts.pivot, flapAngleRad
  );

  // Linkage Center
  const linkCenter = {
      x: (dynamic.nut.x + dynamic.flapMount.x) / 2,
      y: (dynamic.nut.y + dynamic.flapMount.y) / 2
  };
  
  const shaftMidY = dynamic.rodTop.y + (dynamic.shaftLength / 2);

  // Swing Arm Centroid
  const swingArmMidY = (-staticParts.barLength + MECHANICS.BAR_EXTENSION_BELOW) / 2;
  const swingArmCentroid = rotatePoint(
    { x: staticParts.pivot.x, y: staticParts.pivot.y + swingArmMidY },
    staticParts.pivot, flapAngleRad
  );

  // Limit Collar Centroid
  const limitCollarCentroid = {
    x: staticParts.motorPos.x,
    y: staticParts.limitCollarY + MOTOR.STOPPER_HEIGHT / 2
  };

  // Shaft End Cap Centroid
  // Cap sits on top of dynamic.rodTop.y
  const endCapCentroid = {
    x: dynamic.rodTop.x,
    y: dynamic.rodTop.y + MOTOR.SHAFT_END_CAP_H / 2
  };

  // --- CLOSED STATE Calculations (For Sorting) ---
  const pivotY = staticParts.pivot.y;
  const topHoleClosedY = pivotY + staticParts.mountHoleLocal.y; 
  const nutClosedY = staticParts.nutY_Closed; 
  const shaftTopClosedY = staticParts.shaftTopY; 
  const linkageClosedY = (topHoleClosedY + nutClosedY) / 2;
  const swingArmClosedY = pivotY + swingArmMidY;

  // --- Raw Labels Definition ---
  const RAW_LABELS: RawLabel[] = [
    { 
      text: "Vinyl Frame (Head)", side: 'right', 
      defaultY: sys.layout.screenTopY, defaultX: layout.screenRightX, 
      currentTarget: { x: layout.screenRightX - FRAME.WIDTH/2, y: sys.layout.screenTopY }, 
      type: 'ortho-top', idealYOffset: -20 
    },
    { 
      text: "Top Panel Compression Seal", side: 'right', 
      defaultY: topPanelTopY, defaultX: sys.layout.insulationX, 
      currentTarget: { x: sys.layout.insulationX + INSULATION.THICKNESS/2, y: topPanelTopY } 
    },
    { 
      text: "Magnetic Catch", side: 'right', 
      defaultY: staticParts.magnetY, defaultX: sys.layout.insulationX,
      currentTarget: { x: sys.layout.insulationX, y: staticParts.magnetY } 
    },
    { 
      text: "Striker Plate", side: 'left', 
      defaultY: staticParts.strikerY, defaultX: staticParts.pivot.x + strikerLocalX,
      currentTarget: strikerGlobal 
    },
    { 
      text: "Shaft End Cap", side: 'left', 
      defaultY: shaftTopClosedY, defaultX: staticParts.motorPos.x,
      currentTarget: endCapCentroid 
    },
    { 
      text: "Swing Arm Top Pivot", side: 'left', 
      defaultY: topHoleClosedY, defaultX: staticParts.pivot.x,
      currentTarget: dynamic.flapMount 
    },
    { 
      text: "Interface Compression Seal (Top)", side: 'right', 
      defaultY: topPanelBottomY - MECHANICS.OVERLAP_TOP/2, defaultX: sys.layout.insulationX,
      currentTarget: { x: sys.layout.insulationX, y: topPanelBottomY - MECHANICS.OVERLAP_TOP/2 } 
    },
    { 
      text: "Insect Screen Mesh", side: 'right', 
      defaultY: (sys.layout.screenTopY + sys.layout.screenBottomY)/2, defaultX: layout.screenRightX,
      currentTarget: {x: layout.screenRightX, y: (sys.layout.screenTopY + sys.layout.screenBottomY)/2} 
    },
    { 
      text: "Actuator Linkage Arm", side: 'left', 
      defaultY: linkageClosedY, defaultX: staticParts.motorPos.x,
      currentTarget: linkCenter 
    },
    { 
      text: "Trunnion Journal Bearing", side: 'left', 
      defaultY: nutClosedY, defaultX: staticParts.motorPos.x,
      currentTarget: dynamic.nut 
    },
    { 
      text: "Acme Threaded Leadscrew", side: 'left', 
      defaultY: nutClosedY + 30, defaultX: staticParts.motorPos.x, 
      currentTarget: {x: staticParts.motorPos.x, y: shaftMidY} 
    },
    { 
      text: "Swing Arm", side: 'left',
      defaultY: swingArmClosedY, defaultX: staticParts.pivot.x,
      currentTarget: swingArmCentroid 
    },
    { 
      text: "Interface Compression Seal (Bottom)", side: 'right', 
      defaultY: botPanelTopY + MECHANICS.OVERLAP_BOTTOM/2, defaultX: sys.layout.insulationX,
      currentTarget: { x: sys.layout.insulationX, y: botPanelTopY + MECHANICS.OVERLAP_BOTTOM/2 } 
    },
    { 
      text: "Actuator Mounting Bracket", side: 'right', 
      defaultY: staticParts.pivot.y + 15, defaultX: staticParts.pivot.x,
      currentTarget: { x: staticParts.pivot.x + 2, y: staticParts.pivot.y + 15 } 
    },
    { 
      text: "Pivot Pin", side: 'right', 
      defaultY: staticParts.pivot.y, defaultX: staticParts.pivot.x,
      currentTarget: staticParts.pivot 
    },
    { 
      text: "Travel Limit Collar", side: 'left', 
      defaultY: staticParts.limitCollarY, defaultX: staticParts.motorPos.x,
      currentTarget: limitCollarCentroid 
    },
    { 
      text: "Bottom Panel Compression Seal", side: 'right', 
      defaultY: botFrameInnerY, defaultX: sys.layout.insulationX,
      currentTarget: { x: sys.layout.insulationX + INSULATION.THICKNESS/2, y: botFrameInnerY } 
    },
    { 
      text: "Vinyl Frame (Sill)", side: 'right', 
      defaultY: sys.layout.screenBottomY + 10, defaultX: layout.screenRightX,
      currentTarget: { x: layout.screenRightX - FRAME.WIDTH/2, y: sys.layout.screenBottomY }, 
      type: 'ortho-bottom', idealYOffset: 20 
    },
  ];

  // --- Sort & Assign IDs ---
  const getChar = (i: number) => String.fromCharCode(65 + i);
  
  const { leftLabels, rightLabels } = useMemo(() => {
    const leftRaw = RAW_LABELS.filter(l => l.side === 'left');
    const rightRaw = RAW_LABELS.filter(l => l.side === 'right');

    const sortFn = (a: RawLabel, b: RawLabel) => {
        if (Math.abs(a.defaultY - b.defaultY) > 2) return a.defaultY - b.defaultY;
        return a.defaultX - b.defaultX;
    };
    leftRaw.sort(sortFn);
    rightRaw.sort(sortFn);

    let globalIndex = 0;
    
    const process = (raw: RawLabel[]): LabelDef[] => raw.map(r => ({
        id: getChar(globalIndex++),
        text: r.text,
        target: r.currentTarget,
        idealY: r.currentTarget.y + (r.idealYOffset || 0),
        type: r.type,
        side: r.side
    }));

    const left = process(leftRaw);
    const right = process(rightRaw);

    return {
        leftLabels: resolveLabelLayout(left, 20),
        rightLabels: resolveLabelLayout(right, 20)
    };

  }, [sys, config]);

  // ViewBox Calculation
  const PADDING = 40; 
  const TEXT_WIDTH = 220; 
  const MIN_ARROW_LENGTH = 70;

  const vbMinY = DIMENSIONS.LAYOUT.TOP_MARGIN - PADDING;
  const vbMaxY = sys.layout.screenBottomY + PADDING;
  
  const leftTargetsX = leftLabels.map(l => l.target.x);
  const minLeftTargetX = leftTargetsX.length > 0 ? Math.min(...leftTargetsX) : layout.insulationX;
  const leftLineOriginX = minLeftTargetX - MIN_ARROW_LENGTH;
  const vbMinX = leftLineOriginX - TEXT_WIDTH;
  
  const rightTargetsX = rightLabels.map(l => l.target.x);
  const maxRightTargetX = rightTargetsX.length > 0 ? Math.max(...rightTargetsX) : layout.screenRightX;
  const rightLineOriginX = maxRightTargetX + MIN_ARROW_LENGTH;
  const vbMaxX = rightLineOriginX + TEXT_WIDTH; 

  const viewBox = `${vbMinX} ${vbMinY} ${vbMaxX - vbMinX} ${vbMaxY - vbMinY}`;

  // Mount Geometry
  const mountRightX = layout.insulationX;
  const mountLeftX = staticParts.motorPos.x + MOTOR.WIDTH/2;
  const mountTopY = staticParts.pivot.y - 10;
  const mountBottomY = staticParts.motorPos.y + MOTOR.HEIGHT/2;

  return (
    <div className="w-full h-full relative flex items-center justify-center bg-slate-50 p-4">
      <div className="absolute top-4 left-6 z-10 pointer-events-none">
        <h1 className="text-2xl font-bold text-slate-400 font-mono tracking-tight">The Flappy v4</h1>
      </div>

      <div className="w-full h-full flex items-center justify-center">
        <svg viewBox={viewBox} className="max-w-full max-h-full" preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%' }}>
          <defs>
            <pattern id="insulationPattern" width="10" height="10" patternUnits="userSpaceOnUse">
               <circle cx="2" cy="2" r="1" fill={STYLES.COLORS.INSULATION.STROKE} opacity="0.2" />
               <circle cx="7" cy="7" r="1" fill={STYLES.COLORS.INSULATION.STROKE} opacity="0.2" />
            </pattern>
            <pattern id="threads" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform={`translate(0, ${dynamic.threadOffset})`}>
               <line x1="0" y1="4" x2="4" y2="0" stroke="black" strokeWidth="1" opacity="0.3" />
            </pattern>
            <mask id="barHoles">
              <rect x="-100" y="-800" width="200" height="1600" fill="white" />
              {barHoles.map((y, i) => (
                <circle key={i} cx={MECHANICS.BAR_WIDTH / 2} cy={y} r={2.5} fill="black" />
              ))}
            </mask>
            <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto"><path d="M 0 0 L 6 2 L 0 4 z" fill="#64748b" /></marker>
          </defs>

          {/* === LAYER 1: FRAME & FIXED INSULATION === */}
          <line x1={layout.screenRightX} y1={sys.layout.screenTopY} x2={layout.screenRightX} y2={sys.layout.screenBottomY} stroke={STYLES.COLORS.SCREEN} strokeWidth="2" strokeDasharray="1,1" />
          <path d={topFramePath} fill={STYLES.COLORS.VINYL.FILL} stroke={STYLES.COLORS.VINYL.STROKE} strokeWidth={STYLES.STROKE.DEFAULT} />
          <path d={botFramePath} fill={STYLES.COLORS.VINYL.FILL} stroke={STYLES.COLORS.VINYL.STROKE} strokeWidth={STYLES.STROKE.DEFAULT} />
          
          <g transform={`translate(${sys.layout.insulationX}, 0)`}>
            <rect y={topPanelTopY} width={INSULATION.THICKNESS} height={topPanelH} fill={STYLES.COLORS.INSULATION.FILL} stroke={STYLES.COLORS.INSULATION.STROKE} />
            <rect y={topPanelTopY} width={INSULATION.THICKNESS} height={topPanelH} fill="url(#insulationPattern)" />
            <rect y={botPanelTopY} width={INSULATION.THICKNESS} height={botPanelH} fill={STYLES.COLORS.INSULATION.FILL} stroke={STYLES.COLORS.INSULATION.STROKE} />
            <rect y={botPanelTopY} width={INSULATION.THICKNESS} height={botPanelH} fill="url(#insulationPattern)" />
            <VerticalPartLabel label="XPS Panel" x={INSULATION.THICKNESS/2} y={botPanelTopY + botPanelH/2} color="#db2777" />
            <ellipse cx={INSULATION.THICKNESS/2} cy={topPanelTopY} rx={HARDWARE.MAGNET_H/2} ry={HARDWARE.MAGNET_W/2} fill={STYLES.COLORS.SEALS} />
            <ellipse cx={INSULATION.THICKNESS/2} cy={botFrameInnerY} rx={HARDWARE.MAGNET_H/2} ry={HARDWARE.MAGNET_W/2} fill={STYLES.COLORS.SEALS} />
            <ellipse cx={0} cy={topPanelBottomY - MECHANICS.OVERLAP_TOP/2} rx={HARDWARE.MAGNET_W/2} ry={HARDWARE.MAGNET_H/2} fill={STYLES.COLORS.SEALS} />
            <ellipse cx={0} cy={botPanelTopY + MECHANICS.OVERLAP_BOTTOM/2} rx={HARDWARE.MAGNET_W/2} ry={HARDWARE.MAGNET_H/2} fill={STYLES.COLORS.SEALS} />
          </g>

          {/* Magnet: Fixed flush on the surface of the fixed panel (at insulationX) */}
          <rect x={sys.layout.insulationX} y={staticParts.magnetY - HARDWARE.MAGNET_H/2} width={HARDWARE.MAGNET_W} height={HARDWARE.MAGNET_H} fill={STYLES.COLORS.MAGNET} rx={1} />

          <path d={`M ${mountRightX} ${mountTopY} L ${mountLeftX} ${mountTopY} L ${mountLeftX} ${mountBottomY} L ${mountRightX} ${mountBottomY} Z`} fill={STYLES.COLORS.METAL.FILL} stroke={STYLES.COLORS.METAL.STROKE} />
          
          <g transform={`translate(${staticParts.motorPos.x}, ${staticParts.motorPos.y})`}>
             <rect x={-MOTOR.WIDTH/2} y={-MOTOR.HEIGHT/2} width={MOTOR.WIDTH} height={MOTOR.HEIGHT} rx={2} fill={STYLES.COLORS.METAL.DARK} stroke={STYLES.COLORS.METAL.STROKE} />
             <VerticalPartLabel label="Motor" x={0} y={0} color="#94a3b8" />
          </g>

          <g>
            <rect x={dynamic.rodTop.x - MOTOR.ROD_THICKNESS/2} y={dynamic.rodTop.y} width={MOTOR.ROD_THICKNESS} height={dynamic.shaftLength} fill={STYLES.COLORS.METAL.FILL} />
            <rect x={dynamic.rodTop.x - MOTOR.ROD_THICKNESS/2} y={dynamic.rodTop.y} width={MOTOR.ROD_THICKNESS} height={dynamic.shaftLength} fill="url(#threads)" />
            {/* Shaft End Cap */}
            <rect x={dynamic.rodTop.x - MOTOR.ROD_THICKNESS} y={dynamic.rodTop.y} width={MOTOR.ROD_THICKNESS*2} height={MOTOR.SHAFT_END_CAP_H} rx={1} fill={STYLES.COLORS.BRASS.FILL} stroke={STYLES.COLORS.BRASS.STROKE} />
            <rect x={staticParts.motorPos.x - MOTOR.STOPPER_WIDTH/2} y={staticParts.limitCollarY} width={MOTOR.STOPPER_WIDTH} height={MOTOR.STOPPER_HEIGHT} rx={1} fill={STYLES.COLORS.BRASS.FILL} stroke={STYLES.COLORS.BRASS.STROKE} />
          </g>

          {/* === LAYER 2: MOVING PARTS === */}
          <g transform={`translate(${staticParts.pivot.x}, ${staticParts.pivot.y}) rotate(${sys.currentAngleDeg})`}>
            <g transform={`translate(${-MECHANICS.BAR_WIDTH/2}, 0)`}>
              <rect x={0} y={-staticParts.barLength} width={MECHANICS.BAR_WIDTH} height={staticParts.barLength + MECHANICS.BAR_EXTENSION_BELOW} rx={1} fill={STYLES.COLORS.METAL.FILL} mask="url(#barHoles)" />
              <rect x={0} y={-staticParts.barLength} width={MECHANICS.BAR_WIDTH} height={staticParts.barLength + MECHANICS.BAR_EXTENSION_BELOW} rx={1} fill="none" stroke={STYLES.COLORS.METAL.STROKE} />
            </g>

            <g transform={`translate(${MECHANICS.BAR_WIDTH/2}, ${-staticParts.flapHeight - MECHANICS.PIVOT_OFFSET_Y})`}>
              <rect x={0} y={0} width={INSULATION.THICKNESS} height={staticParts.flapHeight} fill={STYLES.COLORS.INSULATION.FILL} stroke={STYLES.COLORS.INSULATION.STROKE} />
              <rect x={0} y={0} width={INSULATION.THICKNESS} height={staticParts.flapHeight} fill="url(#insulationPattern)" />
            </g>

            {/* Striker Plate: Corrected Y position to center it based on the coordinate which is its center */}
            <rect x={strikerLocalX} y={strikerLocalY - HARDWARE.MAGNET_H/2} width={HARDWARE.MAGNET_W} height={HARDWARE.MAGNET_H} fill={STYLES.COLORS.MAGNET} />
            <circle cx={staticParts.mountHoleLocal.x} cy={staticParts.mountHoleLocal.y} r={MECHANICS.HINGE_KNUCKLE_R} fill={STYLES.COLORS.METAL.FILL} stroke={STYLES.COLORS.METAL.STROKE} />
          </g>

          <g transform={`translate(${dynamic.nut.x}, ${dynamic.nut.y})`}>
             <rect x={-HARDWARE.NUT_WIDTH/2} y={-HARDWARE.NUT_HEIGHT/2} width={HARDWARE.NUT_WIDTH} height={HARDWARE.NUT_HEIGHT} rx={1} fill={STYLES.COLORS.BRASS.FILL} stroke={STYLES.COLORS.BRASS.STROKE} />
             <circle cx={0} cy={0} r={1.5} fill="black" />
          </g>

          <g transform={`translate(${dynamic.nut.x}, ${dynamic.nut.y}) rotate(${dynamic.linkAngleDeg})`}>
             <rect x={-5} y={-MECHANICS.HINGE_LEAF_WIDTH/2} width={MECHANICS.LINK_LENGTH + 5} height={MECHANICS.HINGE_LEAF_WIDTH} rx={2} fill={STYLES.COLORS.METAL.FILL} stroke={STYLES.COLORS.METAL.STROKE} />
          </g>
          
          {/* Visual Pivot Point on top of Linkage at Nut */}
          <circle cx={dynamic.nut.x} cy={dynamic.nut.y} r={2} fill={STYLES.COLORS.BRASS.FILL} stroke={STYLES.COLORS.BRASS.STROKE} />

          <circle cx={dynamic.flapMount.x} cy={dynamic.flapMount.y} r={MECHANICS.HINGE_KNUCKLE_R} fill={STYLES.COLORS.BRASS.FILL} stroke={STYLES.COLORS.BRASS.STROKE} />
          <circle cx={staticParts.pivot.x} cy={staticParts.pivot.y} r={MOTOR.PIN_RADIUS} fill={STYLES.COLORS.BRASS.FILL} stroke={STYLES.COLORS.BRASS.STROKE} />

          {leftLabels.map((l) => (<LabelLine key={l.id} item={l} originX={leftLineOriginX} />))}
          {rightLabels.map((l) => (<LabelLine key={l.id} item={l} originX={rightLineOriginX} />))}

        </svg>
      </div>
    </div>
  );
};
