/**
 * markerUtils.js - This file is part of the NOB web project.
 * 
 * Marker creation utility functions. Provides functions for creating Leaflet map markers
 * with labels and click handlers for military units.
 * 
 * Created: 11/2025
 * Authors: Pero & Github Copilot
 */

import { parsePoint } from './geometryUtils.js';

/**
 * Create a marker with label
 * @param {Object} item - Military unit data
 * @param {Object} icon - Leaflet icon object
 * @param {Function} onClickHandler - Click handler function
 * @returns {Object} Leaflet marker
 */
export function createMarker(item, icon, onClickHandler) {
    if (!item.location) {
        console.warn(`Cannot create marker: location is null for item ${item.name || item.site || 'Unknown'}`);
        return null;
    }

    const coords = parsePoint(item.location);
    if (!coords) {
        console.warn(`Cannot create marker: invalid location format for item ${item.name || item.site || 'Unknown'}`);
        return null;
    }

    const marker = L.marker([coords.lat, coords.lng], { icon: icon || L.Icon.Default });

    // Add label next to the marker (support both 'name' for military units and 'site' for crimes)
    const label = item.name || item.site || 'Unknown';
    marker.bindTooltip(label, {
        permanent: false,
        direction: 'right',
        className: 'marker-label'
    });

    if (onClickHandler) {
        marker.on('click', () => onClickHandler(marker, item));
    }

    return marker;
}
