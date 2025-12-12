/**
 * search.js - This file is part of the NOB web project.
 * 
 * Search functionality for military units. Handles search input, suggestions display,
 * and navigation to selected units on the map.
 * 
 * Created: 11/2025
 * Authors: Pero & Github Copilot
 */

import { map, toggleSidebar } from './map.js';
import { handleMarkerClick, handleBattleMarkerClick } from './map_layers.js';
import layerState from './layerState.js';
import { API_ENDPOINTS, MAP_CONFIG } from './config.js';

// Constants for layer initialization retry logic
const LAYER_INIT_MAX_RETRIES = 20; // Maximum number of retry attempts
const LAYER_INIT_RETRY_DELAY_MS = 100; // Delay between retries in milliseconds
const COORDINATE_TOLERANCE = 0.0000005; // Tolerance for coordinate comparison (~0.05 meter precision)

// Map API type names to layer property names in layerState
const TYPE_TO_LAYER_MAP = {
    'brigades': 'brigadesLayer',
    'detachments': 'detachmentLayer',
    'divisions': 'divisionLayer',
    'corps': 'corpsLayer',
    'battles': 'battlesLayer'
};

// DOM Elements
const searchBox = document.getElementById('search-box');
const suggestionsBox = document.getElementById('suggestions');

// Fetch suggestions dynamically
async function fetchSuggestions(query) {
    if (!query) {
        suggestionsBox.style.display = 'none';
        return [];
    }

    try {
        const response = await fetch(`${API_ENDPOINTS.search}?q=${query}`);
        if (response.ok) {
            return await response.json();
        } else {
            console.error('Error fetching suggestions:', response.statusText);
            return [];
        }
    } catch (error) {
        console.error('Error fetching suggestions:', error);
        return [];
    }
}

// Handle search result selection
function handleSearchSelection(item) {
    // Clear the search box and suggestions
    searchBox.value = item.name;
    suggestionsBox.style.display = 'none';

    // Fetch the selected item's details
    fetch(`${API_ENDPOINTS.search}/${item.type}/${item.id}`)
        .then(response => response.json())
        .then(data => {
            if (data) {
                // Open the respective layer if not already open
                toggleSidebar(item.type.charAt(0).toUpperCase() + item.type.slice(1), false);

                // Center the map on the item's location
                const [lng, lat] = data.location.replace('POINT(', '').replace(')', '').split(' ');
                map.setView([lat, lng], MAP_CONFIG.searchZoom);

                // Wait for the layer to be loaded and then find the marker
                waitForLayerAndShowMarker(item, data, lat, lng);
            }
        })
        .catch(error => console.error('Error fetching search result details:', error));
}

// Helper function to wait for layer initialization and show marker
function waitForLayerAndShowMarker(item, data, lat, lng, retryCount = 0) {
    const layerName = TYPE_TO_LAYER_MAP[item.type];
    if (!layerName) {
        console.error(`Unknown layer type: ${item.type}`);
        return;
    }
    
    const layerGroup = layerState[layerName];
    
    if (!layerGroup) {
        if (retryCount < LAYER_INIT_MAX_RETRIES) {
            // Layer not yet initialized, wait and retry
            setTimeout(() => {
                waitForLayerAndShowMarker(item, data, lat, lng, retryCount + 1);
            }, LAYER_INIT_RETRY_DELAY_MS);
        } else {
            console.error(`Layer group for ${item.type} could not be initialized after ${LAYER_INIT_MAX_RETRIES} retries.`);
        }
        return;
    }

    // Layer is initialized, find the marker
    let targetMarker = null;
    const targetLat = parseFloat(lat);
    const targetLng = parseFloat(lng);
    
    // Search for the marker with matching coordinates (using tolerance for floating-point comparison)
    // Note: eachLayer doesn't support early exit, so we use a conditional check
    layerGroup.eachLayer((layer) => {
        if (!targetMarker) {
            const markerLatLng = layer.getLatLng();
            const latDiff = Math.abs(markerLatLng.lat - targetLat);
            const lngDiff = Math.abs(markerLatLng.lng - targetLng);
            
            if (latDiff < COORDINATE_TOLERANCE && lngDiff < COORDINATE_TOLERANCE) {
                targetMarker = layer;
            }
        }
    });

    if (targetMarker) {
        // Use appropriate marker click handler based on item type
        if (item.type === 'battles') {
            handleBattleMarkerClick(targetMarker, {
                ...data,
                place: data.place
            });
        } else {
            handleMarkerClick(targetMarker, {
                ...data,
                formation_site: data.formation_site
            });
        }
    } else {
        console.error('Marker not found in layer group');
    }
}

// Display suggestions
function displaySuggestions(suggestions) {
    suggestionsBox.innerHTML = '';
    if (suggestions.length === 0) {
        suggestionsBox.style.display = 'none';
        return;
    }

    suggestions.forEach((item) => {
        const suggestionDiv = document.createElement('div');
        suggestionDiv.textContent = item.name; // Display only the name of the item
        suggestionDiv.onclick = () => handleSearchSelection(item); // Handle selection
        suggestionsBox.appendChild(suggestionDiv);
    });

    suggestionsBox.style.display = 'block';
}

// Handle input event
searchBox.addEventListener('input', async () => {
    const query = searchBox.value.trim();
    const suggestions = await fetchSuggestions(query);
    displaySuggestions(suggestions);
});
