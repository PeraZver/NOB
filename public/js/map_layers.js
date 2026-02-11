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
import { parsePoint } from './utils/geometryUtils.js';
import { filterDataByYear, filterBattlesByDateRange, filterCampaignsByDate } from './utils/filterUtils.js';
import { generatePopupContent, generateBattlePopupContent } from './utils/popupUtils.js';
import { formatCampaignDate } from './utils/dateUtils.js';
import { catmullRomSpline } from './utils/splineUtils.js';
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
    // Handle campaigns separately since they're stored per brigade
    if (layerState.isCampaignsLayerVisible && layerState.selectedBrigadeId) {
        const brigadeId = layerState.selectedBrigadeId;
        if (layerState.allLayerData.campaigns && layerState.allLayerData.campaigns[brigadeId]) {
            // Remove existing campaign layer
            if (layerState.campaignsLayer) {
                map.removeLayer(layerState.campaignsLayer);
            }
            // Re-render campaigns with current filter
            renderCampaigns(layerState.allLayerData.campaigns[brigadeId], brigadeId);
        }
    }
    
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
    
    // Only hide Campaign button and remove campaign layer if campaign markers are NOT visible
    if (!layerState.isCampaignsLayerVisible) {
        const campaignButton = document.getElementById('toggleCampaign');
        if (campaignButton) {
            campaignButton.style.display = 'none';
        }
        layerState.selectedBrigadeId = null;
    }
    // If campaign markers ARE visible, clicking on non-brigade markers has no effect on them
    
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
    
    // Show the Campaign button only if this brigade has campaign data
    const campaignButton = document.getElementById('toggleCampaign');
    if (campaignButton) {
        if (item.has_campaigns) {
            campaignButton.style.display = 'block';
        } else {
            campaignButton.style.display = 'none';
        }
    }
    
    // Remove campaign layer if visible (but keep the button visible if has_campaigns)
    if (layerState.isCampaignsLayerVisible && layerState.campaignsLayer) {
        map.removeLayer(layerState.campaignsLayer);
        layerState.campaignsLayer = null;
        layerState.isCampaignsLayerVisible = false;
    }
    
    // Show popup and update sidebar (same as handleMarkerClick but without hiding the button)
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
    
    // Check if we have stored campaign data for this brigade
    if (layerState.allLayerData.campaigns && layerState.allLayerData.campaigns[brigadeId]) {
        // Use stored data and apply filtering
        renderCampaigns(layerState.allLayerData.campaigns[brigadeId], brigadeId);
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
            
            // Store the fetched data for future use
            if (!layerState.allLayerData.campaigns) {
                layerState.allLayerData.campaigns = {};
            }
            layerState.allLayerData.campaigns[brigadeId] = data;
            
            // Render the campaigns with filtering
            renderCampaigns(data, brigadeId);
        })
        .catch(error => {
            console.error('Error fetching campaigns:', error);
            updateSidebar('<p>Error loading campaign data.</p>');
        });
}

/**
 * Render campaign markers and path on the map (with optional date filtering)
 * @param {Array} data - Campaign data
 * @param {number} brigadeId - Brigade ID
 */
function renderCampaigns(data, brigadeId) {
    // Apply date filter if selected
    const filteredData = filterCampaignsByDate(data, layerState.selectedYear, layerState.selectedMonth);
    
    if (filteredData.length === 0) {
        updateSidebar('<p>No campaign data available for the selected time period.</p>');
        return;
    }
    
    const newLayer = L.layerGroup().addTo(map);
    
    // Create chronological line connecting campaign markers
    // Extract coordinates from campaigns with valid locations (data is already sorted by date ASC)
    const pathCoords = [];
    filteredData.forEach(campaign => {
        if (campaign.geo_location) {
            const coords = parsePoint(campaign.geo_location);
            if (coords) {
                pathCoords.push([coords.lat, coords.lng]);
            }
        }
    });
    
    // Create polyline if we have at least 2 points
    if (pathCoords.length >= 2) {
        // Apply Catmull-Rom spline smoothing for smoother curves
        const smoothedCoords = catmullRomSpline(pathCoords, 0.85, 5);
        
        const campaignPath = L.polyline(smoothedCoords, {
            color: '#e74c3c',
            weight: 4,
            opacity: 0.6,
            dashArray: '5, 10',
            lineJoin: 'round',
            lineCap: 'round'
        });
        
        // Add the line to the layer first (so markers appear on top)
        newLayer.addLayer(campaignPath);
        
        // Add arrow decorators to show direction of movement
        const decorator = L.polylineDecorator(campaignPath, {
            patterns: [
                {
                    offset: '10%',
                    repeat: 100,
                    symbol: L.Symbol.arrowHead({
                        pixelSize: 12,
                        polygon: false,
                        pathOptions: {
                            stroke: true,
                            weight: 3,
                            color: '#c0392b',
                            opacity: 0.8
                        }
                    })
                }
            ]
        });
        
        newLayer.addLayer(decorator);
    }
    
    // Track if first marker has been added (formation site)
    let firstMarkerAdded = false;
    
    filteredData.forEach(campaign => {
        if (!campaign.geo_location) {
            console.warn(`Skipping campaign without location: ${campaign.place}`);
            return;
        }
        
        // Parse the POINT geometry
        const coords = parsePoint(campaign.geo_location);
        if (!coords) {
            console.warn(`Skipping campaign with invalid location: ${campaign.place}`);
            return;
        }
        
        let marker;
        
        // First marker (formation site) - use red star icon
        if (!firstMarkerAdded) {
            // Create an icon marker using red-star.png
            const starIcon = L.icon({
                iconUrl: 'assets/icons/red-star.png',
                iconSize: [24, 24],
                iconAnchor: [12, 12],
                popupAnchor: [0, -12]
            });
            marker = L.marker([coords.lat, coords.lng], {
                icon: starIcon
            });
            firstMarkerAdded = true;
        } else {
            // Regular campaign markers - use circle
            marker = L.circleMarker([coords.lat, coords.lng], {
                radius: 6,
                fillColor: '#e74c3c',
                color: '#c0392b',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            });
        }
        
        // Create tooltip with date and operation
        let tooltipContent = '';
        if (campaign.date) {
            tooltipContent += `<strong>${formatCampaignDate(campaign.date)}</strong><br>`;
        }
        if (campaign.operation) {
            tooltipContent += campaign.operation;
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
            popupContent += `<p><strong>Date:</strong> ${formatCampaignDate(campaign.date)}</p>`;
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
        
        // Add click event to hide brigade markers when campaign marker is clicked
        marker.on('click', function() {
            if (layerState.brigadesLayer && layerState.isBrigadesLayerVisible) {
                map.removeLayer(layerState.brigadesLayer);
                // Store that brigades were hidden by campaign click (not removed completely)
                layerState.brigadesLayerTemporarilyHidden = true;
            }
        });
        
        newLayer.addLayer(marker);
    });
    
    layerState.campaignsLayer = newLayer;
    layerState.isCampaignsLayerVisible = true;
    
    // Update sidebar
    let sidebarContent = `<h2>Campaign Movement</h2>`;
    if (layerState.selectedYear) {
        sidebarContent += `<p><em>Filtered to ${layerState.selectedMonth ? 
            `${getMonthName(layerState.selectedMonth)} ` : ''}${layerState.selectedYear} and earlier</em></p>`;
    }
    sidebarContent += `<p>Showing ${filteredData.length} campaign location(s)</p>`;
    sidebarContent += `<ul>`;
    filteredData.forEach(campaign => {
        sidebarContent += `<li><strong>${formatCampaignDate(campaign.date)}:</strong> ${campaign.place || 'Unknown location'}`;
        if (campaign.operation) {
            sidebarContent += ` - ${campaign.operation}`;
        }
        sidebarContent += `</li>`;
    });
    sidebarContent += `</ul>`;
    updateSidebar(sidebarContent);
}

/**
 * Get month name from month number
 * @param {number} month - Month number (1-12)
 * @returns {string} Month name
 */
function getMonthName(month) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month - 1] || '';
}

/**
 * Initialize test mode for quick testing of campaign trails
 * Usage: Add ?testBrigade=3 to the URL to automatically load campaigns for brigade with id=3
 * Example: http://localhost:3000/?testBrigade=3
 */
export function initTestMode() {
    // Check for testBrigade parameter in URL
    const params = new URLSearchParams(window.location.search);
    const testBrigadeId = params.get('testBrigade');
    
    if (testBrigadeId) {
        console.log(`🧪 TEST MODE: Loading campaign trail for brigade ${testBrigadeId}`);
        
        // Wait for map to be fully loaded, then trigger campaigns
        const checkInterval = setInterval(() => {
            if (map && map._loaded) {
                clearInterval(checkInterval);
                
                // Set the selected brigade ID
                layerState.selectedBrigadeId = parseInt(testBrigadeId);
                
                // Show the campaigns
                showCampaigns();
                
                console.log(`✅ TEST MODE: Campaign trail loaded for brigade ${testBrigadeId}`);
            }
        }, 100);
        
        // Timeout after 5 seconds
        setTimeout(() => clearInterval(checkInterval), 5000);
    }
}
