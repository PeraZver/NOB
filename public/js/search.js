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

                // Debugging: Log layerState and item.type
                console.log('Layer state:', layerState);
                console.log('Item type:', item.type);

                // Get the appropriate layer group based on type
                const layerGroup = layerState[`${item.type}Layer`];
                if (!layerGroup) {
                    console.error(`Layer group for ${item.type} is not initialized.`);
                    return;
                }
                let targetMarker = null;

                layerGroup.eachLayer((layer) => {
                    if (layer.getLatLng().lat === parseFloat(lat) && layer.getLatLng().lng === parseFloat(lng)) {
                        targetMarker = layer;
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
        })
        .catch(error => console.error('Error fetching search result details:', error));
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
