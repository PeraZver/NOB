/**
 * splineUtils.js - This file is part of the NOB web project.
 * 
 * Catmull-Rom spline interpolation utilities for smooth path generation.
 * Provides functions to create smooth curves through a set of points.
 * 
 * Created: 01/2026
 * Authors: Pero & Github Copilot
 */

/**
 * Catmull-Rom spline interpolation for a single dimension
 * @param {number} p0 - Point before start
 * @param {number} p1 - Start point
 * @param {number} p2 - End point
 * @param {number} p3 - Point after end
 * @param {number} t - Interpolation parameter (0 to 1)
 * @param {number} tension - Tension parameter (0 = loose, 1 = tight)
 * @returns {number} Interpolated value
 */
function catmullRomInterpolate(p0, p1, p2, p3, t, tension = 0.5) {
    const t2 = t * t;
    const t3 = t2 * t;
    
    const v0 = (p2 - p0) * tension;
    const v1 = (p3 - p1) * tension;
    
    return (2 * p1 - 2 * p2 + v0 + v1) * t3 +
           (-3 * p1 + 3 * p2 - 2 * v0 - v1) * t2 +
           v0 * t +
           p1;
}

/**
 * Generate smooth path through points using Catmull-Rom spline
 * @param {Array<Array<number>>} points - Array of [lat, lng] coordinate pairs
 * @param {number} tension - Tension parameter (0 to 1, default 0.5)
 * @param {number} numSegments - Number of interpolated points per segment (default 10)
 * @returns {Array<Array<number>>} Smoothed path coordinates
 */
export function catmullRomSpline(points, tension = 0.5, numSegments = 10) {
    if (!points || points.length < 2) {
        return points || [];
    }
    
    // If only 2 points, return them as-is (can't smooth)
    if (points.length === 2) {
        return points;
    }
    
    const result = [];
    
    // Add first point
    result.push(points[0]);
    
    // Interpolate between each pair of points
    for (let i = 0; i < points.length - 1; i++) {
        // Get the four control points for Catmull-Rom spline
        const p0 = i > 0 ? points[i - 1] : points[i];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = i < points.length - 2 ? points[i + 2] : points[i + 1];
        
        // Generate interpolated points between p1 and p2
        for (let t = 0; t < numSegments; t++) {
            const tt = t / numSegments;
            
            const lat = catmullRomInterpolate(p0[0], p1[0], p2[0], p3[0], tt, tension);
            const lng = catmullRomInterpolate(p0[1], p1[1], p2[1], p3[1], tt, tension);
            
            result.push([lat, lng]);
        }
    }
    
    // Add last point
    result.push(points[points.length - 1]);
    
    return result;
}

/**
 * Create a star shape path for Leaflet markers
 * @param {number} centerLat - Center latitude
 * @param {number} centerLng - Center longitude
 * @param {number} outerRadius - Outer radius in pixels (approximate)
 * @param {number} innerRadius - Inner radius in pixels (approximate)
 * @param {number} points - Number of star points (default 5)
 * @returns {Array<Array<number>>} Array of [lat, lng] coordinates for star shape
 */
export function createStarShape(centerLat, centerLng, outerRadius = 15, innerRadius = 7, points = 5) {
    const coordinates = [];
    const angleStep = (Math.PI * 2) / (points * 2); // Full circle divided by total points (outer + inner)
    
    // Convert pixel radius to lat/lng offset
    // At equator: 1 degree ≈ 111km, so we need appropriate scaling
    // Using a more visible scale: multiply by 0.0001 for better visibility
    const radiusToLatLng = 0.0001;
    
    for (let i = 0; i < points * 2; i++) {
        const angle = i * angleStep - Math.PI / 2; // Start from top
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        
        // Convert to lat/lng offsets
        const latOffset = Math.sin(angle) * radius * radiusToLatLng;
        const lngOffset = Math.cos(angle) * radius * radiusToLatLng;
        
        const lat = centerLat + latOffset;
        const lng = centerLng + lngOffset;
        
        coordinates.push([lat, lng]);
    }
    
    // Close the shape
    coordinates.push(coordinates[0]);
    
    return coordinates;
}
