
/**
 * CONSTANTS.TS
 * 
 * The Single Source of Truth for physical dimensions and visual styles.
 * 
 * ARCHITECTURE NOTE:
 * All dimensions are in "Simulated Pixels" where 1px approx 1mm.
 * Variables are grouped by physical component to ensure modularity.
 */

// ==========================================
// 1. Physical Dimensions (The "Model")
// ==========================================

export const DIMENSIONS = {
  // Global Layout Anchors
  LAYOUT: {
    ORIGIN_X: 650,          // The right-side anchor of the window frame
    TOP_MARGIN: 20,         // Canvas padding top
    BOTTOM_PADDING: 40,     // Canvas padding bottom
  },

  // The Vinyl Frame Profile
  FRAME: {
    WIDTH: 35,
    THICKNESS: 4,
    CHANNEL_DEPTH: 25,      // How deep the insulation sits in the frame
    LIP: 5,                 // The small vinyl overhang
  },

  // The Pink Insulation Foam
  INSULATION: {
    THICKNESS: 20,
    SCREW_HOLES: [10, 25, 40], // Y-offsets for mounting screws relative to pivot
  },

  // Mechanical Hardware (Brackets, Mounts)
  MECHANICS: {
    PIVOT_OFFSET_Y: 50,     // Distance from fixed bottom panel to pivot
    FLAP_OFFSET_Y: 25,      // Distance from pivot to actual flap start
    OVERLAP_REGION: 60,     // Overlap between top fixed panel and flap
    BRACKET_WIDTH: 15,
    BRACKET_LENGTH: 60,
    MOUNT_HEIGHT: 20,       // Height of the connector block on the flap
    MOUNT_MARGIN_TOP: 20,   // Clearance for the nut on the mount
    WASHER_THICKNESS: 4,
  },

  // The Linear Actuator / Motor Assembly
  MOTOR: {
    WIDTH: 50,
    HEIGHT: 40,
    HINGE_THICKNESS: 5,
    HINGE_LEAF_LENGTH: 70,  // Length of the metal strap holding the motor
    PLATE_HEIGHT: 60,       // Wall mounting plate height
    ROD_THICKNESS: 8,
    PIN_RADIUS: 4,
    STOPPER_WIDTH: 5,
  },

  // Small Hardware Details
  HARDWARE: {
    NUT_WIDTH: 18,
    NUT_HEIGHT: 10,
    MAGNET_W: 6,
    MAGNET_H: 12,
    SEAL_W: 12,
    SEAL_H: 4,
  },
};

// ==========================================
// 2. Simulation Constraints (The "Rules")
// ==========================================

export const CONSTRAINTS = {
  // User Input Limits
  FLAP_HEIGHT:   { MIN: 100, MAX: 400, DEFAULT: 125 },
  MOTOR_SPACING: { MIN: 80,  MAX: 300, DEFAULT: 120 },
  SPEED:         { MIN: 0,   MAX: 2,   DEFAULT: 0,   STEP: 0.1 },
  EXTENSION:     { MIN: 0,   MAX: 100, DEFAULT: 0 }, // Percent
  
  // Physics Solver Limits
  COLLISION: {
    START_ANGLE: 0,
    END_ANGLE: -160,
    PRECISION: 0.5, // Degrees per step
  },
};

// ==========================================
// 3. Visual Styling (The "View")
// ==========================================

export const STYLES = {
  COLORS: {
    VINYL:      { FILL: "#f1f5f9", STROKE: "#64748b" },
    INSULATION: { FILL: "#f9a8d4", STROKE: "#db2777" },
    METAL:      { FILL: "#cbd5e1", STROKE: "#475569", DARK: "#475569" },
    BRASS:      { FILL: "#fbbf24", STROKE: "#b45309", DARK: "#78350f" },
    SEALS:      "#1e293b",
  },
  STROKE: {
    DEFAULT: 1.5,
    DASHED: "2,2",
  },
};
