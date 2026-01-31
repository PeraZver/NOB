/**
 * geometryUtils.js - This file is part of the NOB web project.
 * 
 * Geometry parsing utility functions for handling spatial data formats.
 * 
 * Created: 01/2026
 * Authors: Pero & Github Copilot
 */

/**
 * Parse POINT geometry string from database
 * @param {string} pointString - POINT geometry string (e.g., "POINT(lng lat)")
 * @returns {Object|null} Object with lat and lng properties, or null if invalid
 */
export function parsePoint(pointString) {
    if (!pointString || typeof pointString !== 'string') {
        return null;
    }
    
    // Remove "POINT(" prefix and ")" suffix, then split by whitespace
    const coords = pointString
        .replace(/POINT\s*\(\s*/i, '')
        .replace(/\s*\)/, '')
        .trim()
        .split(/\s+/);
    
    if (coords.length !== 2) {
        console.warn(`Invalid POINT format: ${pointString}`);
        return null;
    }
    
    const lng = parseFloat(coords[0]);
    const lat = parseFloat(coords[1]);
    
    if (isNaN(lng) || isNaN(lat)) {
        console.warn(`Invalid coordinates in POINT: ${pointString}`);
        return null;
    }
    
    return { lat, lng };
}
