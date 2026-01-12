/**
 * CONSTANTS.TS
 * 
 * Single source of truth for the application.
 * Contains all physical dimensions, simulation constraints, and visual configuration.
 * All derived values in the app should be calculated relative to these roots.
 */

// ==========================================
// 1. Simulation Limits & Defaults
// ==========================================
export const SIM_LIMITS = {
  // Flap Length Constraints (px)
  FLAP_HEIGHT: { MIN: 100, MAX: 400, DEFAULT: 125 },
  // Top Panel Height Constraints (px)
  TOP_PANEL_HEIGHT: { MIN: 160, MAX: 350, DEFAULT: 200 },
  // Animation Control
  SPEED: { MIN: 0, MAX: 1, STEP: 0.01, DEFAULT: 0 },
  // Actuator Extension (%)
  EXTENSION: { MIN: 0, MAX: 100, DEFAULT: 0 },
};

// ==========================================
// 2. Physical Dimensions (Pixels approx. mm)
// ==========================================
export const DIMS = {
  // Canvas Setup
  CANVAS: { WIDTH: 800, MAX_HEIGHT: '100vh' },
  
  // Vinyl Window Frame Profile
  FRAME: {
    ORIGIN_X: 650,      // Right-side anchor point
    WIDTH: 35,          // Total width of the vinyl profile
    THICKNESS: 4,       // Wall thickness
    CHANNEL_DEPTH: 25,  // Depth of the channel holding the insulation
    LIP: 5,             // Small vinyl lip overlap
  },

  // Insulation Foam
  INSULATION: {
    THICKNESS: 20,
    SCREW_HOLE_SPACING: [10, 25, 40], // Relative offsets for bracket screws
  },

  // Mechanical Parts (Slotted Angle / Brackets)
  MECH: {
    BRACKET_WIDTH: 15,
    BRACKET_LENGTH: 60,
    MOUNT_HEIGHT: 20,       // Height of the small offset brackets
    PIVOT_OFFSET_Y: 50,     // Distance from Top of Bottom Panel to Pivot Center
    FLAP_OFFSET_Y: 25,      // Distance from Pivot Center to Bottom of Flap
    OVERLAP_REGION: 60,     // Vertical overlap between Top Panel and Flap (when closed)
    CONNECTION_DOT_RADIUS: 3,
  },

  // Slide Mechanism (Drawer Slide / Linear Guide)
  SLIDE: {
    HOUSING_WIDTH: 12,      // Outer rail width
    INNER_WIDTH: 8,         // Inner rail width
    OFFSET_X: 60,           // Horizontal distance from Pivot to Slide center
    TOP_MARGIN: 20,         // Clearance at top of slide (Aligned with magnet washer)
    BOTTOM_MARGIN: 20,      // Clearance at bottom of slide
    RAIL_NUT_EXTENSION: 15, // How far the inner rail extends UP past the nut
  },

  // Motor & Actuator
  MOTOR: {
    WIDTH: 50,
    HEIGHT: 40,
    HINGE_THICKNESS: 5,
    HINGE_LEAF_LENGTH: 70,
    PLATE_HEIGHT: 60,       // Mounting plate height
    TOP_CLEARANCE: 30,      // Gap between frame and motor mount
    ROD_THICKNESS: 8,
    STOPPER_SIZE: 12,
    PIN_RADIUS: 4,
  },

  // Hardware
  NUT: { WIDTH: 18, HEIGHT: 10 },
  SEAL: { WIDTH: 12, HEIGHT: 4 }, // 2*rx, 2*ry
  MAGNET: { WIDTH: 6, HEIGHT: 12 },
  
  // Layout
  LAYOUT: {
    TOP_MARGIN: 20,
    BOTTOM_PANEL_HEIGHT: 110,
  },
};

// ==========================================
// 3. Visual Styles & Colors
// ==========================================
export const STYLES = {
  COLORS: {
    VINYL: { FILL: "#f1f5f9", STROKE: "#64748b" },
    INSULATION: { FILL: "#f9a8d4", STROKE: "#db2777", TEXT: "#be185d" },
    METAL: { FILL: "#cbd5e1", STROKE: "#475569", HOLE: "#f1f5f9" },
    BRASS: "#fbbf24",     // For pins and nuts
    BRACKET: "#94a3b8",   // Darker metal
    WASHER: "#1e293b",    // Rubber seals/washers
    MAGNET: "#1e293b",
    MOTOR: "#475569",
    SLIDE_STROKE: "#475569",
  },
  STROKE_WIDTH: {
    DEFAULT: 1.5,
    THIN: 1,
  },
  CORNER_RADIUS: {
    DEFAULT: 1,
    LARGE: 4,
  },
};