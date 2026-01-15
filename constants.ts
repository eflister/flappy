
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
    ORIGIN_X: 680,          // The left edge of the frame draw area (approx)
    TOP_MARGIN: 40,         // Canvas padding top
    BOTTOM_PADDING: 40,     // Canvas padding bottom
    TOP_PANEL_H: 80,        // Fixed height of the top fixed panel
  },

  // The Vinyl Frame Profile
  FRAME: {
    WIDTH: 40,              // Total width of vinyl frame
    THICKNESS: 4,           // Wall thickness of vinyl
    CHANNEL_DEPTH: 20,      // How deep the insulation sits in the frame
    LIP: 4,                 // The small vinyl overhang
    SCREEN_OFFSET_X: 5,     // Offset for the insect screen from the frame exterior
  },

  // The Pink Insulation Foam
  INSULATION: {
    THICKNESS: 24,          // Width of the XPS panel
    SCREW_HOLES: [0, 15, 30, 45],
  },

  // Mechanical Hardware (Brackets, Mounts)
  MECHANICS: {
    // Overlaps & Gaps
    OVERLAP_TOP: 20,        // Flap overlaps Top Panel by this much
    OVERLAP_BOTTOM: 20,     // Flap overlaps Bottom Panel by this much
    FLAP_HEADROOM: 15,      // Extra height at top of flap to encase striker
    
    // Mount Geometry
    MOUNT_THICKNESS: 12,    // Thickness of the grey metal mount (standoff from panel)
    
    // Bar / Linkage
    BAR_WIDTH: 14,          // Width of the vertical spine bar (Wider to show holes)
    BAR_HOLE_SPACING: 10,
    // Increased to 70 to ensure it can reach even at max motor spacing (60mm)
    // Pythagorean: sqrt(70^2 - 60^2) = ~36mm vertical drop available. 
    LINK_LENGTH: 70,        
    HINGE_KNUCKLE_R: 3.5,     
    BAR_EXTENSION_ABOVE: 8, // Bar extends above top hole
    BAR_EXTENSION_BELOW: 5, // Bar extends below pivot (half hole spacing)
    HINGE_LEAF_WIDTH: 8,    // Visual width of the linkage arm
    
    // Pivot Placement (Relative to Flap Bottom)
    PIVOT_OFFSET_Y: 25,     // Distance Pivot is BELOW the Flap Bottom Edge
  },

  // The Linear Actuator / Motor Assembly
  MOTOR: {
    WIDTH: 32,
    HEIGHT: 50,
    ROD_THICKNESS: 6,
    PIN_RADIUS: 3,
    STOPPER_WIDTH: 10,
    STOPPER_HEIGHT: 5,
    SHAFT_END_CAP_H: 4,
    // Reduced to provide just enough clearance for swing arm rotation
    // Pivot Y is bottom of swing arm mechanics. 
    // Motor Top is at (Pivot + Dist - Height/2).
    // If Dist=30 and Height=50, Motor Top = 30 - 25 = 5mm below pivot.
    DIST_BELOW_PIVOT: 30,   
  },

  // Small Hardware Details
  HARDWARE: {
    NUT_WIDTH: 14,
    NUT_HEIGHT: 10,
    MAGNET_W: 6,            // Standardized width for Magnet & Seals
    MAGNET_H: 10,           // Standardized height for Magnet & Seals
    MAGNET_GAP: 15,         // Distance above top seal
  },
};

// ==========================================
// 2. Simulation Constraints (The "Rules")
// ==========================================

export const CONSTRAINTS = {
  // User Input Limits
  GAP_HEIGHT:    { MIN: 60,  MAX: 220, DEFAULT: 120 }, 
  SPEED:         { MIN: 0,   MAX: 2,   DEFAULT: 0,   STEP: 0.1 },
  EXTENSION:     { MIN: 0,   MAX: 100, DEFAULT: 0 }, // Percent
  // Min Spacing: (MotorWidth + BarWidth)/2 + Margin = (32+14)/2 + 1 = 24.
  MOTOR_SPACING: { MIN: 24,  MAX: 60,  DEFAULT: 30 }, // mm
  
  // Physics Solver Limits
  COLLISION: {
    SAFETY_MARGIN: 6, // Pixels between bar and shaft
  },
};

// ==========================================
// 3. Visual Styling (The "View")
// ==========================================

export const STYLES = {
  COLORS: {
    VINYL:      { FILL: "#f8fafc", STROKE: "#64748b" },
    INSULATION: { FILL: "#fbcfe8", STROKE: "#db2777" },
    METAL:      { FILL: "#cbd5e1", STROKE: "#475569", DARK: "#334155" },
    BRASS:      { FILL: "#fcd34d", STROKE: "#b45309", DARK: "#78350f" },
    SEALS:      "#334155",
    SCREEN:     "#cbd5e1",
    MAGNET:     "#1e293b",
  },
  STROKE: {
    DEFAULT: 1,
    DASHED: "2,2",
  },
};
