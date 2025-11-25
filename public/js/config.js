/**
 * config.js - This file is part of the NOB web project.
 * 
 * Frontend configuration constants. Contains map settings, API endpoints,
 * layer configurations, icon definitions, and markdown file paths used throughout the application.
 * 
 * Created: 11/2025
 * Authors: Pero & Github Copilot
 */

/**
 * Frontend configuration constants
 */

// Map configuration
export const MAP_CONFIG = {
    defaultCenter: [44.5, 17.5],
    defaultZoom: 7,
    searchZoom: 13,
    tileLayerUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    tileLayerAttribution: '&copy; OpenStreetMap contributors'
};

// Icon definitions for different military unit types
export const icons = {
    brigades: L.icon({
        iconUrl: 'assets/icons/brigades-icon.png',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    }),
    detachments: L.icon({
        iconUrl: 'assets/icons/detachments-icon.png',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    }),
    divisions: L.icon({
        iconUrl: 'assets/icons/divisions-icon.png',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    }),
    corps: L.icon({
        iconUrl: 'assets/icons/corps-icon.png',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    })
};

// Occupied territory overlay configuration
export const OCCUPIED_TERRITORY_CONFIG = {
    imageUrl: '../img/NDHOccupationZonesLocatorMap.png',
    imageBounds: [[42.14, 14.15], [46.75, 20.682]],
    opacity: 0.7,
    zIndex: 10
};

// Layer names
export const LAYER_NAMES = {
    OCCUPIED_TERRITORY: 'Occupied Territory',
    DETACHMENTS: 'Detachments',
    BRIGADES: 'Brigades',
    DIVISIONS: 'Divisions',
    CORPS: 'Corps',
    BATTLES: 'Battles'
};

// Markdown file paths
export const MARKDOWN_PATHS = {
    'Occupied Territory': 'assets/territory/occupied-territory.md',
    'Detachments': 'assets/detachments.md',
    'Brigades': 'assets/brigades.md',
    'Divisions': 'assets/divizije.md',
    'Corps': 'assets/korpusi.md',
    'Battles': 'assets/battles.md'
};

// API endpoints
export const API_ENDPOINTS = {
    brigades: '/api/brigades',
    detachments: '/api/detachments',
    divisions: '/api/divisions',
    corps: '/api/corps',
    search: '/api/search'
};

// Layer mapping for filtering
export const LAYER_MAPPING = {
    'detachmentLayer': { 
        layerName: 'detachmentLayer', 
        group: 'detachments', 
        visibleFlag: 'isDetachmentLayerVisible' 
    },
    'brigadesLayer': { 
        layerName: 'brigadesLayer', 
        group: 'brigades', 
        visibleFlag: 'isBrigadesLayerVisible' 
    },
    'divisionLayer': { 
        layerName: 'divisionLayer', 
        group: 'divisions', 
        visibleFlag: 'isDivisionLayerVisible' 
    },
    'corpsLayer': { 
        layerName: 'corpsLayer', 
        group: 'corps', 
        visibleFlag: 'isCorpsLayerVisible' 
    }
};
