export interface SimulationConfig {
  actuatorExtension: number; // 0 to 100% (Controls Flap Angle)
  flapHeight: number; // Length of the moving flap (px)
  topPanelHeight: number; // Height of the top insulation panel (px)
  animationSpeed: number; // Animation frequency in Hz (0 to 1)
}

// Geometric Point Interface used in Physics Engine
export interface Point {
  x: number;
  y: number;
}
