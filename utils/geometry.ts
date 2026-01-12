
/**
 * UTILS/GEOMETRY.TS
 * 
 * Pure mathematical functions for 2D Geometry and Collision Detection.
 * Contains no application state, only generic logic.
 */

import { Point } from '../types';

// --- Basic Vector Math ---

// Rotates a point around a center by a given angle (radians)
export const rotatePoint = (p: Point, center: Point, radians: number): Point => {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dx = p.x - center.x;
  const dy = p.y - center.y;
  
  return {
    x: cos * dx - sin * dy + center.x,
    y: sin * dx + cos * dy + center.y,
  };
};

// Euclidean distance between two points
export const getDistance = (p1: Point, p2: Point): number => 
  Math.hypot(p2.x - p1.x, p2.y - p1.y);

// Angle of the vector pointing from p1 to p2
export const getAngle = (p1: Point, p2: Point): number => 
  Math.atan2(p2.y - p1.y, p2.x - p1.x);

// --- SAT (Separating Axis Theorem) Collision Detection ---

// Projects a polygon onto an axis and returns min/max scalar values
const projectPolygon = (poly: Point[], axis: Point) => {
  let min = Infinity;
  let max = -Infinity;
  
  for (const p of poly) {
    const dot = p.x * axis.x + p.y * axis.y;
    if (dot < min) min = dot;
    if (dot > max) max = dot;
  }
  return { min, max };
};

// Checks if two projections overlap
const isGap = (polyA: Point[], polyB: Point[], axis: Point) => {
  const projA = projectPolygon(polyA, axis);
  const projB = projectPolygon(polyB, axis);
  return projA.max < projB.min || projB.max < projA.min;
};

// Returns TRUE if two Convex Polygons intersect
export const polygonsIntersect = (polyA: Point[], polyB: Point[]): boolean => {
  // 1. Test normals of Poly A
  for (let i = 0; i < polyA.length; i++) {
    const p1 = polyA[i];
    const p2 = polyA[(i + 1) % polyA.length];
    // Normal vector (perpendicular to edge)
    const axis = { x: -(p2.y - p1.y), y: p2.x - p1.x };
    if (isGap(polyA, polyB, axis)) return false;
  }

  // 2. Test normals of Poly B
  for (let i = 0; i < polyB.length; i++) {
    const p1 = polyB[i];
    const p2 = polyB[(i + 1) % polyB.length];
    const axis = { x: -(p2.y - p1.y), y: p2.x - p1.x };
    if (isGap(polyA, polyB, axis)) return false;
  }

  // No gap found on any axis -> Intersecting
  return true;
};
