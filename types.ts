
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
  flapHeight:        number; // Length of the moving insulation panel
  motorSpacing:      number; // Vertical distance between pivot and motor mount
  animationSpeed:    number; // Hz (0 = paused)
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
  };

  // Static Parts (Calculated once per layout)
  static: {
    pivot:            Point;  // Main hinge point
    motorPivot:       Point;  // Bottom motor anchor
    bracketTopY:      number;
    bracketBottomY:   number;
    mountLength:      number; // Calculated length of flap bracket to clear obstacles
  };

  // Dynamic Parts (Calculated every frame based on angle)
  dynamic: {
    nut:              Point;  // The moving connection point on the flap
    motorAngleDeg:    number; // Angle of the motor body
    shaftStart:       Point;  // Where the rod exits the motor
    shaftLength:      number; // Fixed length of the rod
    stopperPos:       number; // Position of the limit stopper on the rod
    rodExtension:     number; // How far the nut is along the rod
  };
}
