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
import { updateSidebar, loadDefaultText, hideMapInfoOverlay, showCampaignListPanel, hideCampaignListPanel } from './sidebar.js';
import layerState from './layerState.js';
import { createMarker } from './utils/markerUtils.js';
import { parsePoint } from './utils/geometryUtils.js';
import { filterDataByYear, filterBattlesByDateRange, filterCampaignsByDate } from './utils/filterUtils.js';
import { generatePopupContent, generateBattlePopupContent, generateCrimePopupContent } from './utils/popupUtils.js';
import { formatCampaignDate } from './utils/dateUtils.js';
import { catmullRomSpline } from './utils/splineUtils.js';
import { icons, OCCUPIED_TERRITORY_CONFIG, LAYER_MAPPING, API_ENDPOINTS } from './config.js';
import { updateLegend } from './legend.js';

const CAMPAIGN_LINE_COLORS = [
    '#e74c3c', '#2980b9', '#27ae60', '#f39c12', '#8e44ad', '#16a085', '#d35400', '#2c3e50'
];

const BATTLE_OVERLAYS_PATH = 'assets/battles/overlays.json';
const FREE_TERRITORIES_PATH = 'assets/territory/free-territories.json';

let campaignPanelCloseListenerBound = false;

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function ensureCampaignRootLayer() {
    if (!layerState.campaignsLayer) {
        layerState.campaignsLayer = L.layerGroup().addTo(map);
    }
    return layerState.campaignsLayer;
}

function getCampaignColor(brigadeId, preferredColor = null) {
    const key = String(brigadeId);
    if (preferredColor) {
        layerState.campaignColorByBrigade[key] = preferredColor;
        return preferredColor;
    }
    if (layerState.campaignColorByBrigade[key]) {
        return layerState.campaignColorByBrigade[key];
    }
    const color = CAMPAIGN_LINE_COLORS[layerState.campaignColorIndex % CAMPAIGN_LINE_COLORS.length];
    layerState.campaignColorIndex += 1;
    layerState.campaignColorByBrigade[key] = color;
    return color;
}

function ensureCampaignPanelCloseListener() {
    if (campaignPanelCloseListenerBound) {
        return;
    }
    document.addEventListener('campaignListPanelCloseRequested', (event) => {
        const brigadeId = event?.detail?.brigadeId;
        if (brigadeId == null) {
            return;
        }
        removeCampaignForBrigade(brigadeId);
    });
    campaignPanelCloseListenerBound = true;
}

function ensureCampaignMovementLegend() {
    let legend = document.getElementById('campaignMovementLegend');
    if (legend) {
        return legend;
    }

    const mapEl = document.getElementById('map');
    if (!mapEl) {
        return null;
    }

    legend = document.createElement('div');
    legend.id = 'campaignMovementLegend';
    legend.className = 'campaign-movement-legend hidden';
    legend.innerHTML = `
        <div class="campaign-movement-legend-header">
            <span class="campaign-movement-legend-title">Visible Brigade Movements</span>
            <button class="campaign-movement-legend-close" title="Clear all visible movement lines">x</button>
        </div>
        <div class="campaign-movement-legend-items"></div>
    `;

    const closeBtn = legend.querySelector('.campaign-movement-legend-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            clearAllCampaignMovements();
        });
    }

    mapEl.appendChild(legend);
    return legend;
}

function updateCampaignMovementLegend() {
    const legend = ensureCampaignMovementLegend();
    if (!legend) {
        return;
    }

    const entries = Object.values(layerState.visibleCampaignBrigades || {});
    if (entries.length === 0) {
        legend.classList.add('hidden');
        return;
    }

    const itemsEl = legend.querySelector('.campaign-movement-legend-items');
    itemsEl.innerHTML = entries.map(entry => {
        const safeName = escapeHtml(entry.brigadeName || `Brigade ${entry.brigadeId}`);
        const safeColor = escapeHtml(entry.color || '#e74c3c');
        return `
            <div class="campaign-movement-legend-item">
                <span class="campaign-movement-legend-swatch" style="border-top-color:${safeColor}"></span>
                <span>${safeName}</span>
            </div>
        `;
    }).join('');

    legend.classList.remove('hidden');
}

function removeCampaignForBrigade(brigadeId) {
    const key = String(brigadeId);
    const active = layerState.visibleCampaignBrigades[key];
    if (!active) {
        return;
    }

    if (layerState.campaignsLayer && active.layer) {
        layerState.campaignsLayer.removeLayer(active.layer);
    }

    hideCampaignListPanel(key);
    delete layerState.visibleCampaignBrigades[key];

    if (Object.keys(layerState.visibleCampaignBrigades).length === 0) {
        if (layerState.campaignsLayer) {
            map.removeLayer(layerState.campaignsLayer);
        }
        layerState.campaignsLayer = null;
        layerState.isCampaignsLayerVisible = false;
    }

    updateCampaignMovementLegend();
}

function clearAllCampaignMovements() {
    if (layerState.campaignsLayer) {
        map.removeLayer(layerState.campaignsLayer);
    }
    layerState.campaignsLayer = null;
    layerState.isCampaignsLayerVisible = false;
    layerState.visibleCampaignBrigades = {};
    hideCampaignListPanel();
    updateCampaignMovementLegend();
}

function clearActiveBattleOverlay() {
    if (layerState.activeBattleOverlayLayer) {
        map.removeLayer(layerState.activeBattleOverlayLayer);
        layerState.activeBattleOverlayLayer = null;
    }
    layerState.activeBattleOverlayBattleId = null;
}

function clearActiveFreeTerritories() {
    if (layerState.freeTerritoryLayer) {
        map.removeLayer(layerState.freeTerritoryLayer);
        layerState.freeTerritoryLayer = null;
    }
}

async function ensureBattleOverlayConfigIndex() {
    if (layerState.battleOverlayConfigIndex) {
        return layerState.battleOverlayConfigIndex;
    }

    if (layerState.battleOverlayConfigLoadAttempted) {
        return null;
    }

    layerState.battleOverlayConfigLoadAttempted = true;

    try {
        const response = await fetch(BATTLE_OVERLAYS_PATH);
        if (!response.ok) {
            console.warn(`Could not load battle overlays config from ${BATTLE_OVERLAYS_PATH}.`);
            return null;
        }

        const payload = await response.json();
        const overlayList = Array.isArray(payload) ? payload : payload.overlays;
        if (!Array.isArray(overlayList)) {
            console.warn('Battle overlays config has invalid format. Expected array or { overlays: [] }.');
            return null;
        }

        const index = {};
        overlayList.forEach((entry) => {
            if (!entry || entry.battleId == null || !entry.imageUrl || !Array.isArray(entry.imageBounds)) {
                return;
            }
            index[String(entry.battleId)] = entry;
        });

        layerState.battleOverlayConfigIndex = index;
        return index;
    } catch (error) {
        console.error('Failed to load battle overlays config:', error);
        return null;
    }
}

async function ensureFreeTerritoryOverlayConfigIndex() {
    if (layerState.freeTerritoryOverlayConfigIndex) {
        return layerState.freeTerritoryOverlayConfigIndex;
    }

    if (layerState.freeTerritoryOverlayConfigLoadAttempted) {
        return null;
    }

    layerState.freeTerritoryOverlayConfigLoadAttempted = true;

    try {
        const response = await fetch(FREE_TERRITORIES_PATH);
        if (!response.ok) {
            console.warn(`Could not load free territories config from ${FREE_TERRITORIES_PATH}.`);
            return null;
        }

        const payload = await response.json();
        const overlayList = Array.isArray(payload) ? payload : payload.overlays;
        if (!Array.isArray(overlayList)) {
            console.warn('Free territories config has invalid format. Expected array or { overlays: [] }.');
            return null;
        }

        const index = {};
        overlayList.forEach((entry) => {
            if (!entry || !entry.imageUrl || !Array.isArray(entry.imageBounds)) {
                return;
            }
            index[String(entry.id || entry.name || entry.imageUrl)] = entry;
        });

        layerState.freeTerritoryOverlayConfigIndex = index;
        return index;
    } catch (error) {
        console.error('Failed to load free territories config:', error);
        return null;
    }
}

function compareYearMonth(left, right) {
    if (!left || !right) {
        return 0;
    }

    if (left.year !== right.year) {
        return left.year - right.year;
    }

    return left.month - right.month;
}

function isWithinTimelineWindow(target, start, end) {
    return compareYearMonth(target, start) >= 0 && compareYearMonth(target, end) <= 0;
}

function getCurrentTimelineEnd() {
    if (layerState.selectedYearEnd == null || layerState.selectedMonthEnd == null) {
        return null;
    }

    return {
        year: layerState.selectedYearEnd,
        month: layerState.selectedMonthEnd
    };
}

function applyFreeTerritoryOverlayFilter(overlay, contrast = 1) {
    const normalizedContrast = Number.isFinite(Number(contrast)) ? Number(contrast) : 1;

    const applyToElement = () => {
        const imageElement = overlay.getElement();
        if (imageElement) {
            imageElement.style.filter = `contrast(${normalizedContrast.toFixed(2)})`;
        }
    };

    applyToElement();
    overlay.on('load', applyToElement);
}

export async function refreshFreeTerritoryOverlays() {
    clearActiveFreeTerritories();

    if (!layerState.isFreeTerritoriesLayerVisible) {
        return;
    }

    const timelineEnd = getCurrentTimelineEnd();
    if (!timelineEnd) {
        return;
    }

    const overlayIndex = await ensureFreeTerritoryOverlayConfigIndex();
    if (!overlayIndex) {
        return;
    }

    const activeOverlays = Object.values(overlayIndex).filter((entry) => {
        const start = entry.visibleFrom || entry.displayFrom || entry.start;
        const end = entry.visibleTo || entry.displayTo || entry.end;

        if (!start || !end) {
            return true;
        }

        return isWithinTimelineWindow(timelineEnd, start, end);
    });

    if (activeOverlays.length === 0) {
        return;
    }

    layerState.freeTerritoryLayer = L.layerGroup().addTo(map);

    activeOverlays.forEach((config) => {
        const overlay = L.imageOverlay(config.imageUrl, config.imageBounds, {
            opacity: Number(config.opacity ?? 0.5),
            interactive: false,
            zIndex: Number(config.zIndex ?? 10)
        });

        applyFreeTerritoryOverlayFilter(overlay, config.contrast ?? 1);
        layerState.freeTerritoryLayer.addLayer(overlay);
    });
}

function applyBattleOverlayFilter(overlay, contrast = 1) {
    const normalizedContrast = Number.isFinite(Number(contrast)) ? Number(contrast) : 1;

    const applyToElement = () => {
        const imageElement = overlay.getElement();
        if (imageElement) {
            imageElement.style.filter = `contrast(${normalizedContrast.toFixed(2)})`;
        }
    };

    applyToElement();
    overlay.on('load', applyToElement);
}

async function showBattleOverlayForItem(item) {
    clearActiveBattleOverlay();

    if (!item || item.id == null) {
        return;
    }

    const overlayIndex = await ensureBattleOverlayConfigIndex();
    if (!overlayIndex) {
        return;
    }

    const config = overlayIndex[String(item.id)];
    if (!config) {
        return;
    }

    const overlay = L.imageOverlay(config.imageUrl, config.imageBounds, {
        opacity: Number(config.opacity ?? 0.75),
        interactive: false,
        zIndex: Number(config.zIndex ?? 220)
    }).addTo(map);

    applyBattleOverlayFilter(overlay, config.contrast ?? 1);

    layerState.activeBattleOverlayLayer = overlay;
    layerState.activeBattleOverlayBattleId = item.id;
}

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

export function showFreeTerritories() {
    if (layerState.isFreeTerritoriesLayerVisible) {
        clearActiveFreeTerritories();
        layerState.isFreeTerritoriesLayerVisible = false;
        return;
    }

    layerState.isFreeTerritoriesLayerVisible = true;
    loadDefaultText('assets/territory/free-territories.md');
    refreshFreeTerritoryOverlays();
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
        updateLegend();
    } else {
        fetch(apiEndpoint)
            .then(response => response.json())
            .then(data => {
                // Store all data for filtering
                layerState.allLayerData[layerName] = data;
                
                // Filter data based on selected year/month range
                const filteredData = filterDataByYear(
                    data, 
                    layerState.selectedYear, 
                    layerState.selectedMonth,
                    layerState.selectedYearStart,
                    layerState.selectedMonthStart,
                    layerState.selectedYearEnd,
                    layerState.selectedMonthEnd
                );
                
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
                updateLegend();

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
    // Handle campaigns separately since they're stored per brigade and can be visible simultaneously
    if (layerState.isCampaignsLayerVisible) {
        const activeCampaigns = Object.values(layerState.visibleCampaignBrigades || {});
        if (activeCampaigns.length > 0) {
            if (layerState.campaignsLayer) {
                map.removeLayer(layerState.campaignsLayer);
            }
            layerState.campaignsLayer = null;
            hideCampaignListPanel();

            const nextActive = [...activeCampaigns];
            layerState.visibleCampaignBrigades = {};

            nextActive.forEach(entry => {
                const data = layerState.allLayerData.campaigns?.[entry.brigadeId];
                if (data && data.length > 0) {
                    renderCampaigns(data, entry.brigadeId, entry.brigadeName, { color: entry.color });
                }
            });

            layerState.isCampaignsLayerVisible = Object.keys(layerState.visibleCampaignBrigades).length > 0;
            updateCampaignMovementLegend();
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
                filteredData = filterBattlesByDateRange(
                    storedData, 
                    layerState.selectedYear, 
                    layerState.selectedMonth,
                    layerState.selectedYearStart,
                    layerState.selectedMonthStart,
                    layerState.selectedYearEnd,
                    layerState.selectedMonthEnd
                );
            } else {
                filteredData = filterDataByYear(
                    storedData, 
                    layerState.selectedYear, 
                    layerState.selectedMonth,
                    layerState.selectedYearStart,
                    layerState.selectedMonthStart,
                    layerState.selectedYearEnd,
                    layerState.selectedMonthEnd
                );
            }
            
            // Apply crimes-specific perpetrator filter
            if (layerInfo.layerName === 'crimesLayer') {
                filteredData = filteredData.filter(item => item.perpetrator === 'Partisans');
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
    updateLegend();
}

// Function to show/hide battles on the map
export function showBattles() {
    if (layerState.isBattlesLayerVisible && layerState.battlesLayer) {
        map.removeLayer(layerState.battlesLayer);
        layerState.battlesLayer = null;
        layerState.isBattlesLayerVisible = false;
        clearActiveBattleOverlay();
        updateLegend();
    } else {
        fetch(API_ENDPOINTS.battles)
            .then(response => response.json()) // Await the JSON parsing
            .then(data => {
                // Store all data for filtering
                layerState.allLayerData['battlesLayer'] = data;

                // Filter data based on selected year/month range using battle-specific filter
                const filteredData = filterBattlesByDateRange(
                    data, 
                    layerState.selectedYear, 
                    layerState.selectedMonth,
                    layerState.selectedYearStart,
                    layerState.selectedMonthStart,
                    layerState.selectedYearEnd,
                    layerState.selectedMonthEnd
                );

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
                updateLegend();

                // Update the sidebar with default text
                loadDefaultText('assets/battles/battles.md');
            })
            .catch(error => console.error('Error fetching battles:', error));
    }
}

// Function to show/hide crimes on the map
export function showCrimes() {
    if (layerState.isCrimesLayerVisible && layerState.crimesLayer) {
        map.removeLayer(layerState.crimesLayer);
        layerState.crimesLayer = null;
        layerState.isCrimesLayerVisible = false;
        updateLegend();
    } else {
        fetch(API_ENDPOINTS.crimes)
            .then(response => response.json())
            .then(data => {
                // Store all data for filtering
                layerState.allLayerData['crimesLayer'] = data;

                // Filter data based on selected year/month range using date range filter
                const filteredData = filterBattlesByDateRange(
                    data, 
                    layerState.selectedYear, 
                    layerState.selectedMonth,
                    layerState.selectedYearStart,
                    layerState.selectedMonthStart,
                    layerState.selectedYearEnd,
                    layerState.selectedMonthEnd
                );

                // Filter to only show crimes where perpetrator is Partisans
                const partisanCrimes = filteredData.filter(item => item.perpetrator === 'Partisans');

                const newLayer = L.layerGroup().addTo(map);
                partisanCrimes.forEach(item => {
                    const icon = icons.crimes || L.Icon.Default;
                    const marker = createMarker(item, icon, handleCrimeMarkerClick);
                    if (marker) {
                        newLayer.addLayer(marker);
                    } else {
                        console.warn(`Skipping null marker for crime: ${item.site}`);
                    }
                });

                layerState.crimesLayer = newLayer;
                layerState.isCrimesLayerVisible = true;
                updateLegend();

                // Update the sidebar with default text
                loadDefaultText('assets/crimes/crimes.md');
            })
            .catch(error => console.error('Error fetching crimes:', error));
    }
}

// Function to show only brigades that have campaign data (Movement button)
export function showBrigadesWithCampaigns() {
    // Close sidebar if it was showing something else
    const sidebar = document.getElementById('sidebar');
    const content = document.getElementById('content');
    
    // If brigades with campaigns are already visible, toggle them off
    if (layerState.isBrigadesLayerVisible && layerState.brigadesLayer) {
        map.removeLayer(layerState.brigadesLayer);
        layerState.brigadesLayer = null;
        layerState.isBrigadesLayerVisible = false;
        clearAllCampaignMovements();
        updateLegend();
        
        // Hide sidebar
        sidebar.classList.remove('visible');
        content.classList.remove('visible');
        hideMapInfoOverlay();
        
        // Hide Campaign button
        const campaignButton = document.getElementById('toggleCampaign');
        if (campaignButton) {
            campaignButton.style.display = 'none';
        }
        layerState.selectedBrigadeId = null;
        return;
    }
    
    // Fetch brigades data
    fetch(API_ENDPOINTS.brigades)
        .then(response => response.json())
        .then(data => {
            // Filter to only brigades with campaigns
            const brigadesWithCampaigns = data.filter(brigade => brigade.has_campaigns);
            
            // Store all data for filtering
            layerState.allLayerData['brigadesLayer'] = brigadesWithCampaigns;
            
            // Filter data based on selected year/month range
            const filteredData = filterDataByYear(
                brigadesWithCampaigns, 
                layerState.selectedYear, 
                layerState.selectedMonth,
                layerState.selectedYearStart,
                layerState.selectedMonthStart,
                layerState.selectedYearEnd,
                layerState.selectedMonthEnd
            );
            
            const newLayer = L.layerGroup().addTo(map);
            filteredData.forEach(item => {
                const icon = icons.brigades || L.Icon.Default;
                const marker = createMarker(item, icon, handleBrigadeMarkerClick);
                if (marker) {
                    newLayer.addLayer(marker);
                } else {
                    console.warn(`Skipping null marker for brigade: ${item.name}`);
                }
            });

            layerState.brigadesLayer = newLayer;
            layerState.isBrigadesLayerVisible = true;
            layerState.currentLayerName = 'Brigades';
            updateLegend();

            // Show sidebar
            sidebar.classList.add('visible');
            content.classList.add('visible');
            
            // Update the sidebar with info about Movement layer
            updateSidebar(`
                <h1>Brigade Movements</h1>
                <p>This layer shows brigades that have documented campaign movements.</p>
                <p>Click on a brigade marker to see details. If the brigade has campaign data, a campaign trail button will appear.</p>
                <p><strong>Showing ${filteredData.length} brigade(s) with movement data.</strong></p>
            `);
                // Load default markdown for brigades layer
                loadDefaultText('assets/brigades/brigades.md');
        })
        .catch(error => console.error('Error fetching brigades with campaigns:', error));
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
                clearAllCampaignMovements();
                layerState.selectedBrigadeId = null;
                updateLegend();
            }
            break;
        case 'Detachments':
            if (layerState.isDetachmentLayerVisible) {
                map.removeLayer(layerState.detachmentLayer);
                layerState.isDetachmentLayerVisible = false;
                layerState.detachmentLayer = null;
                updateLegend();
            }
            break;
        case 'Divisions':
            if (layerState.isDivisionLayerVisible) {
                map.removeLayer(layerState.divisionLayer);
                layerState.isDivisionLayerVisible = false;
                layerState.divisionLayer = null;
                updateLegend();
            }
            break;
        case 'Corps':
            if (layerState.isCorpsLayerVisible) {
                map.removeLayer(layerState.corpsLayer);
                layerState.isCorpsLayerVisible = false;
                layerState.corpsLayer = null;
                updateLegend();
            }
            break;
        case 'Occupied Territory':
            if (layerState.isOccupiedTerritoryLayerVisible) {
                map.removeLayer(layerState.occupiedTerritoryLayer);
                layerState.isOccupiedTerritoryLayerVisible = false;
                layerState.occupiedTerritoryLayer = null;
            }
            break;
        case 'Free Territories':
            if (layerState.isFreeTerritoriesLayerVisible) {
                clearActiveFreeTerritories();
                layerState.isFreeTerritoriesLayerVisible = false;
            }
            break;
        case 'Battles':
            if (layerState.isBattlesLayerVisible) {
                map.removeLayer(layerState.battlesLayer);
                layerState.isBattlesLayerVisible = false;
                layerState.battlesLayer = null;
                clearActiveBattleOverlay();
                updateLegend();
            }
            break;
        case 'Crimes':
            if (layerState.isCrimesLayerVisible) {
                map.removeLayer(layerState.crimesLayer);
                layerState.isCrimesLayerVisible = false;
                layerState.crimesLayer = null;
                updateLegend();
            }
            break;
        default:
            console.warn(`Unknown layer: ${layerName}`);
    }
}

// Function to handle marker clicks
export function handleMarkerClick(marker, item) {
    console.log('Marker in handleMarkerClick:', marker);
    clearActiveBattleOverlay();
    
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
    clearActiveBattleOverlay();
    
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
    
    // If this brigade has campaign data, add its trail + list without clearing existing brigades.
    if (item.has_campaigns) {
        showCampaigns({ toggleIfVisible: false, brigadeName: item.name });
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
    showBattleOverlayForItem(item);
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

// Handle crime marker click
export function handleCrimeMarkerClick(marker, item) {
    console.log('Crime marker clicked:', marker);
    clearActiveBattleOverlay();
    const popupContent = generateCrimePopupContent({
        site: item.site,
        start_date: item.start_date,
        end_date: item.end_date,
        deaths: item.deaths,
        wikipedia_url: item.wikipedia_url
    });

    // Bind and open the popup
    marker.unbindPopup();
    marker.bindPopup(popupContent).openPopup();

    // Update the sidebar with the crime's description
    if (item.description) {
        updateSidebar(marked.parse(item.description));
    } else {
        updateSidebar('<p>No additional details available.</p>');
    }
}


// Function to show campaign markers for the selected brigade
export function showCampaigns(options = {}) {
    const { toggleIfVisible = true, brigadeName = null } = options;
    const brigadeId = layerState.selectedBrigadeId;
    const brigadeKey = String(brigadeId);
    
    if (!brigadeId) {
        console.warn('No brigade selected');
        return;
    }

    ensureCampaignPanelCloseListener();

    // Toggle only the selected brigade's campaigns, leaving other brigades visible.
    if (layerState.visibleCampaignBrigades[brigadeKey]) {
        if (toggleIfVisible) {
            removeCampaignForBrigade(brigadeKey);
        }
        return;
    }
    
    // Check if we have stored campaign data for this brigade
    if (layerState.allLayerData.campaigns && layerState.allLayerData.campaigns[brigadeId]) {
        // Use stored data and apply filtering
        renderCampaigns(layerState.allLayerData.campaigns[brigadeId], brigadeId, brigadeName);
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
            renderCampaigns(data, brigadeId, brigadeName);
        })
        .catch(error => {
            console.error('Error fetching campaigns:', error);
            updateSidebar('<p>Error loading campaign data.</p>');
        });
}

/**
 * Render campaign markers and path on the map (with optional date filtering).
 * Supports multiple brigades visible at the same time.
 * @param {Array} data - Campaign data
 * @param {number|string} brigadeId - Brigade ID
 * @param {string|null} brigadeName - Brigade display name
 * @param {Object} options - Optional rendering settings
 */
function renderCampaigns(data, brigadeId, brigadeName = null, options = {}) {
    const brigadeKey = String(brigadeId);
    const color = getCampaignColor(brigadeKey, options.color || null);
    const resolvedBrigadeName = brigadeName || layerState.visibleCampaignBrigades[brigadeKey]?.brigadeName || `Brigade ${brigadeId}`;

    // Apply date filter if selected
    const filteredData = filterCampaignsByDate(
        data, 
        layerState.selectedYear, 
        layerState.selectedMonth,
        layerState.selectedYearStart,
        layerState.selectedMonthStart,
        layerState.selectedYearEnd,
        layerState.selectedMonthEnd
    );
    
    if (filteredData.length === 0) {
        removeCampaignForBrigade(brigadeKey);
        updateSidebar(`<p>No campaign data available for ${resolvedBrigadeName} in the selected time period.</p>`);
        return;
    }
    
    const rootLayer = ensureCampaignRootLayer();
    const brigadeLayer = L.layerGroup();
    
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
            color,
            weight: 4,
            opacity: 0.75,
            dashArray: '5, 10',
            lineJoin: 'round',
            lineCap: 'round'
        });
        
        // Add the line to the layer first (so markers appear on top)
        brigadeLayer.addLayer(campaignPath);
        
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
                            color,
                            opacity: 0.8
                        }
                    })
                }
            ]
        });
        
        brigadeLayer.addLayer(decorator);
    }
    
    // Track if first marker has been added (formation site)
    let firstMarkerAdded = false;
    
    // Collect list items for the campaign panel
    const campaignListItems = [];
    
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
        
        // First marker (formation site) is slightly larger for readability.
        if (!firstMarkerAdded) {
            marker = L.circleMarker([coords.lat, coords.lng], {
                radius: 8,
                fillColor: color,
                color: '#ffffff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.95
            });
            firstMarkerAdded = true;
        } else {
            // Regular campaign markers.
            marker = L.circleMarker([coords.lat, coords.lng], {
                radius: 6,
                fillColor: color,
                color,
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
        
        brigadeLayer.addLayer(marker);

        // Collect item for the right-side campaign list panel
        const itemCoords = [coords.lat, coords.lng];
        const itemMarker = marker;
        campaignListItems.push({
            dateStr: campaign.date ? formatCampaignDate(campaign.date) : '',
            place: campaign.place || 'Unknown location',
            operation: campaign.operation || '',
            onSelect() {
                const popup = itemMarker.getPopup();
                if (popup) { popup.options.autoPan = false; }
                itemMarker.openPopup();
                const targetZoom = Math.max(map.getZoom(), 9);
                map.flyTo(L.latLng(itemCoords[0], itemCoords[1]), targetZoom, { animate: true });
            }
        });
    });
    
    rootLayer.addLayer(brigadeLayer);
    layerState.visibleCampaignBrigades[brigadeKey] = {
        brigadeId: brigadeKey,
        brigadeName: resolvedBrigadeName,
        color,
        layer: brigadeLayer
    };
    layerState.isCampaignsLayerVisible = true;
    
    // Build panel title with optional date filter note.
    let panelTitle = resolvedBrigadeName;
    if (layerState.selectedYear) {
        panelTitle += ` · up to ${layerState.selectedMonth ?
            `${getMonthName(layerState.selectedMonth)} ` : ''}${layerState.selectedYear}`;
    }

    // Show one panel per brigade on the right edge of the map.
    showCampaignListPanel(campaignListItems, panelTitle, {
        brigadeId: brigadeKey,
        color
    });

    updateCampaignMovementLegend();
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
