/**
 * timelineSlider.js - Timeline slider functionality for NOB project
 * 
 * Handles the timeline slider UI component that allows users to filter events
 * by date from April 1941 to May 1945. The slider has 50 discrete positions
 * representing each month in this time period.
 * 
 * Created: 02/2026
 * Authors: GitHub Copilot
 */

import layerState from '../layerState.js';
import { refreshAllVisibleLayers } from '../map_layers.js';

// Timeline data structure: April 1941 to May 1945 (50 months)
const TIMELINE_DATA = [];

// Tooltip timeout handle
let tooltipTimeout = null;

// Populate timeline data
for (let year = 1941; year <= 1945; year++) {
    const startMonth = (year === 1941) ? 4 : 1;
    const endMonth = (year === 1945) ? 5 : 12;
    
    for (let month = startMonth; month <= endMonth; month++) {
        TIMELINE_DATA.push({ year, month });
    }
}

/**
 * Initialize timeline slider - generate ticks and set up event handlers
 */
export function initializeTimeline() {
    const ticksContainer = document.getElementById('timelineTicks');
    const slider = document.getElementById('timelineSlider');
    
    if (!ticksContainer || !slider) {
        console.error('Timeline elements not found');
        return;
    }
    
    // Generate ticks
    generateTicks(ticksContainer);
    
    // Set up slider event handlers
    slider.addEventListener('input', handleSliderChange);
    slider.addEventListener('change', handleSliderChange); // For when user releases the slider
    slider.addEventListener('mousemove', handleSliderHover);
    slider.addEventListener('mouseenter', handleSliderHover);
    slider.addEventListener('mouseleave', hideTooltip);
}

/**
 * Generate tick marks for the timeline
 * @param {HTMLElement} container - Container element for ticks
 */
function generateTicks(container) {
    container.innerHTML = ''; // Clear existing ticks
    
    TIMELINE_DATA.forEach((data, index) => {
        const tick = document.createElement('div');
        tick.className = 'timeline-tick';
        
        // Mark first and last ticks
        if (index === 0) {
            tick.classList.add('first');
        } else if (index === TIMELINE_DATA.length - 1) {
            tick.classList.add('last');
        } else if (data.month === 1) {
            // Mark January ticks
            tick.classList.add('january');
        }
        
        container.appendChild(tick);
    });
}

/**
 * Handle slider value change
 * @param {Event} event - Input event from slider
 */
function handleSliderChange(event) {
    const sliderValue = parseInt(event.target.value);
    
    // Show tooltip when slider is being dragged
    showTooltip(sliderValue);
    
    // Check if any unit layer is currently visible
    const hasActiveLayer = layerState.isBrigadesLayerVisible || 
                           layerState.isDetachmentLayerVisible || 
                           layerState.isDivisionLayerVisible || 
                           layerState.isCorpsLayerVisible ||
                           layerState.isBattlesLayerVisible;
    
    if (!hasActiveLayer) {
        return; // Do nothing if no unit layer is visible
    }
    
    // Get the corresponding year and month from the slider value
    const timelineData = TIMELINE_DATA[sliderValue];
    
    if (timelineData) {
        // Update the layer state with the new filter values
        layerState.selectedYear = timelineData.year;
        layerState.selectedMonth = timelineData.month;
        
        // Refresh all visible layers with the new filter
        refreshAllVisibleLayers();
    }
}

/**
 * Handle slider hover to show tooltip
 * @param {Event} event - Mouse event from slider
 */
function handleSliderHover(event) {
    const slider = event.target;
    const sliderValue = parseInt(slider.value);
    showTooltip(sliderValue);
}

/**
 * Show tooltip with month and year
 * @param {number} sliderValue - Current slider value (0-49)
 */
function showTooltip(sliderValue) {
    const tooltip = document.getElementById('timelineTooltip');
    const slider = document.getElementById('timelineSlider');
    
    if (!tooltip || !slider) return;
    
    const timelineData = TIMELINE_DATA[sliderValue];
    if (!timelineData) return;
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    
    // Update tooltip text
    tooltip.textContent = `${monthNames[timelineData.month - 1]} ${timelineData.year}`;
    
    // Calculate tooltip position based on slider value
    const percentage = (sliderValue / 49) * 100;
    tooltip.style.left = `${percentage}%`;
    
    // Show tooltip
    tooltip.classList.add('visible');
    
    // Clear any existing timeout
    if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
    }
    
    // Set timeout to hide tooltip after 1 second
    tooltipTimeout = setTimeout(() => {
        hideTooltip();
    }, 1000);
}

/**
 * Hide the tooltip
 */
function hideTooltip() {
    const tooltip = document.getElementById('timelineTooltip');
    if (tooltip) {
        tooltip.classList.remove('visible');
    }
    
    // Clear the timeout
    if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
        tooltipTimeout = null;
    }
}

/**
 * Show or hide the timeline slider
 * @param {boolean} show - Whether to show the timeline
 */
export function toggleTimeline(show) {
    const timelineContainer = document.getElementById('timelineContainer');
    const calendarButton = document.getElementById('toggleYearsMenu');
    
    if (!timelineContainer || !calendarButton) {
        return;
    }
    
    if (show) {
        timelineContainer.classList.add('visible');
        calendarButton.classList.add('active');
    } else {
        timelineContainer.classList.remove('visible');
        calendarButton.classList.remove('active');
        
        // Reset the slider to the end (May 1945 - show all events)
        const slider = document.getElementById('timelineSlider');
        if (slider) {
            slider.value = TIMELINE_DATA.length - 1;
        }
    }
}

/**
 * Reset timeline to default state (May 1945 - show all events)
 */
export function resetTimeline() {
    const slider = document.getElementById('timelineSlider');
    if (slider) {
        slider.value = TIMELINE_DATA.length - 1;
    }
    
    // Clear the filter
    layerState.selectedYear = null;
    layerState.selectedMonth = null;
}

/**
 * Get current timeline position as human-readable string
 * @returns {string} - Formatted date string (e.g., "June 1943")
 */
export function getCurrentTimelineDate() {
    const slider = document.getElementById('timelineSlider');
    if (!slider) return '';
    
    const sliderValue = parseInt(slider.value);
    const timelineData = TIMELINE_DATA[sliderValue];
    
    if (!timelineData) return '';
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    
    return `${monthNames[timelineData.month - 1]} ${timelineData.year}`;
}
