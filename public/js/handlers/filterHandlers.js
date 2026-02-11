/**
 * filterHandlers.js - This file is part of the NOB web project.
 * 
 * Event handlers for year and month filtering functionality. Now uses a timeline slider
 * instead of buttons for date-based filtering.
 * 
 * Created: 11/2025
 * Updated: 02/2026
 * Authors: Pero & GitHub Copilot
 */

import layerState from '../layerState.js';
import { refreshAllVisibleLayers } from '../map_layers.js';
import { toggleTimeline, resetTimeline, initializeTimeline } from './timelineSlider.js';

/**
 * Clear year and month filter
 */
export function clearYearFilter() {
    layerState.selectedYear = null;
    layerState.selectedMonth = null;
    resetTimeline();
}

/**
 * Handle calendar toggle button - now toggles timeline slider
 */
export function handleCalendarToggle() {
    const timelineContainer = document.getElementById('timelineContainer');
    const calendarButton = document.getElementById('toggleYearsMenu');
    
    if (!timelineContainer || !calendarButton) {
        return;
    }
    
    if (timelineContainer.classList.contains('visible')) {
        // Hide timeline
        toggleTimeline(false);
        
        // Clear year and month filters
        clearYearFilter();
        
        // Refresh all visible layers to remove filter
        refreshAllVisibleLayers();
    } else {
        // Show timeline
        toggleTimeline(true);
    }
}

/**
 * Initialize filter handlers - sets up timeline slider
 */
export function initializeFilterHandlers() {
    initializeTimeline();
}
