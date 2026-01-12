
/**
 * HOOKS/USESIMULATIONPHYSICS.TS
 * 
 * The Brain of the application.
 * 
 * Responsibilities:
 * 1. Calculate static geometry based on config (Flap length, spacing).
 * 2. Solve kinematics (Inverse & Forward) to determine positions at specific angles.
 * 3. Perform collision detection to find physical limits.
 * 4. Return a complete 'SystemState' object for the renderer.
 */

import { useMemo } from 'react';
import { SimulationConfig, SystemState, Point } from '../types';
import { DIMENSIONS, CONSTRAINTS } from '../constants';
import { rotatePoint, getDistance, getAngle, polygonsIntersect } from '../utils/geometry';

export const useSimulationPhysics = (config: SimulationConfig): SystemState => {
  // Destructure config for readability
  const { flapHeight, motorSpacing, actuatorExtension } = config;
  const { FRAME, INSULATION, MECHANICS, MOTOR, LAYOUT, HARDWARE } = DIMENSIONS;

  // =========================================================================
  // 1. Static Geometry Calculation
  //    Coordinates that do not change when the window opens/closes.
  // =========================================================================
  const staticGeo = useMemo(() => {
    // Y-Axis increases downwards
    const topPanelBottomY   = LAYOUT.TOP_MARGIN + FRAME.THICKNESS + 100; // Fixed top panel height 100
    const flapTopY_Closed   = topPanelBottomY - MECHANICS.OVERLAP_REGION;
    const flapBottomY_Closed= flapTopY_Closed + flapHeight;
    const pivotY            = flapBottomY_Closed + MECHANICS.FLAP_OFFSET_Y;
    const motorPivotY       = pivotY + motorSpacing;

    // X-Axis Layout
    const centerLineX       = LAYOUT.ORIGIN_X + (FRAME.WIDTH / 2);
    const fixedInsulationX  = centerLineX - (INSULATION.THICKNESS / 2);
    // The flap sits exactly one thickness to the left of the fixed insulation
    const flapX_Closed      = fixedInsulationX - INSULATION.THICKNESS; 
    
    const bracketX          = flapX_Closed - MECHANICS.BRACKET_WIDTH;
    const pivotX            = bracketX + (MECHANICS.BRACKET_WIDTH / 2);
    const motorPivotX       = fixedInsulationX - (MOTOR.HINGE_THICKNESS / 2);

    // Calculate Mount Length (Inverse Kinematics for Hardware)
    // We need to size the bracket connecting the flap to the rod so it *just* clears the motor assembly.
    const obstaclePoint = { x: bracketX - 5, y: pivotY + 10 }; // Corner of the metal bracket
    const motorPivot    = { x: motorPivotX, y: motorPivotY };
    
    // Position of the nut relative to the pivot center (Unrotated/Closed)
    // The nut aligns with the top magnet/washer position for symmetry
    const localNutY     = -(flapHeight + MECHANICS.FLAP_OFFSET_Y) + MECHANICS.MOUNT_MARGIN_TOP + (MECHANICS.MOUNT_HEIGHT / 2);
    const globalNutY    = pivotY + localNutY;

    // Math: Find X on the line from MotorPivot through Obstacle at Y = globalNutY
    // Slope formula: m = dy/dx
    const slope         = (obstaclePoint.y - motorPivot.y) / (obstaclePoint.x - motorPivot.x);
    // x = x1 + (y - y1) / m
    const requiredNutX  = motorPivot.x + (globalNutY - motorPivot.y) / slope;
    
    // Ensure minimum length of 30px, otherwise use calculated clearance
    const mountLength   = Math.max(30, flapX_Closed - requiredNutX);

    return {
      pivot: { x: pivotX, y: pivotY },
      motorPivot: { x: motorPivotX, y: motorPivotY },
      flapX: flapX_Closed,
      fixedX: fixedInsulationX,
      mountLength,
      localNutY, // Store local Y for rotation calculations later
      
      // Bounds for frame drawing
      screenBottomY: motorPivotY + 80 + FRAME.CHANNEL_DEPTH + FRAME.THICKNESS,
      screenRightX: LAYOUT.ORIGIN_X + FRAME.WIDTH,
      topPanelBottomY
    };
  }, [flapHeight, motorSpacing]); // Only recalculate if physical dims change

  // =========================================================================
  // 2. Kinematic Solver
  //    Calculates the position of all moving parts for a specific angle.
  // =========================================================================
  const solveKinematics = (angleDeg: number) => {
    const angleRad = angleDeg * Math.PI / 180;

    // A. Calculate Nut Position (Orbiting the Main Pivot)
    // Note: localNutX is negative because it's to the left of the flap face
    const localNutX = (staticGeo.flapX - staticGeo.mountLength) - staticGeo.pivot.x;
    const nutGlobal = rotatePoint(
      { x: staticGeo.pivot.x + localNutX, y: staticGeo.pivot.y + staticGeo.localNutY },
      staticGeo.pivot,
      angleRad
    );

    // B. Calculate Motor Body Angle (Pointing at Nut)
    // The shaft is offset from the motor center, so we need arcsin correction.
    const motorOffset     = -((MOTOR.HINGE_THICKNESS / 2) + (MOTOR.HEIGHT / 2));
    const distPivotToNut  = getDistance(staticGeo.motorPivot, nutGlobal);
    const directAngle     = getAngle(staticGeo.motorPivot, nutGlobal);
    
    // Correction angle because the rod doesn't come out of the center
    // Clamp value to -1/1 to prevent Math.asin NaN errors on impossible geometries
    const angleCorrection = Math.asin(Math.max(-1, Math.min(1, motorOffset / distPivotToNut)));
    const motorAngleRad   = directAngle - angleCorrection;

    // C. Calculate Shaft Start Point
    // It starts at the end of the hinge leaf, rotated by the motor angle
    const shaftStartLocal = { x: MOTOR.HINGE_LEAF_LENGTH, y: motorOffset };
    const shaftStartGlobal = rotatePoint(
      { x: staticGeo.motorPivot.x + shaftStartLocal.x, y: staticGeo.motorPivot.y + shaftStartLocal.y },
      staticGeo.motorPivot,
      motorAngleRad
    );

    return {
      nutGlobal,
      motorAngleRad,
      shaftStartGlobal,
      distPivotToNut
    };
  };

  // =========================================================================
  // 3. Collision Detection & Max Angle Calculation
  //    Determines the physical limit of the system.
  // =========================================================================
  
  // We determine the shaft length based on the CLOSED state (Angle 0).
  // The rod is fixed length; the nut travels along it.
  const zeroState = solveKinematics(0);
  const fixedShaftLength = getDistance(zeroState.shaftStartGlobal, zeroState.nutGlobal) + 25; // +25mm buffer

  const checkCollision = (angleDeg: number): boolean => {
    const k = solveKinematics(angleDeg);
    const rad = angleDeg * Math.PI / 180;
    
    // 1. Simple Distance Check: Nut hitting Motor Hinge
    const minSafeDist = MOTOR.HINGE_LEAF_LENGTH + (HARDWARE.NUT_WIDTH / 2) + 2;
    if (k.distPivotToNut < minSafeDist) return true;

    // 2. Point Check: Motor Body hitting Fixed Wall
    const motorCorners = [
      { x: MOTOR.HINGE_LEAF_LENGTH, y: -MOTOR.HINGE_THICKNESS / 2 },
      { x: MOTOR.HINGE_LEAF_LENGTH - MOTOR.WIDTH, y: -MOTOR.HINGE_THICKNESS / 2 - MOTOR.HEIGHT }
    ];
    for (const p of motorCorners) {
      const globalP = rotatePoint(
        { x: staticGeo.motorPivot.x + p.x, y: staticGeo.motorPivot.y + p.y },
        staticGeo.motorPivot,
        k.motorAngleRad
      );
      if (globalP.x > staticGeo.fixedX) return true;
    }

    // 3. SAT Check: Rod hitting Flap
    // Define Flap Polygon (Rotated)
    const flapW = INSULATION.THICKNESS;
    const flapH = flapHeight;
    // Local coordinates relative to Pivot
    const flapTL = { x: staticGeo.flapX - staticGeo.pivot.x, y: -(MECHANICS.FLAP_OFFSET_Y + flapH) };
    
    const polyFlap = [
      rotatePoint({ x: staticGeo.pivot.x + flapTL.x, y: staticGeo.pivot.y + flapTL.y }, staticGeo.pivot, rad), // TL
      rotatePoint({ x: staticGeo.pivot.x + flapTL.x + flapW, y: staticGeo.pivot.y + flapTL.y }, staticGeo.pivot, rad), // TR
      rotatePoint({ x: staticGeo.pivot.x + flapTL.x + flapW, y: staticGeo.pivot.y + flapTL.y + flapH }, staticGeo.pivot, rad), // BR
      rotatePoint({ x: staticGeo.pivot.x + flapTL.x, y: staticGeo.pivot.y + flapTL.y + flapH }, staticGeo.pivot, rad), // BL
    ];

    // Define Rod Polygon (Rotated by Motor Angle)
    // Rod vector
    const rodDir = {
      x: Math.cos(k.motorAngleRad),
      y: Math.sin(k.motorAngleRad)
    };
    // Perpendicular vector for thickness
    const perp = { x: -rodDir.y, y: rodDir.x };
    const halfThick = (MOTOR.ROD_THICKNESS / 2) + 1; // +1 Safety

    const p1 = k.shaftStartGlobal;
    const p2 = { x: p1.x + rodDir.x * fixedShaftLength, y: p1.y + rodDir.y * fixedShaftLength };
    
    const polyRod = [
      { x: p1.x + perp.x * halfThick, y: p1.y + perp.y * halfThick },
      { x: p1.x - perp.x * halfThick, y: p1.y - perp.y * halfThick },
      { x: p2.x - perp.x * halfThick, y: p2.y - perp.y * halfThick },
      { x: p2.x + perp.x * halfThick, y: p2.y + perp.y * halfThick },
    ];

    return polygonsIntersect(polyFlap, polyRod);
  };

  // Find Max Angle via Iterative Search (Memoized)
  const maxAngleDeg = useMemo(() => {
    // We scan from 0 (Closed) to -160 (Open) to find the first collision
    const { START_ANGLE, END_ANGLE, PRECISION } = CONSTRAINTS.COLLISION;
    
    // Immediate check for 0
    if (checkCollision(START_ANGLE)) return START_ANGLE;

    // Linear scan is efficient enough here (approx 300 iterations max) and robust
    for (let a = START_ANGLE; a >= END_ANGLE; a -= PRECISION) {
      if (checkCollision(a)) {
        return a + PRECISION; // Back off one step to be safe
      }
    }
    return END_ANGLE;
  }, [flapHeight, motorSpacing, fixedShaftLength]); // Re-run if geometry changes

  // =========================================================================
  // 4. Final State Assembly
  // =========================================================================
  
  // Map 0-100% extension to 0-MaxAngle
  const currentAngleDeg = (actuatorExtension / 100) * maxAngleDeg;
  const currentKinematics = solveKinematics(currentAngleDeg);

  // Determine Stopper Position (Visual only)
  // The stopper is set at the point where max extension hits the max angle
  const maxKinematics = solveKinematics(maxAngleDeg);
  const distAtMax = getDistance(maxKinematics.shaftStartGlobal, maxKinematics.nutGlobal);
  const stopperPos = distAtMax - (HARDWARE.NUT_WIDTH / 2);

  return {
    maxAngleDeg,
    currentAngleDeg,
    layout: {
      canvasHeight: staticGeo.screenBottomY + DIMENSIONS.LAYOUT.BOTTOM_PADDING,
      screenRightX: staticGeo.screenRightX,
      screenTopY: DIMENSIONS.LAYOUT.TOP_MARGIN,
      screenBottomY: staticGeo.screenBottomY,
      insulationX: staticGeo.fixedX,
    },
    static: {
      pivot: staticGeo.pivot,
      motorPivot: staticGeo.motorPivot,
      bracketTopY: staticGeo.pivot.y - MECHANICS.BRACKET_LENGTH + 5,
      bracketBottomY: staticGeo.pivot.y + 10,
      mountLength: staticGeo.mountLength,
    },
    dynamic: {
      nut: currentKinematics.nutGlobal,
      motorAngleDeg: currentKinematics.motorAngleRad * 180 / Math.PI,
      shaftStart: currentKinematics.shaftStartGlobal,
      shaftLength: fixedShaftLength,
      stopperPos: stopperPos,
      rodExtension: getDistance(currentKinematics.shaftStartGlobal, currentKinematics.nutGlobal)
    }
  };
};
