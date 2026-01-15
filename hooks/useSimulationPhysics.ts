
/**
 * HOOKS/USESIMULATIONPHYSICS.TS
 * 
 * The Brain of the application.
 * 
 * Responsibilities:
 * 1. Calculate static geometry based on config (Gap Height).
 * 2. Solve kinematics (Intersection of Linkage Circles).
 * 3. Perform collision detection (Bar vs Shaft) to find Max Open Angle.
 * 4. Return a complete 'SystemState' object for the renderer.
 */

import { useMemo } from 'react';
import { SimulationConfig, SystemState } from '../types';
import { DIMENSIONS, CONSTRAINTS } from '../constants';
import { getDistance } from '../utils/geometry';

export const useSimulationPhysics = (config: SimulationConfig): SystemState => {
  const { gapHeight, actuatorExtension, motorSpacing } = config;
  const { FRAME, INSULATION, MECHANICS, MOTOR, LAYOUT, HARDWARE } = DIMENSIONS;

  // =========================================================================
  // 1. Static Geometry Calculation (Top-Down Dependency Chain)
  // =========================================================================
  const staticGeo = useMemo(() => {
    // --- Vertical Layout (Y) ---
    const screenTopY = LAYOUT.TOP_MARGIN;
    
    // 1. Top Panel (Fixed)
    // "flush to the inner surface of the vinyl frame"
    const topPanelTopY = screenTopY + FRAME.THICKNESS;
    const topPanelBottomY = topPanelTopY + LAYOUT.TOP_PANEL_H;
    
    // 2. Bottom Panel (Fixed) - Determined by GAP HEIGHT
    const botPanelTopY = topPanelBottomY + gapHeight;
    
    // 3. Flap Geometry (Derived from Gap + Overlaps + Headroom)
    // Flap top is higher than the overlap start to hold the striker
    const flapTopY_Closed = topPanelBottomY - MECHANICS.OVERLAP_TOP - MECHANICS.FLAP_HEADROOM;
    const flapBottomY_Closed = botPanelTopY + MECHANICS.OVERLAP_BOTTOM;
    const flapHeight = flapBottomY_Closed - flapTopY_Closed;

    // 4. Pivot Position (Offset below the flap bottom edge)
    const pivotY = flapBottomY_Closed + MECHANICS.PIVOT_OFFSET_Y;

    // 5. Motor Position (Fixed relative to Pivot)
    const motorCenterY = pivotY + MOTOR.DIST_BELOW_PIVOT;

    // --- Horizontal Layout (X) ---
    // Start from Frame Right Edge (Exterior)
    const screenRightX = LAYOUT.ORIGIN_X + FRAME.WIDTH;
    const frameCenterX = LAYOUT.ORIGIN_X + (FRAME.WIDTH / 2);
    
    // Fixed Insulation is Centered in Frame
    const fixedInsulationRightX = frameCenterX + (INSULATION.THICKNESS / 2);
    const fixedInsulationLeftX  = frameCenterX - (INSULATION.THICKNESS / 2);
    const insulationX = fixedInsulationLeftX; 

    // Stack Order (Right to Left): 
    // FixedPanel -> Seal -> Flap -> Bar -> Pivot -> Motor
    
    // Flap Closed Position
    // REQUIREMENT: "when the flap is closed it should be flush against the back panel"
    // So the right face of the flap is at fixedInsulationLeftX.
    const flapRightX_Closed = fixedInsulationLeftX;
    
    // Flap Left Face
    const flapLeftX_Closed = flapRightX_Closed - INSULATION.THICKNESS;
    
    // Bar is Flush with Flap Left Face
    const barRightX = flapLeftX_Closed;
    const barLeftX = barRightX - MECHANICS.BAR_WIDTH;
    
    // Pivot is Center of Bar (or pin goes through it)
    const pivotX = barLeftX + (MECHANICS.BAR_WIDTH / 2);
    
    // Motor is spaced from Pivot by user config (Slider)
    const motorCenterX = pivotX - motorSpacing;

    // --- Linkage Geometry ---
    // Bar Top Hole Y (in Closed state)
    // Top hole is near the top of the flap structure
    const topHoleGlobalY_Closed = flapTopY_Closed + 12; // Slightly down from top
    
    // Linkage Pin Local Coords (Relative to Pivot)
    const mountHoleLocal = { 
      x: 0, 
      y: topHoleGlobalY_Closed - pivotY // Negative value (since pivot is below)
    };
    const flapMountRadius = Math.abs(mountHoleLocal.y);
    const flapMountBaseAngle = -Math.PI / 2; // -90 deg (Up)

    // --- Shaft Collision Solver (Analytic) ---
    // Find Angle where Bar Edge hits Shaft/Motor components.
    
    // Define obstruction line X (Right edge of Shaft/Nut/Collar)
    const shaftRightX = motorCenterX + (MOTOR.ROD_THICKNESS/2) + (MOTOR.SHAFT_END_CAP_H/2); 
    const safetyX = shaftRightX + CONSTRAINTS.COLLISION.SAFETY_MARGIN;
    
    // Check collision angle
    let maxAngleDeg = -45; // Default fallback
    
    // Intersection of circle arc with vertical line x = safetyX
    if (Math.abs(safetyX - pivotX) < flapMountRadius) {
       // We use asin relative to vertical (-90deg base)
       // Since safetyX should be < pivotX, the argument is negative.
       // The resulting angle is negative (tilting left/opening).
       const val = (safetyX - pivotX) / flapMountRadius;
       // Clamp to avoid numerical issues if safetyX ~ pivotX
       const clampedVal = Math.max(-1, Math.min(1, val));
       const angleRelRad = Math.asin(clampedVal);
       maxAngleDeg = angleRelRad * 180 / Math.PI;
    }
    
    // IMPORTANT: Ensure flap never tilts "into" the panel (positive angle).
    // It must strictly be <= 0.
    maxAngleDeg = Math.min(0, maxAngleDeg);
    
    // Clamp lower bound (max open limit of the hinge itself, e.g. 170 deg)
    maxAngleDeg = Math.max(-170, maxAngleDeg);

    // --- Dynamic Limits Calculations ---
    
    // 1. Closed State (Angle 0)
    // Pin at topHoleGlobalY_Closed. Nut on Shaft.
    const pinClosed = { x: pivotX, y: topHoleGlobalY_Closed };
    const dxClosed = Math.abs(motorCenterX - pinClosed.x);
    const dyLinkClosed = Math.sqrt(Math.max(0, MECHANICS.LINK_LENGTH**2 - dxClosed**2));
    const nutY_Closed = pinClosed.y + dyLinkClosed;

    // 2. Max Open State (Angle maxAngleDeg)
    const maxRad = maxAngleDeg * Math.PI / 180;
    const effAngle = maxRad + flapMountBaseAngle;
    const pinOpen = {
      x: pivotX + flapMountRadius * Math.cos(effAngle),
      y: pivotY + flapMountRadius * Math.sin(effAngle)
    };
    const dxOpen = Math.abs(motorCenterX - pinOpen.x);
    const dyLinkOpen = Math.sqrt(Math.max(0, MECHANICS.LINK_LENGTH**2 - dxOpen**2));
    const nutY_Open = pinOpen.y + dyLinkOpen;

    // Shaft Geometry
    const shaftTopY = nutY_Closed - MOTOR.SHAFT_END_CAP_H - 10;
    
    // Limit Collar Position
    const limitCollarY = nutY_Open + HARDWARE.NUT_HEIGHT/2;

    // Hardware Locations
    // Magnet is above the overlap area. 
    // It sits on the face of the fixed panel.
    const magnetY = topPanelBottomY - MECHANICS.OVERLAP_TOP/2 - HARDWARE.MAGNET_H/2 - HARDWARE.MAGNET_GAP;
    // Striker aligns with magnet
    const strikerY = magnetY; 

    // --- Layout Calculations ---
    // Ensure we have room for the motor (motorCenterY + height/2)
    // Plus a gap for visual separation (20px)
    // Plus the bottom frame thickness
    const visualBottomY = motorCenterY + MOTOR.HEIGHT/2 + 40; 

    return {
      pivot: { x: pivotX, y: pivotY },
      motorPos: { x: motorCenterX, y: motorCenterY },
      flapMountRadius,
      flapMountBaseAngle,
      magnetY,
      strikerY,
      topPanelBottomY,
      topPanelTopY,
      botPanelTopY,
      mountHoleLocal,
      maxAngleDeg,
      limitCollarY,
      shaftTopY,
      flapHeight,
      overlapTop: MECHANICS.OVERLAP_TOP,
      overlapBottom: MECHANICS.OVERLAP_BOTTOM,
      barLength: Math.abs(mountHoleLocal.y) + MECHANICS.BAR_EXTENSION_ABOVE,
      
      // Layout Bounds for ViewBox
      bracketTopY: pivotY, 
      bracketBottomY: pivotY,
      nutY_Open,
      nutY_Closed, 
      screenRightX,
      screenTopY,
      screenBottomY: visualBottomY, // Use extended bottom
      canvasHeight: visualBottomY + 50,
      insulationX, // This is the interface line between fixed and flap
      fixedPanelRightX: fixedInsulationRightX,
    };
  }, [gapHeight, motorSpacing]); // Re-run when config changes

  // =========================================================================
  // 2. Kinematic Solver
  // =========================================================================
  
  const solveKinematics = (angleDeg: number) => {
    const angleRad = angleDeg * Math.PI / 180;
    const effectiveAngle = angleRad + staticGeo.flapMountBaseAngle;
    
    const flapMount = {
      x: staticGeo.pivot.x + staticGeo.flapMountRadius * Math.cos(effectiveAngle),
      y: staticGeo.pivot.y + staticGeo.flapMountRadius * Math.sin(effectiveAngle)
    };

    const dx = Math.abs(staticGeo.motorPos.x - flapMount.x);
    const linkSq = MECHANICS.LINK_LENGTH ** 2;
    const dxSq = dx * dx;
    
    const dy = Math.sqrt(Math.max(0, linkSq - dxSq));
    const nutY = flapMount.y + dy;

    const nut = { x: staticGeo.motorPos.x, y: nutY };
    const linkAngleDeg = Math.atan2(flapMount.y - nut.y, flapMount.x - nut.x) * 180 / Math.PI;

    return { flapMount, nut, linkAngleDeg };
  };

  // =========================================================================
  // 3. System State Resolution
  // =========================================================================

  const closedState = solveKinematics(0);
  const openState = solveKinematics(staticGeo.maxAngleDeg);
  
  const travelDist = openState.nut.y - closedState.nut.y; 
  const currentNutY = closedState.nut.y + ((actuatorExtension / 100) * travelDist);
  
  // Inverse Kinematics
  const solveAngleFromNutY = (targetY: number) => {
    const P = staticGeo.pivot;
    const N = { x: staticGeo.motorPos.x, y: targetY };
    
    const d = getDistance(P, N);
    const r1 = staticGeo.flapMountRadius;
    const r2 = MECHANICS.LINK_LENGTH;
    
    if (d > r1 + r2 || d < Math.abs(r1 - r2) || d === 0) return 0; 
    
    const a = (r1*r1 - r2*r2 + d*d) / (2*d);
    const h = Math.sqrt(Math.max(0, r1*r1 - a*a));
    const x2 = P.x + a * (N.x - P.x) / d;
    const y2 = P.y + a * (N.y - P.y) / d;
    
    const x3_2 = x2 - h * (N.y - P.y) / d;
    const y3_2 = y2 + h * (N.x - P.x) / d;
    
    const angle2 = Math.atan2(y3_2 - P.y, x3_2 - P.x) - staticGeo.flapMountBaseAngle;
    return angle2 * 180 / Math.PI;
  };

  const currentAngleDeg = solveAngleFromNutY(currentNutY);
  const finalState = solveKinematics(currentAngleDeg);
  
  // Calculate Shaft Drawing Length (from motor top to calculated top)
  const motorBodyTopY = staticGeo.motorPos.y - MOTOR.HEIGHT/2;
  const shaftLength = Math.max(0, motorBodyTopY - staticGeo.shaftTopY);

  return {
    maxAngleDeg: staticGeo.maxAngleDeg,
    currentAngleDeg,
    layout: staticGeo,
    static: staticGeo,
    dynamic: {
      nut: finalState.nut,
      flapMount: finalState.flapMount,
      rodTop: { x: staticGeo.motorPos.x, y: staticGeo.shaftTopY },
      linkAngleDeg: finalState.linkAngleDeg,
      shaftLength: shaftLength,
      threadOffset: currentNutY % 4 
    }
  };
};
