/**
 * map.js - This file is part of the NOB web project.
 * 
 * Main map initialization and UI control logic. Handles Leaflet map setup,
 * sidebar toggling, layer switching, and event listener registration.
 * 
 * Created: 11/2025
 * Authors: Pero & Github Copilot
 */

import layerState from './layerState.js';
import { showLayerFromAPI, showOccupiedTerritory, showBattles, removeLayer, refreshAllVisibleLayers, handleBrigadeMarkerClick, showCampaigns } from './map_layers.js';
import { loadDefaultText } from './sidebar.js';
import { handleYearFilter, handleMonthFilter, handleCalendarToggle, clearYearFilter, setupCalendarHoverHandlers, positionCalendarMenus } from './handlers/filterHandlers.js';
import { MAP_CONFIG, MARKDOWN_PATHS, API_ENDPOINTS } from './config.js';

// Declare the map variable globally
export const map = L.map('map').setView(MAP_CONFIG.defaultCenter, MAP_CONFIG.defaultZoom);

// Load a basic tile layer
L.tileLayer(MAP_CONFIG.tileLayerUrl, {
    attribution: MAP_CONFIG.tileLayerAttribution
}).addTo(map);

map.on('click', function (e) {
    console.log(`Clicked at ${e.latlng.lat}, ${e.latlng.lng}`);
});

// Add a map click event to reset the sidebar to default text
map.on('click', function () {
    const markdownFile = MARKDOWN_PATHS[layerState.currentLayerName];
    if (markdownFile) {
        loadDefaultText(markdownFile);
    }
    
    // Only hide Campaign button and remove campaign layer if campaign markers are NOT visible
    if (!layerState.isCampaignsLayerVisible) {
        const campaignButton = document.getElementById('toggleCampaign');
        if (campaignButton) {
            campaignButton.style.display = 'none';
        }
        layerState.selectedBrigadeId = null;
    }
    // If campaign markers ARE visible, clicking on map has no effect on them
});

export function toggleSidebar(layerName, shouldRemoveLayer = true) {
    const sidebar = document.getElementById('sidebar');
    const content = document.getElementById('content');
    const mapElement = document.getElementById('map');

    if (layerState.currentLayerName === layerName) {
        // If the same button is clicked, toggle the sidebar visibility and remove the layer
        if (sidebar.classList.contains('visible')) {
            if (shouldRemoveLayer) {
                sidebar.classList.remove('visible');
                // Only apply transform on desktop (not mobile)
                if (window.innerWidth > 768) {
                    mapElement.style.transform = 'translateX(0)';
                }
                content.classList.remove('visible');
                removeLayer(layerName);
                clearYearFilter();
            }
        } else {
            sidebar.classList.add('visible');
            // Only apply transform on desktop (not mobile)
            if (window.innerWidth > 768) {
                mapElement.style.transform = 'translateX(50%)';
            }
            content.classList.add('visible');
            showLayerByName(layerName);
        }
    } else {
        // If a different button is clicked, change the content and show the sidebar
        sidebar.classList.add('visible');
        // Only apply transform on desktop (not mobile)
        if (window.innerWidth > 768) {
            mapElement.style.transform = 'translateX(50%)';
        }
        content.classList.add('visible');
        if (shouldRemoveLayer) {
            removeLayer(layerName);
        }
        clearYearFilter();
        showLayerByName(layerName);
    }

    // Update the current layer name in the singleton object
    layerState.currentLayerName = layerName;
}

function showLayerByName(layerName) {
    const markdownFile = MARKDOWN_PATHS[layerName];
    
    switch (layerName) {
        case 'Occupied Territory':
            showOccupiedTerritory();
            break;
        case 'Detachments':
            showLayerFromAPI(API_ENDPOINTS.detachments, 'detachmentLayer', 'assets/detachments/detachments.md', 'detachments');
            break;
        case 'Brigades':
            showLayerFromAPI(API_ENDPOINTS.brigades, 'brigadesLayer', 'assets/brigades/brigades.md', 'brigades', handleBrigadeMarkerClick);
            break;
        case 'Divisions':
            showLayerFromAPI(API_ENDPOINTS.divisions, 'divisionLayer', 'assets/divisions/divisions.md', 'divisions');           
            break;
        case 'Corps':
            content.innerHTML = `
                <h1>Corps</h1>
                <p>Information about corps will be displayed here.</p>
            `;
            showLayerFromAPI(API_ENDPOINTS.corps, 'corpsLayer', 'assets/korpusi.md', 'corps');
            break;
        case 'Battles':
            content.innerHTML = `
                <h1>Battles</h1>
                <p>Information about battles will be displayed here.</p>
            `;
            showBattles();
            break;
    }

    if (markdownFile) {
        fetch(markdownFile)
            .then(response => response.text())
            .then(markdown => {
                content.innerHTML = marked.parse(markdown);
            })
            .catch(error => console.error('Error loading content:', error));
    }
}


document.getElementById('toggleOccupiedTerritory').addEventListener('click', () => {
    toggleSidebar('Occupied Territory');
});

document.getElementById('toggleDetachments').addEventListener('click', () => {
    toggleSidebar('Detachments');
});

document.getElementById('toggleBrigades').addEventListener('click', () => {
    toggleSidebar('Brigades');
});

document.getElementById('toggleDivisions').addEventListener('click', () => {
    toggleSidebar('Divisions');
});

document.getElementById('toggleCorps').addEventListener('click', () => {
    toggleSidebar('Corps');
});

document.getElementById('toggleBattles').addEventListener('click', () => {
    toggleSidebar('Battles');
});

// Campaign button to show campaigns for selected brigade
document.getElementById('toggleCampaign').addEventListener('click', () => {
    showCampaigns();
});

// Calendar button to toggle years menu
document.getElementById('toggleYearsMenu').addEventListener('click', handleCalendarToggle);

// Year filter button handlers
document.getElementById('year1941').addEventListener('click', () => handleYearFilter(1941));
document.getElementById('year1942').addEventListener('click', () => handleYearFilter(1942));
document.getElementById('year1943').addEventListener('click', () => handleYearFilter(1943));
document.getElementById('year1944').addEventListener('click', () => handleYearFilter(1944));
document.getElementById('year1945').addEventListener('click', () => handleYearFilter(1945));

// Month filter button handlers
for (let month = 1; month <= 12; month++) {
    document.getElementById(`month${month}`).addEventListener('click', () => handleMonthFilter(month));
}

// Setup calendar hover handlers for auto-hide functionality
setupCalendarHoverHandlers();

// Ensure calendar dropdowns align under the calendar button on load and resize (mobile only)
positionCalendarMenus();
window.addEventListener('resize', positionCalendarMenus);
