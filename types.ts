
/**
 * TYPES.TS
 * 
 * Defines the contract for data structures used throughout the app.
 * Separates Configuration (User Input) from State (Calculated Physics).
 */

// Basic Geometric Primitives
export interface Point {
  x: number;
  y: number;
}

// User-Controlled Configuration
export interface SimulationConfig {
  actuatorExtension: number; // 0 (Closed) to 100 (Open)
  gapHeight:         number; // The vertical height of the opening (controls flap size)
  animationSpeed:    number; // Hz (0 = paused)
  motorSpacing:      number; // Horizontal distance between Pivot and Shaft
}

// Computed System State (The output of the physics engine)
// This contains everything the Renderer needs to draw a frame.
export interface SystemState {
  // Calculated Limits
  maxAngleDeg: number;       // The angle where collision occurs
  currentAngleDeg: number;   // The actual angle based on extension %
  
  // Coordinate Systems (Global SVG Space)
  layout: {
    canvasHeight:     number;
    screenRightX:     number;
    screenTopY:       number;
    screenBottomY:    number;
    insulationX:      number; // The vertical line of the fixed insulation
    fixedPanelRightX: number;
  };

  // Static Parts (Calculated once per layout)
  static: {
    pivot:            Point;  // Main hinge point
    motorPos:         Point;  // Center of the fixed motor
    bracketTopY:      number;
    bracketBottomY:   number;
    flapMountRadius:  number; // Distance from pivot to flap bracket hole
    magnetY:          number; // Y position of the magnet
    strikerY:         number; // Y position of the striker (relative to pivot when closed)
    topPanelBottomY:  number; // Y position of the bottom of the top panel
    topPanelTopY:     number; // Y position of the top of the top panel
    limitCollarY:     number; // Y position of the collar on the shaft at max open
    botPanelTopY:     number; // Y position of the top of the bottom panel
    mountHoleLocal:   Point;  // Local coordinates of the mount hole relative to pivot
    flapHeight:       number; // Derived from gapHeight
    overlapTop:       number;
    overlapBottom:    number;
    barLength:        number;
    shaftTopY:        number;
    nutY_Closed:      number; // Added: Y position of the nut when closed (used for sorting labels)
  };

  // Dynamic Parts (Calculated every frame based on angle)
  dynamic: {
    nut:              Point;  // The moving connection point on the vertical rod
    flapMount:        Point;  // The point on the flap where the link attaches
    rodTop:           Point;  // Visual top of the threaded rod
    linkAngleDeg:     number; // Angle of the connecting link
    shaftLength:      number; // Length of the threaded rod
    threadOffset:     number; // Visual offset for the threads based on nut position
  };
}
