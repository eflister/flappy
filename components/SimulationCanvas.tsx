import React, { useMemo } from 'react';
import { SimulationConfig, Point } from '../types';
import { DIMS, STYLES, SIM_LIMITS } from '../constants';

// ==========================================
// 1. Math Helpers (Physics & Collision)
// ==========================================

const rotate = (p: Point, center: Point, rad: number): Point => ({
  x: Math.cos(rad) * (p.x - center.x) - Math.sin(rad) * (p.y - center.y) + center.x,
  y: Math.sin(rad) * (p.x - center.x) + Math.cos(rad) * (p.y - center.y) + center.y,
});

const getAngle = (p1: Point, p2: Point) => Math.atan2(p2.y - p1.y, p2.x - p1.x);
const getDist = (p1: Point, p2: Point) => Math.hypot(p2.x - p1.x, p2.y - p1.y);

// --- SAT Collision Helpers ---

// Project polygon onto an axis
const getProjection = (poly: Point[], axis: Point) => {
  let min = Infinity;
  let max = -Infinity;
  for (const p of poly) {
    const dot = p.x * axis.x + p.y * axis.y;
    if (dot < min) min = dot;
    if (dot > max) max = dot;
  }
  return { min, max };
};

// Check if two polygons are separated along an axis
const isSeparated = (polyA: Point[], polyB: Point[], axis: Point) => {
  const projA = getProjection(polyA, axis);
  const projB = getProjection(polyB, axis);
  return projA.max < projB.min || projB.max < projA.min;
};

// Main SAT Intersection Test
const polygonsIntersect = (polyA: Point[], polyB: Point[]) => {
  // Test Normals of Poly A
  for (let i = 0; i < polyA.length; i++) {
    const p1 = polyA[i];
    const p2 = polyA[(i + 1) % polyA.length];
    const axis = { x: -(p2.y - p1.y), y: p2.x - p1.x }; // Normal
    if (isSeparated(polyA, polyB, axis)) return false;
  }
  // Test Normals of Poly B
  for (let i = 0; i < polyB.length; i++) {
    const p1 = polyB[i];
    const p2 = polyB[(i + 1) % polyB.length];
    const axis = { x: -(p2.y - p1.y), y: p2.x - p1.x }; // Normal
    if (isSeparated(polyA, polyB, axis)) return false;
  }
  return true;
};

// ==========================================
// 2. Physics Engine Hook
// ==========================================
const useSimulationPhysics = (config: SimulationConfig) => {
  const { flapHeight, actuatorExtension, motorSpacing } = config;

  // --- A. Geometry Setup ---
  const topFrameY = DIMS.LAYOUT.TOP_MARGIN;
  const topPanelHeight = 100; 
  const topPanelEndY = topFrameY + DIMS.FRAME.THICKNESS + topPanelHeight;

  // Pivot & Flap Placement
  // Note: Y axis increases downwards.
  const flapTopY_Closed = topPanelEndY - DIMS.MECH.OVERLAP_REGION;
  const flapBottomY_Closed = flapTopY_Closed + flapHeight;
  const pivotY = flapBottomY_Closed + DIMS.MECH.FLAP_OFFSET_Y;
  const bottomMotorPivotY = pivotY + motorSpacing;

  // Horizontal Layout
  const channelCenterX = DIMS.FRAME.ORIGIN_X + (DIMS.FRAME.WIDTH / 2);
  const fixedInsulationX = channelCenterX - (DIMS.INSULATION.THICKNESS / 2);
  // Flap is shifted left by thickness relative to fixed insulation line
  const flapX = fixedInsulationX - DIMS.INSULATION.THICKNESS;
  
  const metalBracketX = flapX - DIMS.MECH.BRACKET_WIDTH;
  const pivotX = metalBracketX + (DIMS.MECH.BRACKET_WIDTH / 2);
  const bottomMotorPivotX = fixedInsulationX - (DIMS.MOTOR.HINGE_THICKNESS / 2);

  // --- B. Mount Length Calculation ---
  const obstacleCorner = { x: metalBracketX - 5, y: pivotY + 10 };
  const motorPivot = { x: bottomMotorPivotX, y: bottomMotorPivotY };
  
  const flapTopLocalY = -(DIMS.MECH.FLAP_OFFSET_Y + flapHeight);
  // Nut is slightly below the top edge of the flap
  const topMountLocalY = flapTopLocalY + DIMS.MECH.TOP_MOUNT_MARGIN; 
  const mountHeight = DIMS.MECH.MOUNT_HEIGHT;
  const nutGlobalY_Closed = pivotY + topMountLocalY + (mountHeight / 2);

  // Solve for mount length to clear bracket
  const dx = obstacleCorner.x - 2 - motorPivot.x;
  const dy = obstacleCorner.y + 2 - motorPivot.y;
  const inverseSlope = dx / dy;
  const dy_to_Nut = nutGlobalY_Closed - motorPivot.y;
  const nutGlobalX_Closed = motorPivot.x + (inverseSlope * dy_to_Nut);
  const calculatedMountLength = Math.max(30, flapX - nutGlobalX_Closed);

  // --- C. Kinematics Helper ---
  const getKinematics = (angleDeg: number) => {
    const rad = angleDeg * Math.PI / 180;
    const center = { x: pivotX, y: pivotY };
    
    // Nut Position (Rotated with Flap)
    const nutLocal = { x: (flapX - calculatedMountLength) - pivotX, y: topMountLocalY + (mountHeight / 2) };
    const nutGlobal = rotate({ x: pivotX + nutLocal.x, y: pivotY + nutLocal.y }, center, rad);

    // Motor Angle (Points to Nut)
    // Motor Shaft is offset from Motor Pivot Center
    const motorShaftOffset = -((DIMS.MOTOR.HINGE_THICKNESS / 2) + (DIMS.MOTOR.HEIGHT / 2));
    const distPivotToNut = getDist(motorPivot, nutGlobal);
    const anglePivotToNut = getAngle(motorPivot, nutGlobal);
    // Law of sines / Offset compensation to find actual motor body angle
    const angleCorrection = Math.asin(Math.max(-1, Math.min(1, motorShaftOffset / distPivotToNut)));
    const motorAngleRad = anglePivotToNut - angleCorrection;

    // Shaft Start Point (Exit from Motor Hinge)
    const leafL = DIMS.MOTOR.HINGE_LEAF_LENGTH;
    // Shaft starts at the end of the hinge leaf
    const shaftStartLocal = { x: leafL, y: motorShaftOffset }; 
    const shaftStartGlobal = rotate(
      { x: motorPivot.x + shaftStartLocal.x, y: motorPivot.y + shaftStartLocal.y },
      motorPivot,
      motorAngleRad
    );

    return { nutGlobal, motorAngleRad, shaftStartGlobal, distPivotToNut };
  };

  // --- D. Shaft Length Calculation ---
  // The shaft length is determined by the CLOSED position (angle = 0).
  const kClosed = getKinematics(0);
  const fixedShaftLength = getDist(kClosed.shaftStartGlobal, kClosed.nutGlobal) + 25; // 25mm clearance

  // --- E. SAT Collision Detection ---
  const checkCollision = (angleDeg: number) => {
    const k = getKinematics(angleDeg);
    const rad = angleDeg * Math.PI / 180;
    const center = { x: pivotX, y: pivotY };

    // 1. Nut vs Motor Housing (Basic Distance Check)
    const minDist = DIMS.MOTOR.HINGE_LEAF_LENGTH + DIMS.NUT.WIDTH/2 + 2;
    if (k.distPivotToNut < minDist) return true;

    // 2. Motor Body vs Wall (Point checks)
    const backCorners = [
      { x: DIMS.MOTOR.HINGE_LEAF_LENGTH, y: -DIMS.MOTOR.HINGE_THICKNESS/2 },
      { x: DIMS.MOTOR.HINGE_LEAF_LENGTH - DIMS.MOTOR.WIDTH, y: -DIMS.MOTOR.HINGE_THICKNESS/2 - DIMS.MOTOR.HEIGHT }
    ];
    for (const p of backCorners) {
       const gp = rotate({ x: motorPivot.x + p.x, y: motorPivot.y + p.y }, motorPivot, k.motorAngleRad);
       if (gp.x > fixedInsulationX) return true;
    }

    // 3. Rod vs Flap (Separating Axis Theorem)
    
    // Build Flap Polygon
    const tlLocalX = flapX - pivotX; 
    const trLocalX = tlLocalX + DIMS.INSULATION.THICKNESS;
    const topLocalY = -(DIMS.MECH.FLAP_OFFSET_Y + flapHeight);
    const botLocalY = -(DIMS.MECH.FLAP_OFFSET_Y);

    const flapPoly = [
      rotate({ x: pivotX + tlLocalX, y: pivotY + topLocalY }, center, rad), // TL
      rotate({ x: pivotX + trLocalX, y: pivotY + topLocalY }, center, rad), // TR
      rotate({ x: pivotX + trLocalX, y: pivotY + botLocalY }, center, rad), // BR
      rotate({ x: pivotX + tlLocalX, y: pivotY + botLocalY }, center, rad), // BL
    ];

    // Build Rod Polygon (Rectangle)
    const rodStart = k.shaftStartGlobal;
    // Calculate Rod End based on direction to nut and fixed length
    const shaftDir = {
      x: (k.nutGlobal.x - rodStart.x) / k.distPivotToNut,
      y: (k.nutGlobal.y - rodStart.y) / k.distPivotToNut
    };
    const rodEnd = {
      x: rodStart.x + shaftDir.x * fixedShaftLength,
      y: rodStart.y + shaftDir.y * fixedShaftLength
    };

    // Construct Rod Box
    // Perpendicular vector for width
    const perp = { x: -shaftDir.y, y: shaftDir.x };
    const halfWidth = (DIMS.MOTOR.ROD_THICKNESS / 2) + 1; // +1 Safety Buffer

    const rodPoly = [
      { x: rodStart.x + perp.x * halfWidth, y: rodStart.y + perp.y * halfWidth },
      { x: rodStart.x - perp.x * halfWidth, y: rodStart.y - perp.y * halfWidth },
      { x: rodEnd.x - perp.x * halfWidth, y: rodEnd.y - perp.y * halfWidth },
      { x: rodEnd.x + perp.x * halfWidth, y: rodEnd.y + perp.y * halfWidth },
    ];

    return polygonsIntersect(flapPoly, rodPoly);
  };

  const maxAngle = useMemo(() => {
    if (checkCollision(0)) return 0;
    // Scan for collision
    for (let a = 0; a >= -160; a -= 0.5) {
      if (checkCollision(a)) {
        return a + 0.5; // Return last safe angle
      }
    }
    return -160;
  }, [flapHeight, motorSpacing, calculatedMountLength, fixedShaftLength]);

  // --- F. Current State Calculation ---
  const currentAngle = (actuatorExtension / 100) * maxAngle;
  const kCurrent = getKinematics(currentAngle);
  
  const kMax = getKinematics(maxAngle);
  const distAtMax = getDist(kMax.shaftStartGlobal, kMax.nutGlobal);
  const stopperPos = distAtMax - (DIMS.NUT.WIDTH / 2);

  const motorAngleDeg = kCurrent.motorAngleRad * 180 / Math.PI;
  const nutDistAlongAxis = getDist(kCurrent.shaftStartGlobal, kCurrent.nutGlobal);

  // Restore Layout
  const minFrameY = bottomMotorPivotY + 80;
  const screenBottomY = minFrameY + DIMS.FRAME.THICKNESS + DIMS.FRAME.CHANNEL_DEPTH;
  const bottomPanelTopY = pivotY - DIMS.MECH.PIVOT_OFFSET_Y;
  const bottomPanelHeight = (screenBottomY - DIMS.FRAME.THICKNESS) - bottomPanelTopY;

  return {
    dims: { 
      canvasHeight: screenBottomY + 40,
      screenX: DIMS.FRAME.ORIGIN_X + DIMS.FRAME.WIDTH,
      screenTopY: topFrameY,
      screenBottomY: screenBottomY,
      metalBracketX,
    },
    coords: {
      fixedInsulationX, flapX, pivotX, pivotY,
      bottomMotorPivotX, bottomMotorPivotY,
      bottomMotorPlateTopY: bottomMotorPivotY,
      overlapCenterY: (bottomPanelTopY + (pivotY - DIMS.MECH.FLAP_OFFSET_Y)) / 2, 
      topMountY: topMountLocalY, 
      mountLength: calculatedMountLength,
      nutGlobal: kCurrent.nutGlobal
    },
    shapes: {
      topPanel: { y: topFrameY + DIMS.FRAME.THICKNESS, h: topPanelHeight },
      bottomPanel: { y: bottomPanelTopY, h: bottomPanelHeight },
    },
    dynamic: {
      angleDeg: currentAngle,
      maxAngle: maxAngle,
      bottom: {
        motorAngleDeg: motorAngleDeg,
        shaftLength: fixedShaftLength,
        offset: -((DIMS.MOTOR.HINGE_THICKNESS / 2) + (DIMS.MOTOR.HEIGHT / 2)),
        nutDistAlongAxis: nutDistAlongAxis,
        stopperPos: stopperPos
      }
    }
  };
};

// ==========================================
// 3. Sub-Components
// ==========================================
const MotorAssembly: React.FC<{
  pivotX: number;
  pivotY: number;
  plateTopY: number;
  angleDeg: number;
  shaftLength: number;
  offset: number;
  fixedInsulationX: number;
  stopperPos: number;
}> = ({ pivotX, pivotY, plateTopY, angleDeg, shaftLength, offset, fixedInsulationX, stopperPos }) => {
  const leafLength = DIMS.MOTOR.HINGE_LEAF_LENGTH;
  const motorWidth = DIMS.MOTOR.WIDTH;
  const motorHeight = DIMS.MOTOR.HEIGHT;
  const hingeThick = DIMS.MOTOR.HINGE_THICKNESS;
  const motorY = -hingeThick / 2 - motorHeight; 
  const shaftY = offset; 
  const motorX = leafLength - motorWidth;
  const shaftStartX = motorX + motorWidth;

  return (
    <>
      <rect x={fixedInsulationX - hingeThick} y={plateTopY} width={hingeThick} height={DIMS.MOTOR.PLATE_HEIGHT} fill={STYLES.COLORS.METAL.FILL} stroke={STYLES.COLORS.METAL.STROKE} rx={1} />
      <g transform={`translate(${pivotX}, ${pivotY}) rotate(${angleDeg})`}>
         <rect x={0} y={-hingeThick/2} width={leafLength} height={hingeThick} fill={STYLES.COLORS.METAL.FILL} stroke={STYLES.COLORS.METAL.STROKE} rx={1} />
         <rect x={motorX} y={motorY} width={motorWidth} height={motorHeight} rx={4} fill={STYLES.COLORS.MOTOR} stroke={STYLES.COLORS.METAL.STROKE} />
         <text x={motorX + motorWidth/2} y={motorY + motorHeight/2 + 4} style={{fill: "#cbd5e1", fontSize: "10px", fontFamily: "sans-serif", fontWeight: 600, textAnchor: "middle", pointerEvents: "none", transformBox: "fill-box", transformOrigin: "center", transform: "rotate(180deg)"}}>Motor</text>
         <g transform={`translate(${shaftStartX}, ${shaftY})`}>
            <rect x={0} y={-DIMS.MOTOR.ROD_THICKNESS/2} width={shaftLength} height={DIMS.MOTOR.ROD_THICKNESS} fill={STYLES.COLORS.METAL.FILL} stroke={STYLES.COLORS.METAL.STROKE} rx={1} />
            <rect x={0} y={-DIMS.MOTOR.ROD_THICKNESS/2} width={shaftLength} height={DIMS.MOTOR.ROD_THICKNESS} fill="url(#threads)" />
            <rect x={shaftLength - 4} y={-5} width={5} height={10} fill={STYLES.COLORS.BRASS} stroke="#b45309" rx={1} />
            {stopperPos > 0 && stopperPos < shaftLength && (
              <rect x={stopperPos - 5} y={-6} width={5} height={12} fill={STYLES.COLORS.BRASS} stroke="#b45309" rx={1} />
            )}
         </g>
      </g>
      <circle cx={pivotX} cy={pivotY} r={DIMS.MOTOR.PIN_RADIUS} fill={STYLES.COLORS.BRASS} stroke="#b45309" />
    </>
  );
};

// ==========================================
// 4. Main Component
// ==========================================
export const SimulationCanvas: React.FC<{ config: SimulationConfig }> = ({ config }) => {
  const geo = useSimulationPhysics(config);
  const threadPatternOffset = geo.dynamic.bottom.nutDistAlongAxis; 
  
  const topFramePath = `
    M ${DIMS.FRAME.ORIGIN_X} ${geo.shapes.topPanel.y + DIMS.FRAME.CHANNEL_DEPTH} 
    L ${DIMS.FRAME.ORIGIN_X} ${DIMS.LAYOUT.TOP_MARGIN} 
    L ${geo.dims.screenX} ${DIMS.LAYOUT.TOP_MARGIN} 
    L ${geo.dims.screenX} ${geo.shapes.topPanel.y + DIMS.FRAME.CHANNEL_DEPTH} 
    L ${geo.dims.screenX - DIMS.FRAME.LIP} ${geo.shapes.topPanel.y + DIMS.FRAME.CHANNEL_DEPTH} 
    L ${geo.dims.screenX - DIMS.FRAME.LIP} ${geo.shapes.topPanel.y} 
    L ${DIMS.FRAME.ORIGIN_X + DIMS.FRAME.LIP} ${geo.shapes.topPanel.y} 
    L ${DIMS.FRAME.ORIGIN_X + DIMS.FRAME.LIP} ${geo.shapes.topPanel.y + DIMS.FRAME.CHANNEL_DEPTH} Z`;

  const botFrameTopY = geo.dims.screenBottomY - DIMS.FRAME.CHANNEL_DEPTH;
  const botFramePath = `
    M ${DIMS.FRAME.ORIGIN_X} ${botFrameTopY} 
    L ${DIMS.FRAME.ORIGIN_X} ${geo.dims.screenBottomY} 
    L ${geo.dims.screenX} ${geo.dims.screenBottomY} 
    L ${geo.dims.screenX} ${botFrameTopY} 
    L ${geo.dims.screenX - DIMS.FRAME.LIP} ${botFrameTopY} 
    L ${geo.dims.screenX - DIMS.FRAME.LIP} ${geo.dims.screenBottomY - DIMS.FRAME.THICKNESS} 
    L ${DIMS.FRAME.ORIGIN_X + DIMS.FRAME.LIP} ${geo.dims.screenBottomY - DIMS.FRAME.THICKNESS} 
    L ${DIMS.FRAME.ORIGIN_X + DIMS.FRAME.LIP} ${botFrameTopY} Z`;

  const sealRx = DIMS.SEAL.WIDTH / 2; // 6
  const sealRy = DIMS.SEAL.HEIGHT / 2; // 2
  const botBracketY_Unrotated = geo.coords.pivotY - DIMS.MECH.BRACKET_LENGTH + 5;
  const DARK_GREY_MOUNT = "#475569";
  
  // Calculate seal positions
  // Frame Seals: Top and Bottom limits of the insulation panel area.
  // This places them at the "inner horizontal surfaces" of the frame channels.
  const topFrameSealY = geo.shapes.topPanel.y;
  const botFrameSealY = geo.dims.screenBottomY - DIMS.FRAME.THICKNESS;

  // Top Interface Seal: Centered between Magnet bottom and Panel corner
  const magnetBottomY = geo.shapes.topPanel.y + geo.shapes.topPanel.h - 28; // -40 + 12
  const topPanelCornerY = geo.shapes.topPanel.y + geo.shapes.topPanel.h;
  // Centered in the 28px gap
  const topInterfaceSealY = (magnetBottomY + topPanelCornerY) / 2;

  return (
    <div className="w-full h-full relative flex justify-center bg-slate-50 overflow-hidden">
      <div className="absolute top-4 left-6 z-10">
        <h1 className="text-2xl font-bold text-slate-400 select-none font-mono tracking-tight">The Flappy v3</h1>
      </div>
      <div className="w-full flex justify-center bg-slate-50 overflow-x-auto">
        <svg viewBox={`0 0 ${DIMS.CANVAS.WIDTH} ${geo.dims.canvasHeight}`} className="h-auto" style={{ maxHeight: DIMS.CANVAS.MAX_HEIGHT, width: '100%', minWidth: '800px' }}>
          <defs>
            <pattern id="insulationPattern" width="10" height="10" patternUnits="userSpaceOnUse">
               <circle cx="2" cy="2" r="1" fill={STYLES.COLORS.INSULATION.STROKE} opacity="0.2" />
               <circle cx="7" cy="7" r="1" fill={STYLES.COLORS.INSULATION.STROKE} opacity="0.2" />
            </pattern>
             <pattern id="threads" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform={`translate(${threadPatternOffset} 0) rotate(15)`}>
              <line x1="0" y1="0" x2="0" y2="4" stroke={STYLES.COLORS.METAL.STROKE} strokeWidth="1" opacity="0.6" />
            </pattern>
          </defs>

          {/* --- Frame & Fixed Panels --- */}
          <path d={topFramePath} fill={STYLES.COLORS.VINYL.FILL} stroke={STYLES.COLORS.VINYL.STROKE} strokeWidth={STYLES.STROKE_WIDTH.DEFAULT} />
          <path d={botFramePath} fill={STYLES.COLORS.VINYL.FILL} stroke={STYLES.COLORS.VINYL.STROKE} strokeWidth={STYLES.STROKE_WIDTH.DEFAULT} />
          <line x1={geo.dims.screenX} y1={DIMS.LAYOUT.TOP_MARGIN} x2={geo.dims.screenX} y2={geo.dims.screenBottomY} stroke="black" strokeWidth="1" strokeDasharray="2,2" />

          <g transform={`translate(${geo.coords.fixedInsulationX}, 0)`}>
            <rect y={geo.shapes.topPanel.y} width={DIMS.INSULATION.THICKNESS} height={geo.shapes.topPanel.h} fill={STYLES.COLORS.INSULATION.FILL} stroke={STYLES.COLORS.INSULATION.STROKE} />
            <rect y={geo.shapes.topPanel.y} width={DIMS.INSULATION.THICKNESS} height={geo.shapes.topPanel.h} fill="url(#insulationPattern)" />
            
            <rect y={geo.shapes.bottomPanel.y} width={DIMS.INSULATION.THICKNESS} height={geo.shapes.bottomPanel.h} fill={STYLES.COLORS.INSULATION.FILL} stroke={STYLES.COLORS.INSULATION.STROKE} />
            <rect y={geo.shapes.bottomPanel.y} width={DIMS.INSULATION.THICKNESS} height={geo.shapes.bottomPanel.h} fill="url(#insulationPattern)" />
            
            {/* Frame Seals: Horizontal, At Inner Surfaces of Channels */}
            <ellipse cx={DIMS.INSULATION.THICKNESS/2} cy={topFrameSealY} rx={sealRx} ry={sealRy} fill={STYLES.COLORS.WASHER} />
            <ellipse cx={DIMS.INSULATION.THICKNESS/2} cy={botFrameSealY} rx={sealRx} ry={sealRy} fill={STYLES.COLORS.WASHER} />

            {/* Interface Seals: Vertical (rx < ry), on left face */}
            <ellipse cx={0} cy={topInterfaceSealY} rx={sealRy} ry={sealRx} fill={STYLES.COLORS.WASHER} />
            <ellipse cx={0} cy={geo.coords.overlapCenterY} rx={sealRy} ry={sealRx} fill={STYLES.COLORS.WASHER} />
          </g>

          <rect x={geo.coords.fixedInsulationX} y={geo.shapes.topPanel.y + geo.shapes.topPanel.h - 40} width={DIMS.MAGNET.WIDTH} height={DIMS.MAGNET.HEIGHT} fill={STYLES.COLORS.MAGNET} rx={1} />
          <rect x={geo.dims.metalBracketX - 5} y={geo.coords.pivotY - 10} width={(geo.coords.fixedInsulationX - geo.dims.metalBracketX) + 5} height={20} rx={2} fill={DARK_GREY_MOUNT} stroke={STYLES.COLORS.METAL.STROKE} />

          {/* --- Moving Flap --- */}
          <g transform={`rotate(${geo.dynamic.angleDeg}, ${geo.coords.pivotX}, ${geo.coords.pivotY})`}>
            <rect x={geo.coords.flapX} y={geo.coords.pivotY - (config.flapHeight + DIMS.MECH.FLAP_OFFSET_Y)} width={DIMS.INSULATION.THICKNESS} height={config.flapHeight} fill={STYLES.COLORS.INSULATION.FILL} stroke={STYLES.COLORS.INSULATION.STROKE} />
            <rect x={geo.coords.flapX} y={geo.coords.pivotY - (config.flapHeight + DIMS.MECH.FLAP_OFFSET_Y)} width={DIMS.INSULATION.THICKNESS} height={config.flapHeight} fill="url(#insulationPattern)" />
            <rect x={geo.coords.flapX + DIMS.INSULATION.THICKNESS - 4} y={geo.coords.pivotY + geo.coords.topMountY} width={4} height={12} fill={STYLES.COLORS.WASHER} rx={0.5} />
            <rect x={geo.coords.flapX - geo.coords.mountLength} y={geo.coords.pivotY + geo.coords.topMountY} width={geo.coords.mountLength} height={20} fill={DARK_GREY_MOUNT} stroke={STYLES.COLORS.METAL.STROKE} rx={1} />
            <rect x={geo.dims.metalBracketX} y={botBracketY_Unrotated} width={DIMS.MECH.BRACKET_WIDTH} height={DIMS.MECH.BRACKET_LENGTH} fill={STYLES.COLORS.METAL.FILL} stroke={STYLES.COLORS.METAL.STROKE} rx={1} />
            {DIMS.INSULATION.SCREW_HOLE_SPACING.map(dy => <circle key={dy} cx={geo.dims.metalBracketX + DIMS.MECH.BRACKET_WIDTH/2} cy={geo.coords.pivotY - dy} r={DIMS.MECH.CONNECTION_DOT_RADIUS - 0.5} fill={STYLES.COLORS.METAL.HOLE} />)}
            
          </g>
          <circle cx={geo.coords.pivotX} cy={geo.coords.pivotY} r={4} fill={STYLES.COLORS.BRASS} stroke="#b45309" />

          {/* --- Motor & Nut --- */}
          <MotorAssembly 
            pivotX={geo.coords.bottomMotorPivotX} 
            pivotY={geo.coords.bottomMotorPivotY} 
            plateTopY={geo.coords.bottomMotorPlateTopY}
            fixedInsulationX={geo.coords.fixedInsulationX}
            angleDeg={geo.dynamic.bottom.motorAngleDeg}
            shaftLength={geo.dynamic.bottom.shaftLength}
            offset={geo.dynamic.bottom.offset}
            stopperPos={geo.dynamic.bottom.stopperPos}
          />

          <g transform={`translate(${geo.coords.nutGlobal.x}, ${geo.coords.nutGlobal.y}) rotate(${geo.dynamic.bottom.motorAngleDeg})`}>
            <rect x={-6} y={-10} width={12} height={20} rx={2} fill={STYLES.COLORS.BRASS} stroke="#b45309" />
             <circle cx={0} cy={0} r={3} fill="#78350f" />
          </g>

        </svg>
      </div>
    </div>
  );
};