/**
 * timelineSlider.js - Timeline slider functionality for NOB project
 * 
 * Handles the dual timeline slider UI component that allows users to filter events
 * by date range from April 1941 to May 1945. The sliders have 50 discrete positions
 * representing each month in this time period.
 * 
 * Created: 02/2026
 * Authors: GitHub Copilot
 */

import layerState from '../layerState.js';
import { refreshAllVisibleLayers } from '../map_layers.js';

// Timeline data structure: April 1941 to May 1945 (50 months)
const TIMELINE_DATA = [];

// Month names constant
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
                     'July', 'August', 'September', 'October', 'November', 'December'];

// Tooltip hide delay in milliseconds
const TOOLTIP_HIDE_DELAY = 1000;

// Tooltip timeout handles
let tooltipTimeoutAfter = null;
let tooltipTimeoutBefore = null;

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
    const sliderAfter = document.getElementById('timelineSliderAfter');
    const sliderBefore = document.getElementById('timelineSliderBefore');
    
    if (!ticksContainer || !sliderAfter || !sliderBefore) {
        console.error('Timeline elements not found');
        return;
    }
    
    // Generate ticks
    generateTicks(ticksContainer);
    
    // Set up slider event handlers for "after" slider
    sliderAfter.addEventListener('input', (e) => handleSliderChange(e, 'after'));
    sliderAfter.addEventListener('change', (e) => handleSliderChange(e, 'after'));
    sliderAfter.addEventListener('mouseenter', (e) => handleSliderHover(e, 'after'));
    sliderAfter.addEventListener('mouseleave', () => handleMouseLeave('after'));
    
    // Set up slider event handlers for "before" slider
    sliderBefore.addEventListener('input', (e) => handleSliderChange(e, 'before'));
    sliderBefore.addEventListener('change', (e) => handleSliderChange(e, 'before'));
    sliderBefore.addEventListener('mouseenter', (e) => handleSliderHover(e, 'before'));
    sliderBefore.addEventListener('mouseleave', () => handleMouseLeave('before'));
    
    // Update track fill initially
    updateTrackFill();
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
 * Update the visual track fill between sliders
 */
function updateTrackFill() {
    const sliderAfter = document.getElementById('timelineSliderAfter');
    const sliderBefore = document.getElementById('timelineSliderBefore');
    const trackFill = document.getElementById('timelineTrackFill');
    
    if (!sliderAfter || !sliderBefore || !trackFill) return;
    
    const afterValue = parseInt(sliderAfter.value);
    const beforeValue = parseInt(sliderBefore.value);
    
    const startPercent = (afterValue / 49) * 100;
    const endPercent = (beforeValue / 49) * 100;
    
    // Calculate position within the timeline-slider-wrapper (accounting for 10px padding)
    // The sliders now have width: calc(100% - 20px) and left: 10px
    trackFill.style.left = `calc(10px + ${startPercent}% * (100% - 20px) / 100%)`;
    trackFill.style.width = `calc((${endPercent - startPercent}%) * (100% - 20px) / 100%)`;
}

/**
 * Handle slider value change
 * @param {Event} event - Input event from slider
 * @param {string} sliderType - Either 'after' or 'before'
 */
function handleSliderChange(event, sliderType) {
    const sliderValue = parseInt(event.target.value);
    const sliderAfter = document.getElementById('timelineSliderAfter');
    const sliderBefore = document.getElementById('timelineSliderBefore');
    
    if (!sliderAfter || !sliderBefore) return;
    
    const afterValue = parseInt(sliderAfter.value);
    const beforeValue = parseInt(sliderBefore.value);
    
    // Prevent sliders from crossing
    if (sliderType === 'after' && sliderValue > beforeValue) {
        sliderAfter.value = beforeValue;
        return;
    }
    if (sliderType === 'before' && sliderValue < afterValue) {
        sliderBefore.value = afterValue;
        return;
    }
    
    // Update track fill
    updateTrackFill();
    
    // Show tooltip when slider is being dragged (with auto-hide timeout)
    showTooltip(sliderValue, sliderType, true);
    
    // Check if any unit layer is currently visible
    const hasActiveLayer = layerState.isBrigadesLayerVisible || 
                           layerState.isDetachmentLayerVisible || 
                           layerState.isDivisionLayerVisible || 
                           layerState.isCorpsLayerVisible ||
                           layerState.isBattlesLayerVisible;
    
    if (!hasActiveLayer) {
        return; // Do nothing if no unit layer is visible
    }
    
    // Get the corresponding year and month from both slider values
    const afterData = TIMELINE_DATA[parseInt(sliderAfter.value)];
    const beforeData = TIMELINE_DATA[parseInt(sliderBefore.value)];
    
    if (afterData && beforeData) {
        // Update the layer state with the new filter values
        layerState.selectedYearStart = afterData.year;
        layerState.selectedMonthStart = afterData.month;
        layerState.selectedYearEnd = beforeData.year;
        layerState.selectedMonthEnd = beforeData.month;
        
        // For backward compatibility, keep the old properties too
        layerState.selectedYear = beforeData.year;
        layerState.selectedMonth = beforeData.month;
        
        // Refresh all visible layers with the new filter
        refreshAllVisibleLayers();
    }
}

/**
 * Handle slider hover to show tooltip
 * @param {Event} event - Mouse event from slider
 * @param {string} sliderType - Either 'after' or 'before'
 */
function handleSliderHover(event, sliderType) {
    // Clear any existing timeout to prevent premature hiding
    if (sliderType === 'after' && tooltipTimeoutAfter) {
        clearTimeout(tooltipTimeoutAfter);
        tooltipTimeoutAfter = null;
    } else if (sliderType === 'before' && tooltipTimeoutBefore) {
        clearTimeout(tooltipTimeoutBefore);
        tooltipTimeoutBefore = null;
    }
    
    const slider = event.target;
    const sliderValue = parseInt(slider.value);
    showTooltip(sliderValue, sliderType, false); // Don't set timeout on hover
}

/**
 * Handle mouse leave to start hide timeout
 * @param {string} sliderType - Either 'after' or 'before'
 */
function handleMouseLeave(sliderType) {
    // Set timeout to hide tooltip after delay
    const timeout = setTimeout(() => {
        hideTooltip(sliderType);
    }, TOOLTIP_HIDE_DELAY);
    
    if (sliderType === 'after') {
        tooltipTimeoutAfter = timeout;
    } else {
        tooltipTimeoutBefore = timeout;
    }
}

/**
 * Show tooltip with month and year
 * @param {number} sliderValue - Current slider value (0-49)
 * @param {string} sliderType - Either 'after' or 'before'
 * @param {boolean} setHideTimeout - Whether to set timeout to hide tooltip
 */
function showTooltip(sliderValue, sliderType, setHideTimeout = true) {
    const tooltipId = sliderType === 'after' ? 'timelineTooltipAfter' : 'timelineTooltipBefore';
    const tooltip = document.getElementById(tooltipId);
    
    if (!tooltip) return;
    
    const timelineData = TIMELINE_DATA[sliderValue];
    if (!timelineData) return;
    
    // Update tooltip text
    const label = sliderType === 'after' ? 'After: ' : 'Before: ';
    tooltip.textContent = `${label}${MONTH_NAMES[timelineData.month - 1]} ${timelineData.year}`;
    
    // Calculate tooltip position based on slider value
    const percentage = (sliderValue / 49) * 100;
    tooltip.style.left = `${percentage}%`;
    
    // Show tooltip
    tooltip.classList.add('visible');
    
    // Clear any existing timeout
    if (sliderType === 'after' && tooltipTimeoutAfter) {
        clearTimeout(tooltipTimeoutAfter);
        tooltipTimeoutAfter = null;
    } else if (sliderType === 'before' && tooltipTimeoutBefore) {
        clearTimeout(tooltipTimeoutBefore);
        tooltipTimeoutBefore = null;
    }
    
    // Set timeout to hide tooltip after 1 second only if requested
    if (setHideTimeout) {
        const timeout = setTimeout(() => {
            hideTooltip(sliderType);
        }, TOOLTIP_HIDE_DELAY);
        
        if (sliderType === 'after') {
            tooltipTimeoutAfter = timeout;
        } else {
            tooltipTimeoutBefore = timeout;
        }
    }
}

/**
 * Hide the tooltip
 * @param {string} sliderType - Either 'after' or 'before'
 */
function hideTooltip(sliderType) {
    const tooltipId = sliderType === 'after' ? 'timelineTooltipAfter' : 'timelineTooltipBefore';
    const tooltip = document.getElementById(tooltipId);
    if (tooltip) {
        tooltip.classList.remove('visible');
    }
    
    // Clear the timeout
    if (sliderType === 'after' && tooltipTimeoutAfter) {
        clearTimeout(tooltipTimeoutAfter);
        tooltipTimeoutAfter = null;
    } else if (sliderType === 'before' && tooltipTimeoutBefore) {
        clearTimeout(tooltipTimeoutBefore);
        tooltipTimeoutBefore = null;
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
        
        // Reset the sliders to default positions (full range)
        const sliderAfter = document.getElementById('timelineSliderAfter');
        const sliderBefore = document.getElementById('timelineSliderBefore');
        if (sliderAfter && sliderBefore) {
            sliderAfter.value = 0;
            sliderBefore.value = TIMELINE_DATA.length - 1;
            updateTrackFill();
        }
    }
}

/**
 * Reset timeline to default state (show all events)
 */
export function resetTimeline() {
    const sliderAfter = document.getElementById('timelineSliderAfter');
    const sliderBefore = document.getElementById('timelineSliderBefore');
    
    if (sliderAfter && sliderBefore) {
        sliderAfter.value = 0;
        sliderBefore.value = TIMELINE_DATA.length - 1;
        updateTrackFill();
    }
    
    // Clear the filters
    layerState.selectedYearStart = null;
    layerState.selectedMonthStart = null;
    layerState.selectedYearEnd = null;
    layerState.selectedMonthEnd = null;
    layerState.selectedYear = null;
    layerState.selectedMonth = null;
}

/**
 * Get current timeline position as human-readable string
 * @returns {string} - Formatted date range string
 */
export function getCurrentTimelineDate() {
    const sliderAfter = document.getElementById('timelineSliderAfter');
    const sliderBefore = document.getElementById('timelineSliderBefore');
    
    if (!sliderAfter || !sliderBefore) return '';
    
    const afterValue = parseInt(sliderAfter.value);
    const beforeValue = parseInt(sliderBefore.value);
    const afterData = TIMELINE_DATA[afterValue];
    const beforeData = TIMELINE_DATA[beforeValue];
    
    if (!afterData || !beforeData) return '';
    
    return `${MONTH_NAMES[afterData.month - 1]} ${afterData.year} - ${MONTH_NAMES[beforeData.month - 1]} ${beforeData.year}`;
}
