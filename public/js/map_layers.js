/**
 * map_layers.js - This file is part of the NOB web project.
 * 
 * Layer management and data fetching for map overlays. Handles showing/hiding layers,
 * fetching data from APIs, applying filters, and managing marker interactions.
 * 
 * Created: 11/2025
 * Authors: Pero & Github Copilot
 */

import { map } from './map.js';
import { updateSidebar, loadDefaultText } from './sidebar.js';
import layerState from './layerState.js';
import { createMarker } from './utils/markerUtils.js';
import { filterDataByYear, filterBattlesByDateRange } from './utils/filterUtils.js';
import { generatePopupContent, generateBattlePopupContent } from './utils/popupUtils.js';
import { icons, OCCUPIED_TERRITORY_CONFIG, LAYER_MAPPING, API_ENDPOINTS } from './config.js';

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
export function showLayerFromAPI(apiEndpoint, layerName, markdownFile = null, group = null, clickHandler = null) {
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
                    const handler = clickHandler || handleMarkerClick;
                    const marker = createMarker(item, icon, handler);
                    if (marker) {
                        newLayer.addLayer(marker);
                    } else {
                        console.warn(`Skipping null marker for item: ${item.name}`);
                    }
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
            
            // Filter based on layer type - battles use date range filtering
            let filteredData;
            if (layerInfo.filterType === 'dateRange') {
                filteredData = filterBattlesByDateRange(storedData, layerState.selectedYear, layerState.selectedMonth);
            } else {
                filteredData = filterDataByYear(storedData, layerState.selectedYear, layerState.selectedMonth);
            }
            
            const newLayer = L.layerGroup().addTo(map);
            
            filteredData.forEach(item => {
                if (!item.location || typeof item.location !== 'string') {
                    console.warn(`Skipping item with invalid or null location: ${item.name}`);
                    return;
                }

                const icon = icons[layerInfo.group] || L.Icon.Default;
                // Use appropriate click handler based on layer type
                let clickHandler = handleMarkerClick;
                if (layerInfo.filterType === 'dateRange') {
                    clickHandler = handleBattleMarkerClick;
                } else if (layerInfo.clickHandlerType === 'brigade') {
                    clickHandler = handleBrigadeMarkerClick;
                }
                const marker = createMarker(item, icon, clickHandler);
                if (marker) {
                    newLayer.addLayer(marker);
                } else {
                    console.warn(`Skipping null marker for item: ${item.name}`);
                }
            });
            
            layerState[layerInfo.layerName] = newLayer;
        }
    });
}

// Function to show/hide battles on the map
export function showBattles() {
    if (layerState.isBattlesLayerVisible && layerState.battlesLayer) {
        map.removeLayer(layerState.battlesLayer);
        layerState.battlesLayer = null;
        layerState.isBattlesLayerVisible = false;
    } else {
        fetch(API_ENDPOINTS.battles)
            .then(response => response.json()) // Await the JSON parsing
            .then(data => {
                // Store all data for filtering
                layerState.allLayerData['battlesLayer'] = data;

                // Filter data based on selected year and month using battle-specific filter
                const filteredData = filterBattlesByDateRange(data, layerState.selectedYear, layerState.selectedMonth);

                const newLayer = L.layerGroup().addTo(map);
                filteredData.forEach(item => {
                    const icon = icons.battles || L.Icon.Default;
                    const marker = createMarker(item, icon, handleBattleMarkerClick);
                    if (marker) {
                        newLayer.addLayer(marker);
                    } else {
                        console.warn(`Skipping null marker for battle: ${item.name}`);
                    }
                });

                layerState.battlesLayer = newLayer;
                layerState.isBattlesLayerVisible = true;

                // Update the sidebar with default text
                loadDefaultText('assets/battles/battles.md');
            })
            .catch(error => console.error('Error fetching battles:', error));
    }
}

// Function to remove a layer from the map
export function removeLayer(layerName) {
    switch (layerName) {
        case 'Brigades':
            if (layerState.isBrigadesLayerVisible) {
                map.removeLayer(layerState.brigadesLayer);
                layerState.isBrigadesLayerVisible = false;
                layerState.brigadesLayer = null;
                // Hide Campaign button and remove campaign layer when brigades are hidden
                const campaignButton = document.getElementById('toggleCampaign');
                if (campaignButton) {
                    campaignButton.style.display = 'none';
                }
                if (layerState.isCampaignsLayerVisible && layerState.campaignsLayer) {
                    map.removeLayer(layerState.campaignsLayer);
                    layerState.campaignsLayer = null;
                    layerState.isCampaignsLayerVisible = false;
                }
                layerState.selectedBrigadeId = null;
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
    
    // Hide Campaign button for non-brigade markers
    const campaignButton = document.getElementById('toggleCampaign');
    if (campaignButton) {
        campaignButton.style.display = 'none';
    }
    // Remove campaign layer if visible
    if (layerState.isCampaignsLayerVisible && layerState.campaignsLayer) {
        map.removeLayer(layerState.campaignsLayer);
        layerState.campaignsLayer = null;
        layerState.isCampaignsLayerVisible = false;
    }
    layerState.selectedBrigadeId = null;
    
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

// Function to handle brigade marker clicks
export function handleBrigadeMarkerClick(marker, item) {
    console.log('Brigade marker clicked:', marker, item);
    
    // Store the selected brigade ID
    layerState.selectedBrigadeId = item.id;
    
    // Show the Campaign button
    const campaignButton = document.getElementById('toggleCampaign');
    if (campaignButton) {
        campaignButton.style.display = 'block';
    }
    
    // Call the regular handler for popup and sidebar
    handleMarkerClick(marker, item);
}

// Function to handle battle marker clicks
export function handleBattleMarkerClick(marker, item) {
    console.log('Battle marker clicked:', marker);
    const popupContent = generateBattlePopupContent({
        name: item.name,
        place: item.place,
        start_date: item.start_date,
        end_date: item.end_date,
        wikipedia_url: item.wikipedia_url
    });

    // Bind and open the popup
    marker.unbindPopup();
    marker.bindPopup(popupContent).openPopup();

    // Update the sidebar with the battle's description
    if (item.description) {
        updateSidebar(marked.parse(item.description));
    } else {
        updateSidebar('<p>No additional details available.</p>');
    }
}

// Function to show campaign markers for the selected brigade
export function showCampaigns() {
    const brigadeId = layerState.selectedBrigadeId;
    
    if (!brigadeId) {
        console.warn('No brigade selected');
        return;
    }
    
    // If campaigns are already visible, hide them
    if (layerState.isCampaignsLayerVisible && layerState.campaignsLayer) {
        map.removeLayer(layerState.campaignsLayer);
        layerState.campaignsLayer = null;
        layerState.isCampaignsLayerVisible = false;
        return;
    }
    
    // Fetch campaigns for the selected brigade
    fetch(`${API_ENDPOINTS.campaigns}/brigade/${brigadeId}`)
        .then(response => response.json())
        .then(data => {
            if (!data || data.length === 0) {
                updateSidebar('<p>No campaign data available for this brigade.</p>');
                return;
            }
            
            const newLayer = L.layerGroup().addTo(map);
            
            data.forEach(campaign => {
                if (!campaign.geo_location) {
                    console.warn(`Skipping campaign without location: ${campaign.place}`);
                    return;
                }
                
                // Parse the POINT geometry
                const [lng, lat] = campaign.geo_location.replace('POINT(', '').replace(')', '').split(' ');
                const marker = L.marker([lat, lng], { icon: icons.campaigns || L.Icon.Default });
                
                // Create tooltip with date and note
                let tooltipContent = '';
                if (campaign.date) {
                    tooltipContent += `<strong>${campaign.date}</strong><br>`;
                }
                if (campaign.note) {
                    tooltipContent += campaign.note;
                }
                
                if (tooltipContent) {
                    marker.bindTooltip(tooltipContent, {
                        permanent: false,
                        direction: 'right',
                        className: 'campaign-tooltip'
                    });
                }
                
                // Add popup with full details
                let popupContent = `<div class="popup-content">`;
                if (campaign.place) {
                    popupContent += `<h3>${campaign.place}</h3>`;
                }
                if (campaign.date) {
                    popupContent += `<p><strong>Date:</strong> ${campaign.date}</p>`;
                }
                if (campaign.operation) {
                    popupContent += `<p><strong>Operation:</strong> ${campaign.operation}</p>`;
                }
                if (campaign.division) {
                    popupContent += `<p><strong>Division:</strong> ${campaign.division}</p>`;
                }
                if (campaign.note) {
                    popupContent += `<p><strong>Note:</strong> ${campaign.note}</p>`;
                }
                popupContent += `</div>`;
                
                marker.bindPopup(popupContent);
                newLayer.addLayer(marker);
            });
            
            layerState.campaignsLayer = newLayer;
            layerState.isCampaignsLayerVisible = true;
            
            // Update sidebar
            let sidebarContent = `<h2>Campaign Movement</h2>`;
            sidebarContent += `<p>Showing ${data.length} campaign location(s)</p>`;
            sidebarContent += `<ul>`;
            data.forEach(campaign => {
                sidebarContent += `<li><strong>${campaign.date || 'Unknown date'}:</strong> ${campaign.place || 'Unknown location'}`;
                if (campaign.note) {
                    sidebarContent += ` - ${campaign.note}`;
                }
                sidebarContent += `</li>`;
            });
            sidebarContent += `</ul>`;
            updateSidebar(sidebarContent);
        })
        .catch(error => {
            console.error('Error fetching campaigns:', error);
            updateSidebar('<p>Error loading campaign data.</p>');
        });
}