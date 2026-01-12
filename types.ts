export interface SimulationConfig {
  actuatorExtension: number; // 0 to 100% (Controls Flap Angle)
  flapHeight: number; // Length of the moving flap (px)
  motorSpacing: number; // Distance between Main Pivot and Motor Pivot (px)
  animationSpeed: number; // Animation frequency in Hz (0 to 1)
}

// Geometric Point Interface used in Physics Engine
export interface Point {
  x: number;
  y: number;
}