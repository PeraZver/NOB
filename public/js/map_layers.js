import { map } from './map.js';
import { icons } from './constants.js';
import { updateSidebar, loadDefaultText } from './sidebar.js';
import layerState from './layerState.js';
import { createMarker } from './utils/markerUtils.js';
import { filterDataByYear } from './utils/filterUtils.js';
import { generatePopupContent } from './utils/popupUtils.js';
import { OCCUPIED_TERRITORY_CONFIG, LAYER_MAPPING } from './config.js';

// Function to show/hide occupied territories on the map
export function showOccupiedTerritory() {
    if (layerState.isOccupiedTerritoryVisible) {
        map.removeLayer(layerState.occupiedTerritoryLayer);
        layerState.isOccupiedTerritoryLayerVisible = false;
        
    } 
    else {
        layerState.occupiedTerritoryLayer = L.imageOverlay(
            OCCUPIED_TERRITORY_CONFIG.imageUrl, 
            OCCUPIED_TERRITORY_CONFIG.imageBounds, 
            {
                opacity: OCCUPIED_TERRITORY_CONFIG.opacity,
                interactive: true,
                zIndex: OCCUPIED_TERRITORY_CONFIG.zIndex
            }
        ).addTo(map);
        layerState.isOccupiedTerritoryLayerVisible = true;
        loadDefaultText('assets/territory/occupied-territory.md');
    }
}

// Generic function to fetch and display data for a layer
export function showLayerFromAPI(apiEndpoint, layerName, markdownFile = null, group = null) {
    const capitalizedLayerName = layerName.charAt(0).toUpperCase() + layerName.slice(1);
    const layer = layerState[`${layerName}`];
    const isVisibleFlag = layerState[`is${capitalizedLayerName}Visible`];
    
    if (isVisibleFlag && layer) {
        map.removeLayer(layer);
        layerState[`${layerName}`] = null;
        layerState[`is${capitalizedLayerName}Visible`] = false;
    } else {
        fetch(apiEndpoint)
            .then(response => response.json())
            .then(data => {
                // Store all data for filtering
                layerState.allLayerData[layerName] = data;
                
                // Filter data based on selected year and month
                const filteredData = filterDataByYear(data, layerState.selectedYear, layerState.selectedMonth);
                
                const newLayer = L.layerGroup().addTo(map);
                filteredData.forEach(item => {
                    const icon = icons[group] || L.Icon.Default;
                    const marker = createMarker(item, icon, handleMarkerClick);
                    newLayer.addLayer(marker);
                });

                layerState[`${layerName}`] = newLayer;
                layerState[`is${capitalizedLayerName}Visible`] = true;

                // Update the sidebar with default text if a markdown file is provided
                if (markdownFile) {
                    loadDefaultText(markdownFile);
                }
            })
            .catch(error => console.error(`Error fetching data from ${apiEndpoint}:`, error));
    }
}

// Function to refresh all visible layers with year filter
export function refreshAllVisibleLayers() {
    // Iterate through all layers and refresh the visible ones
    Object.keys(LAYER_MAPPING).forEach(layerKey => {
        const layerInfo = LAYER_MAPPING[layerKey];
        const isVisible = layerState[layerInfo.visibleFlag];
        
        if (isVisible) {
            // Get stored data
            const storedData = layerState.allLayerData[layerInfo.layerName];
            if (!storedData) {
                return; // Skip this layer if no data is stored yet
            }
            
            // Remove existing layer
            const layer = layerState[layerInfo.layerName];
            if (layer) {
                map.removeLayer(layer);
            }
            
            // Filter and redraw
            const filteredData = filterDataByYear(storedData, layerState.selectedYear, layerState.selectedMonth);
            const newLayer = L.layerGroup().addTo(map);
            
            filteredData.forEach(item => {
                const icon = icons[layerInfo.group] || L.Icon.Default;
                const marker = createMarker(item, icon, handleMarkerClick);
                newLayer.addLayer(marker);
            });
            
            layerState[layerInfo.layerName] = newLayer;
        }
    });
}

// Function to show/hide battles on the map
export function showBattles() {
    alert('Battles data not available yet.');
}

// Function to remove a layer from the map
export function removeLayer(layerName) {
    switch (layerName) {
        case 'Brigades':
            if (layerState.isBrigadesLayerVisible) {
                map.removeLayer(layerState.brigadesLayer);
                layerState.isBrigadesLayerVisible = false;
                layerState.brigadesLayer = null;
            }
            break;
        case 'Detachments':
            if (layerState.isDetachmentLayerVisible) {
                map.removeLayer(layerState.detachmentLayer);
                layerState.isDetachmentLayerVisible = false;
                layerState.detachmentLayer = null;
            }
            break;
        case 'Divisions':
            if (layerState.isDivisionLayerVisible) {
                map.removeLayer(layerState.divisionLayer);
                layerState.isDivisionLayerVisible = false;
                layerState.divisionLayer = null;
            }
            break;
        case 'Corps':
            if (layerState.isCorpsLayerVisible) {
                map.removeLayer(layerState.corpsLayer);
                layerState.isCorpsLayerVisible = false;
                layerState.corpsLayer = null;
            }
            break;
        case 'Occupied Territory':
            if (layerState.isOccupiedTerritoryLayerVisible) {
                map.removeLayer(layerState.occupiedTerritoryLayer);
                layerState.isOccupiedTerritoryLayerVisible = false;
                layerState.occupiedTerritoryLayer = null;
            }
            break;
        case 'Battles':
            if (layerState.isBattlesLayerVisible) {
                map.removeLayer(layerState.battlesLayer);
                layerState.isBattlesLayerVisible = false;
                layerState.battlesLayer = null;
            }
            break;
        default:
            console.warn(`Unknown layer: ${layerName}`);
    }
}

// Function to handle marker clicks
export function handleMarkerClick(marker, item) {
    console.log('Marker in handleMarkerClick:', marker);
    const popupContent = generatePopupContent({
        name: item.name,
        datum_formiranja: item.formation_date,
        formation_site: item.formation_site,
        description: null, // Exclude description from the pop-up
        wikipedia_url: item.wikipedia_url
    });

    // Bind and open the popup
    marker.unbindPopup();
    marker.bindPopup(popupContent).openPopup();

    // Update the sidebar with the item's description
    if (item.description) {
        updateSidebar(marked.parse(item.description));
    } else {
        updateSidebar('<p>No additional details available.</p>');
    }
}