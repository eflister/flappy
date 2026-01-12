import React, { useMemo } from 'react';
import { SimulationConfig, Point } from '../types';
import { DIMS, STYLES, SIM_LIMITS } from '../constants';

// ==========================================
// 1. Math Helpers (Physics & Collision)
// ==========================================

/**
 * Rotates a point around a center by a given angle (radians).
 */
const rotate = (p: Point, center: Point, rad: number): Point => ({
  x: Math.cos(rad) * (p.x - center.x) - Math.sin(rad) * (p.y - center.y) + center.x,
  y: Math.sin(rad) * (p.x - center.x) + Math.cos(rad) * (p.y - center.y) + center.y,
});

/**
 * Separating Axis Theorem (SAT) for Convex Polygon Intersection.
 * Used to detect if the Flap collides with the Motor Rod/Leaf.
 */
const polygonsIntersect = (polyA: Point[], polyB: Point[]): boolean => {
  const polys = [polyA, polyB];
  for (let i = 0; i < polys.length; i++) {
    const poly = polys[i];
    for (let j = 0; j < poly.length; j++) {
      const p1 = poly[j];
      const p2 = poly[(j + 1) % poly.length];
      const normal = { x: -(p2.y - p1.y), y: p2.x - p1.x }; // Edge normal
      
      let minA = Infinity, maxA = -Infinity;
      for (const p of polyA) {
        const proj = (p.x * normal.x + p.y * normal.y);
        minA = Math.min(minA, proj);
        maxA = Math.max(maxA, proj);
      }
      let minB = Infinity, maxB = -Infinity;
      for (const p of polyB) {
        const proj = (p.x * normal.x + p.y * normal.y);
        minB = Math.min(minB, proj);
        maxB = Math.max(maxB, proj);
      }
      // If we find a gap on any axis, they do not intersect.
      if (maxA < minB || maxB < minA) return false; 
    }
  }
  return true;
};

// ==========================================
// 2. Physics Engine Hook
// ==========================================
const useSimulationPhysics = (config: SimulationConfig) => {
  const { flapHeight, topPanelHeight, actuatorExtension } = config;

  // --- A. Fundamental World Coordinates ---
  // Everything is derived from the Frame Origin (Top Right)
  
  // Y-Axis Anchors
  const topFrameY = DIMS.LAYOUT.TOP_MARGIN;
  const topPanelEndY = topFrameY + DIMS.FRAME.THICKNESS + topPanelHeight;
  
  // Pivot Calculation:
  // The flap overlaps the top panel by OVERLAP_REGION when closed.
  // Flap Top (Closed) = Top Panel End - Overlap
  const flapTopY_Closed = topPanelEndY - DIMS.MECH.OVERLAP_REGION;
  const flapBottomY_Closed = flapTopY_Closed + flapHeight;
  
  // Pivot is located FLAP_OFFSET_Y up from the bottom of the flap
  const pivotY = flapBottomY_Closed + DIMS.MECH.FLAP_OFFSET_Y;
  
  // Bottom Panel Calculation:
  // Bottom panel top is PIVOT_OFFSET_Y down from the pivot (Wait, Pivot is offset FROM panel top)
  // Let's stick to the visual logic: Pivot is anchored to bottom panel.
  // Pivot is PIVOT_OFFSET_Y below the Top of the Bottom Panel.
  const bottomPanelTopY = pivotY - DIMS.MECH.PIVOT_OFFSET_Y;
  const bottomPanelBottomY = bottomPanelTopY + DIMS.LAYOUT.BOTTOM_PANEL_HEIGHT;
  const sillY = bottomPanelBottomY + DIMS.FRAME.THICKNESS;

  // X-Axis Anchors
  const channelCenterX = DIMS.FRAME.ORIGIN_X + (DIMS.FRAME.WIDTH / 2);
  const fixedInsulationX = channelCenterX - (DIMS.INSULATION.THICKNESS / 2);
  const flapX = fixedInsulationX - DIMS.INSULATION.THICKNESS;
  
  // Metal Bracket positions
  const metalBracketX = flapX - DIMS.MECH.BRACKET_WIDTH;
  const pivotX = metalBracketX + (DIMS.MECH.BRACKET_WIDTH / 2);
  
  // Motor Mount Positions
  const motorPivotX = fixedInsulationX - (DIMS.MOTOR.HINGE_THICKNESS / 2);
  const motorPivotY = topFrameY + DIMS.FRAME.THICKNESS + DIMS.MOTOR.TOP_CLEARANCE + DIMS.MOTOR.PLATE_HEIGHT;

  // --- B. Shape Definitions (Local Coordinate Systems) ---
  
  // 1. Motor Hinge Leaf (Relative to MotorPivot)
  const leafLocalPoly: Point[] = [
    { x: 0, y: -DIMS.MOTOR.HINGE_THICKNESS/2 },
    { x: 0, y: DIMS.MOTOR.HINGE_THICKNESS/2 },
    { x: -DIMS.MOTOR.HINGE_LEAF_LENGTH, y: DIMS.MOTOR.HINGE_THICKNESS/2 },
    { x: -DIMS.MOTOR.HINGE_LEAF_LENGTH, y: -DIMS.MOTOR.HINGE_THICKNESS/2 }
  ];

  // 2. Flap Polygon (Relative to Main Pivot)
  // Flap Top relative to Pivot
  const flapTopLocalY = -(DIMS.MECH.FLAP_OFFSET_Y + flapHeight);
  const flapLocalPoly: Point[] = [
    { x: flapX - pivotX, y: flapTopLocalY }, // Top Left
    { x: flapX - pivotX + DIMS.INSULATION.THICKNESS, y: flapTopLocalY }, // Top Right
    { x: flapX - pivotX + DIMS.INSULATION.THICKNESS, y: flapTopLocalY + 50 }, // Bottom Right (Collision approx)
    { x: flapX - pivotX, y: flapTopLocalY + 50 } // Bottom Left
  ];

  // 3. Slide Mechanism Geometry (Relative to Flap Group)
  // The slide bracket is offset from the pivot by OFFSET_X
  const slideBracketLocalX = (flapX - DIMS.SLIDE.OFFSET_X) - pivotX;
  const slideTopMountLocalY = flapTopLocalY + DIMS.SLIDE.TOP_MARGIN; // Where the slide bracket starts

  // 4. Rod Geometry (Relative to Motor Group)
  const rodOffset = DIMS.MOTOR.HEIGHT/2 + DIMS.MOTOR.HINGE_THICKNESS/2;
  const rodVisualStartLocalX = -DIMS.MOTOR.HINGE_LEAF_LENGTH + 10; // Visual start point of the rod at housing

  // --- C. Kinematic Solver ---
  /**
   * Calculates the state of the mechanism for a given flap angle.
   * Solves the intersection of the rotating Motor Rod and the rotating Slide Line.
   */
  const solveAtAngle = (angleDeg: number) => {
    const rad = angleDeg * Math.PI / 180;
    // For this 2D simplification, we assume motor angle approx equals flap angle for the housing rotation 
    // (This is a simplification of the linkage, assuming the motor pivots to track the nut)
    const motorRad = rad; 
    
    // 1. Transform Anchors to World Space
    const pivot = { x: pivotX, y: pivotY };
    const motorPivot = { x: motorPivotX, y: motorPivotY };
    
    // 2. Calculate Rod Origin in World Space (The point where rod exits motor)
    const pLocal = { x: rodVisualStartLocalX, y: -rodOffset };
    const pRot = rotate({ x: motorPivotX + pLocal.x, y: motorPivotY + pLocal.y }, motorPivot, motorRad);
    const rodOrigin = pRot;
    const rodDir = { x: -Math.cos(motorRad), y: -Math.sin(motorRad) }; // Rod extends leftwards relative to motor
    
    // 3. Calculate Slide Line in World Space
    // The slide defines a line along which the nut travels.
    const slidePointLocal = { x: slideBracketLocalX, y: slideTopMountLocalY };
    const slidePointWorld = rotate({ x: pivotX + slidePointLocal.x, y: pivotY + slidePointLocal.y }, pivot, rad);
    const slideDir = { x: -Math.sin(rad), y: Math.cos(rad) }; // Perpendicular to radius

    // 4. Intersection Solver (Line-Line Intersection)
    // R(t) = rodOrigin + t * rodDir
    // S(u) = slidePointWorld + u * slideDir
    // Solve for scalars t (rod extension) and u (slide position)
    const det = slideDir.x * (-rodDir.y) - slideDir.y * (-rodDir.x);
    let valid = Math.abs(det) > 0.0001;
    let t = 0, u = 0;
    
    if (valid) {
      const dx = rodOrigin.x - slidePointWorld.x;
      const dy = rodOrigin.y - slidePointWorld.y;
      u = (dx * (-rodDir.y) - dy * (-rodDir.x)) / det; // Distance along slide track
      t = (slideDir.x * dy - slideDir.y * dx) / det;   // Distance along rod (visible length)
    }
    
    // Calculate World Position of the Nut
    const nutPos = {
      x: rodOrigin.x + t * rodDir.x,
      y: rodOrigin.y + t * rodDir.y
    };

    // Calculate Polygons for collision detection
    const flapPolyWorld = flapLocalPoly.map(p => rotate({ x: pivotX + p.x, y: pivotY + p.y }, pivot, rad));
    const leafPolyWorld = leafLocalPoly.map(p => rotate({ x: motorPivotX + p.x, y: motorPivotY + p.y }, motorPivot, rad));

    return { rad, flapPolyWorld, leafPolyWorld, rodOrigin, nutPos, t, u, valid };
  };

  // --- D. Collision & Constraint Scanner ---
  // Iterates angles to find the maximum opening angle before collision
  const maxSafeAngle = useMemo(() => {
    // Check every 0.5 degrees from 0 to -85 (opening)
    for (let ang = 0; ang >= -85; ang -= 0.5) {
      const state = solveAtAngle(ang);
      
      // 1. Polygon Intersection (Flap vs Motor Arm)
      if (polygonsIntersect(state.flapPolyWorld, state.leafPolyWorld)) return ang + 0.5;

      // 2. Fixed Frame Collision (Flap vs Insulation Stack)
      const tl = state.flapPolyWorld[0];
      if (tl.x > fixedInsulationX - DIMS.MOTOR.HINGE_THICKNESS) return ang + 0.5;

      // 3. Rod Collision (Nut passing through rod origin)
      const rodVec = { x: state.nutPos.x - state.rodOrigin.x, y: state.nutPos.y - state.rodOrigin.y };
      const pointVec = { x: tl.x - state.rodOrigin.x, y: tl.y - state.rodOrigin.y };
      const cross = rodVec.x * pointVec.y - rodVec.y * pointVec.x;
      if (cross > -10) return ang + 0.5; // Safety buffer
    }
    return -85;
  }, [flapHeight, topPanelHeight]);

  // --- E. Derived System Constraints ---
  
  // 1. Calculate Fixed Rod Length
  // Requirement: At MAX safe angle, the nut should be exactly at the end of the rod.
  // We add a small buffer (Nut Width/2 + Stopper Width/2) approx 15px.
  const maxState = solveAtAngle(maxSafeAngle);
  const fixedRodLength = maxState.t + 15;

  // 2. Calculate Fixed Inner Rail Length
  // Requirement: When CLOSED (angle 0), the bottom of the inner rail must align with the bottom mount.
  // Logic: 
  //   - Nut Position (u) varies.
  //   - Rail Top = Nut Position (u) - Extension.
  //   - Rail Bottom = Rail Top + Length.
  //   - We want Rail Bottom at Angle 0 to match a specific Design Target (e.g., Mount Height).
  //   Let's define the constraint: The rail must cover the bottom mounting point when closed.
  //   Bottom Mount Y (Local) = slideTopMountLocalY + (Mount Y Delta) -> This is messy.
  //   Simpler Logic from previous iteration:
  //   fixedInnerRailLen = BracketHeight + Extension - (u_at_0).
  //   This ensures that at u=0 (approx), the rail fills the gap.
  const minState = solveAtAngle(0);
  const zeroU = minState.valid ? minState.u : 0;
  // Constraint: length + (u - extension) = 20 (Mount Height)
  const fixedInnerRailLen = DIMS.MECH.MOUNT_HEIGHT + DIMS.SLIDE.RAIL_NUT_EXTENSION - zeroU;

  // --- F. Current Frame State ---
  const currentAngle = (actuatorExtension / 100) * maxSafeAngle;
  const current = solveAtAngle(currentAngle);

  // Return all necessary render data
  return {
    dims: { 
      canvasHeight: sillY + 40,
      screenX: DIMS.FRAME.ORIGIN_X + DIMS.FRAME.WIDTH,
      screenTopY: topFrameY,
      screenBottomY: sillY,
      metalBracketX,
    },
    coords: {
      fixedInsulationX, flapX, pivotX, pivotY,
      motorPivotX, motorPivotY,
      motorPlateTopY: motorPivotY - DIMS.MOTOR.PLATE_HEIGHT,
      overlapCenterY: (bottomPanelTopY + (pivotY - DIMS.MECH.FLAP_OFFSET_Y)) / 2
    },
    shapes: {
      topPanel: { y: topFrameY + DIMS.FRAME.THICKNESS, h: topPanelHeight },
      bottomPanel: { y: bottomPanelTopY, h: DIMS.LAYOUT.BOTTOM_PANEL_HEIGHT },
    },
    dynamic: {
      angleDeg: currentAngle,
      motorAngleDeg: currentAngle,
      rodLength: fixedRodLength,
      nutTraveled: current.t, 
      nutPos: current.nutPos,
      slide: {
        // Calculate total housing length to cover top and bottom brackets
        housingLen: Math.abs(DIMS.MECH.BRACKET_LENGTH + DIMS.SLIDE.BOTTOM_MARGIN + slideTopMountLocalY) + DIMS.MECH.MOUNT_HEIGHT,
        innerLen: fixedInnerRailLen,
        nutU: current.u,
        localX: slideBracketLocalX - DIMS.SLIDE.HOUSING_WIDTH/2,
        localTopY: slideTopMountLocalY,
        bottomMountYLocal: - (DIMS.MECH.BRACKET_LENGTH + DIMS.SLIDE.BOTTOM_MARGIN)
      }
    }
  };
};

// ==========================================
// 3. Component Rendering
// ==========================================
interface Props {
  config: SimulationConfig;
}

export const SimulationCanvas: React.FC<Props> = ({ config }) => {
  const geo = useSimulationPhysics(config);
  
  // -- Static Definitions --
  const threadPatternOffset = -geo.dynamic.nutTraveled;
  
  // -- SVG Paths --
  // Top vinyl frame profile
  const topFramePath = `
    M ${DIMS.FRAME.ORIGIN_X} ${geo.shapes.topPanel.y + DIMS.FRAME.CHANNEL_DEPTH} 
    L ${DIMS.FRAME.ORIGIN_X} ${DIMS.LAYOUT.TOP_MARGIN} 
    L ${geo.dims.screenX} ${DIMS.LAYOUT.TOP_MARGIN} 
    L ${geo.dims.screenX} ${geo.shapes.topPanel.y + DIMS.FRAME.CHANNEL_DEPTH} 
    L ${geo.dims.screenX - DIMS.FRAME.LIP} ${geo.shapes.topPanel.y + DIMS.FRAME.CHANNEL_DEPTH} 
    L ${geo.dims.screenX - DIMS.FRAME.LIP} ${geo.shapes.topPanel.y} 
    L ${DIMS.FRAME.ORIGIN_X + DIMS.FRAME.LIP} ${geo.shapes.topPanel.y} 
    L ${DIMS.FRAME.ORIGIN_X + DIMS.FRAME.LIP} ${geo.shapes.topPanel.y + DIMS.FRAME.CHANNEL_DEPTH} Z`;

  // Bottom vinyl frame profile
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

  // Seal Dimensions
  const sealRx = DIMS.SEAL.WIDTH / 2;
  const sealRy = DIMS.SEAL.HEIGHT / 2;

  return (
    <div className="w-full h-full relative flex justify-center bg-slate-50 overflow-hidden">
      <h1 className="absolute top-4 left-6 text-2xl font-bold text-slate-400 select-none z-10 font-mono tracking-tight">The Flappy v2</h1>
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
             <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="2" dy="2" stdDeviation="2" floodOpacity="0.2"/></filter>
            <linearGradient id="chrome" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#94a3b8"/><stop offset="0.5" stopColor="#f1f5f9"/><stop offset="1" stopColor="#94a3b8"/></linearGradient>
          </defs>

          {/* --- 1. Static Frame --- */}
          <path d={topFramePath} fill={STYLES.COLORS.VINYL.FILL} stroke={STYLES.COLORS.VINYL.STROKE} strokeWidth={STYLES.STROKE_WIDTH.DEFAULT} />
          <path d={botFramePath} fill={STYLES.COLORS.VINYL.FILL} stroke={STYLES.COLORS.VINYL.STROKE} strokeWidth={STYLES.STROKE_WIDTH.DEFAULT} />
          {/* Screen Line */}
          <line x1={geo.dims.screenX} y1={DIMS.LAYOUT.TOP_MARGIN} x2={geo.dims.screenX} y2={geo.dims.screenBottomY} stroke="black" strokeWidth="1" strokeDasharray="2,2" />

          {/* --- 2. Fixed Panels & Seals --- */}
          <g transform={`translate(${geo.coords.fixedInsulationX}, 0)`}>
            {/* Top Panel */}
            <rect y={geo.shapes.topPanel.y} width={DIMS.INSULATION.THICKNESS} height={geo.shapes.topPanel.h} fill={STYLES.COLORS.INSULATION.FILL} stroke={STYLES.COLORS.INSULATION.STROKE} />
            <rect y={geo.shapes.topPanel.y} width={DIMS.INSULATION.THICKNESS} height={geo.shapes.topPanel.h} fill="url(#insulationPattern)" />
            
            {/* Bottom Panel */}
            <rect y={geo.shapes.bottomPanel.y} width={DIMS.INSULATION.THICKNESS} height={geo.shapes.bottomPanel.h} fill={STYLES.COLORS.INSULATION.FILL} stroke={STYLES.COLORS.INSULATION.STROKE} />
            <rect y={geo.shapes.bottomPanel.y} width={DIMS.INSULATION.THICKNESS} height={geo.shapes.bottomPanel.h} fill="url(#insulationPattern)" />
            
            <text x={10} y={geo.shapes.bottomPanel.y + 60} style={{fill: STYLES.COLORS.INSULATION.TEXT, fontSize: "12px", fontFamily: "sans-serif", fontWeight: 600, writingMode: "vertical-rl", textAnchor: "middle", pointerEvents: "none"}}>Insulation</text>
            
            {/* Seals */}
            {/* Top of Top Panel */}
            <ellipse cx={DIMS.INSULATION.THICKNESS/2} cy={geo.shapes.topPanel.y} rx={sealRx} ry={sealRy} fill={STYLES.COLORS.WASHER} />
            {/* Bottom of Top Panel */}
            <ellipse cx={0} cy={geo.shapes.topPanel.y + geo.shapes.topPanel.h - 12} rx={sealRy} ry={sealRx} fill={STYLES.COLORS.WASHER} />
            {/* Top of Bottom Panel (Centered in Overlap) */}
            <ellipse cx={0} cy={geo.coords.overlapCenterY} rx={sealRy} ry={sealRx} fill={STYLES.COLORS.WASHER} />
            {/* Bottom of Bottom Panel */}
            <ellipse cx={DIMS.INSULATION.THICKNESS/2} cy={geo.shapes.bottomPanel.y + geo.shapes.bottomPanel.h} rx={sealRx} ry={sealRy} fill={STYLES.COLORS.WASHER} />
          </g>

          {/* Magnet */}
          <rect x={geo.coords.fixedInsulationX} y={geo.shapes.topPanel.y + geo.shapes.topPanel.h - 40} width={DIMS.MAGNET.WIDTH} height={DIMS.MAGNET.HEIGHT} fill={STYLES.COLORS.MAGNET} rx={1} />

          {/* Pivot Bracket (Fixed Part) */}
          <rect x={geo.dims.metalBracketX - 5} y={geo.coords.pivotY - 10} width={geo.coords.fixedInsulationX - geo.dims.metalBracketX + 5} height={20} rx={2} fill={STYLES.COLORS.BRACKET} stroke={STYLES.COLORS.METAL.STROKE} />

          {/* --- 3. Moving Flap Group --- */}
          <g transform={`rotate(${geo.dynamic.angleDeg}, ${geo.coords.pivotX}, ${geo.coords.pivotY})`}>
            
            {/* 3a. Mechanism Slide Mounts (Top & Bottom Brackets on Flap) */}
            <rect x={geo.coords.pivotX + geo.dynamic.slide.localX + DIMS.SLIDE.HOUSING_WIDTH/2} y={geo.coords.pivotY + geo.dynamic.slide.localTopY} width={DIMS.SLIDE.OFFSET_X} height={DIMS.MECH.MOUNT_HEIGHT} fill={STYLES.COLORS.BRACKET} stroke={STYLES.COLORS.METAL.STROKE} />
            <rect x={geo.coords.pivotX + geo.dynamic.slide.localX + DIMS.SLIDE.HOUSING_WIDTH/2} y={geo.coords.pivotY + geo.dynamic.slide.bottomMountYLocal} width={DIMS.SLIDE.OFFSET_X} height={DIMS.MECH.MOUNT_HEIGHT} fill={STYLES.COLORS.BRACKET} stroke={STYLES.COLORS.METAL.STROKE} />

            {/* 3b. Outer Slide Housing */}
            <rect x={geo.coords.pivotX + geo.dynamic.slide.localX} y={geo.coords.pivotY + geo.dynamic.slide.localTopY} width={DIMS.SLIDE.HOUSING_WIDTH} height={geo.dynamic.slide.housingLen} fill="url(#chrome)" stroke={STYLES.COLORS.SLIDE_STROKE} rx={1} />
            
            {/* 3c. Mechanical Connection Dot (Drawn BEFORE inner rail to allow occlusion) */}
            {/* This represents the fixed pivot point at the bottom mount */}
            <circle 
              cx={geo.coords.pivotX + geo.dynamic.slide.localX + DIMS.SLIDE.HOUSING_WIDTH/2} 
              cy={geo.coords.pivotY + geo.dynamic.slide.bottomMountYLocal + DIMS.MECH.MOUNT_HEIGHT/2} 
              r={DIMS.MECH.CONNECTION_DOT_RADIUS} 
              fill="black" opacity={0.8} 
            />

            {/* 3d. Inner Rail (Moves with Nut) */}
            {/* Starts slightly above nut (extension) and extends down by fixed length */}
            <rect 
              x={geo.coords.pivotX + geo.dynamic.slide.localX + (DIMS.SLIDE.HOUSING_WIDTH - DIMS.SLIDE.INNER_WIDTH)/2} 
              y={geo.coords.pivotY + geo.dynamic.slide.localTopY + geo.dynamic.slide.nutU - DIMS.SLIDE.RAIL_NUT_EXTENSION} 
              width={DIMS.SLIDE.INNER_WIDTH} 
              height={geo.dynamic.slide.innerLen} 
              fill="url(#chrome)" stroke={STYLES.COLORS.SLIDE_STROKE} rx={1} 
            />

            {/* 3e. Flap Insulation Body */}
            <rect x={geo.coords.flapX} y={geo.coords.pivotY - (config.flapHeight + DIMS.MECH.FLAP_OFFSET_Y)} width={DIMS.INSULATION.THICKNESS} height={config.flapHeight} fill={STYLES.COLORS.INSULATION.FILL} stroke={STYLES.COLORS.INSULATION.STROKE} filter="url(#shadow)" />
            <rect x={geo.coords.flapX} y={geo.coords.pivotY - (config.flapHeight + DIMS.MECH.FLAP_OFFSET_Y)} width={DIMS.INSULATION.THICKNESS} height={config.flapHeight} fill="url(#insulationPattern)" />
            
            {/* Washer for Magnet (Using SLIDE.TOP_MARGIN to ensure alignment with top mount) */}
            <rect 
              x={geo.coords.flapX + DIMS.INSULATION.THICKNESS - 4} 
              y={geo.coords.pivotY - (config.flapHeight + DIMS.MECH.FLAP_OFFSET_Y) + DIMS.SLIDE.TOP_MARGIN} 
              width={4} 
              height={12} 
              fill={STYLES.COLORS.WASHER} 
              rx={0.5} 
            />

            {/* Hinge Bracket on Flap */}
            <rect x={geo.dims.metalBracketX} y={geo.coords.pivotY - DIMS.MECH.BRACKET_LENGTH + 5} width={DIMS.MECH.BRACKET_WIDTH} height={DIMS.MECH.BRACKET_LENGTH} fill={STYLES.COLORS.METAL.FILL} stroke={STYLES.COLORS.METAL.STROKE} rx={1} />
            {DIMS.INSULATION.SCREW_HOLE_SPACING.map(dy => <circle key={dy} cx={geo.dims.metalBracketX + DIMS.MECH.BRACKET_WIDTH/2} cy={geo.coords.pivotY - dy} r={DIMS.MECH.CONNECTION_DOT_RADIUS - 0.5} fill={STYLES.COLORS.METAL.HOLE} />)}
          </g>
          
          {/* Main Pivot Pin */}
          <circle cx={geo.coords.pivotX} cy={geo.coords.pivotY} r={4} fill={STYLES.COLORS.BRASS} stroke="#b45309" />

          {/* --- 4. Motor Group --- */}
          {/* Motor Mount Plate */}
          <rect x={geo.coords.fixedInsulationX - DIMS.MOTOR.HINGE_THICKNESS} y={geo.coords.motorPlateTopY} width={DIMS.MOTOR.HINGE_THICKNESS} height={DIMS.MOTOR.PLATE_HEIGHT} fill={STYLES.COLORS.METAL.FILL} stroke={STYLES.COLORS.METAL.STROKE} rx={1} />
          
          <g transform={`translate(${geo.coords.motorPivotX}, ${geo.coords.motorPivotY}) rotate(${geo.dynamic.motorAngleDeg})`}>
             {/* Hinge Leaf */}
             <rect x={-DIMS.MOTOR.HINGE_LEAF_LENGTH} y={-DIMS.MOTOR.HINGE_THICKNESS/2} width={DIMS.MOTOR.HINGE_LEAF_LENGTH} height={DIMS.MOTOR.HINGE_THICKNESS} fill={STYLES.COLORS.METAL.FILL} stroke={STYLES.COLORS.METAL.STROKE} rx={1} />
             {/* Motor Body */}
             <rect x={-DIMS.MOTOR.HINGE_LEAF_LENGTH + 10} y={-DIMS.MOTOR.HEIGHT - DIMS.MOTOR.HINGE_THICKNESS/2} width={DIMS.MOTOR.WIDTH} height={DIMS.MOTOR.HEIGHT} rx={4} fill={STYLES.COLORS.MOTOR} stroke={STYLES.COLORS.METAL.STROKE} />
             <text x={-DIMS.MOTOR.HINGE_LEAF_LENGTH + 10 + DIMS.MOTOR.WIDTH/2} y={-DIMS.MOTOR.HEIGHT/2 - DIMS.MOTOR.HINGE_THICKNESS/2 + 4} style={{fill: "#cbd5e1", fontSize: "10px", fontFamily: "sans-serif", fontWeight: 600, textAnchor: "middle", pointerEvents: "none"}}>Motor</text>
             
             {/* Threaded Rod */}
             {/* Drawn starting from the housing exit (visual start X) extending leftwards by calculated length */}
             <rect x={(-DIMS.MOTOR.HINGE_LEAF_LENGTH + 10) - geo.dynamic.rodLength} y={-(DIMS.MOTOR.HEIGHT/2 + DIMS.MOTOR.HINGE_THICKNESS/2 + 4)} width={geo.dynamic.rodLength} height={DIMS.MOTOR.ROD_THICKNESS} fill={STYLES.COLORS.METAL.FILL} stroke={STYLES.COLORS.METAL.STROKE} />
             <rect x={(-DIMS.MOTOR.HINGE_LEAF_LENGTH + 10) - geo.dynamic.rodLength} y={-(DIMS.MOTOR.HEIGHT/2 + DIMS.MOTOR.HINGE_THICKNESS/2 + 4)} width={geo.dynamic.rodLength} height={DIMS.MOTOR.ROD_THICKNESS} fill="url(#threads)" />
             {/* Stopper Cap */}
             <rect x={(-DIMS.MOTOR.HINGE_LEAF_LENGTH + 10) - geo.dynamic.rodLength - (DIMS.MOTOR.STOPPER_SIZE/2)} y={-(DIMS.MOTOR.HEIGHT/2 + DIMS.MOTOR.HINGE_THICKNESS/2 + (DIMS.MOTOR.STOPPER_SIZE/2))} width={DIMS.MOTOR.STOPPER_SIZE} height={DIMS.MOTOR.STOPPER_SIZE} rx={2} fill={STYLES.COLORS.BRASS} stroke="#b45309" />
          </g>

          {/* Nut (Positioned by Solver) */}
          <g transform={`translate(${geo.dynamic.nutPos.x}, ${geo.dynamic.nutPos.y}) rotate(${geo.dynamic.motorAngleDeg + 90})`}>
            <rect x={-DIMS.NUT.WIDTH/2} y={-DIMS.NUT.HEIGHT/2} width={DIMS.NUT.WIDTH} height={DIMS.NUT.HEIGHT} fill={STYLES.COLORS.BRASS} stroke="#b45309" rx={1} />
          </g>

          {/* Motor Pivot Pin */}
          <circle cx={geo.coords.motorPivotX} cy={geo.coords.motorPivotY} r={DIMS.MOTOR.PIN_RADIUS} fill={STYLES.COLORS.BRASS} stroke="#b45309" />
        </svg>
      </div>
    </div>
  );
};