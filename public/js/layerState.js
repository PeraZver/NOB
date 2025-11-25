/**
 * layerState.js - This file is part of the NOB web project.
 * 
 * Application state management for map layers. Maintains the visibility state,
 * layer references, filter selections, and cached data for all map layers.
 * 
 * Created: 11/2025
 * Authors: Pero & Github Copilot
 */

const layerState = {
    brigadesLayer: null,
    isBrigadesLayerVisible: false,
    detachmentLayer: null,
    isDetachmentLayerVisible: false,
    divisionLayer: null,
    isDivisionLayerVisible: false,
    corpsLayer: null,
    isCorpsLayerVisible: false,
    occupiedTerritoryLayer: null,
    isOccupiedTerritoryLayerVisible: false,
    battlesLayer: null,
    isBattlesLayerVisible: false,
    currentLayerName: null,
    selectedYear: null, // Track selected year filter
    selectedMonth: null, // Track selected month filter (1-12)
    allLayerData: {}, // Store all fetched data before filtering
};

export default layerState;