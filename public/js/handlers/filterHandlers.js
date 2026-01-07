/**
 * filterHandlers.js - This file is part of the NOB web project.
 * 
 * Event handlers for year and month filtering functionality. Manages user interactions
 * with the calendar filter UI and refreshes map layers based on selected date ranges.
 * 
 * Created: 11/2025
 * Authors: Pero & GitHub Copilot
 */

import layerState from '../layerState.js';
import { refreshAllVisibleLayers } from '../map_layers.js';

// Auto-hide timers
let yearsMenuTimer = null;
let monthsMenuTimer = null;
const AUTO_HIDE_DELAY = 5000; // 5 seconds

/**
 * Clear year and month filter
 */
export function clearYearFilter() {
    layerState.selectedYear = null;
    layerState.selectedMonth = null;
    const allYearButtons = document.querySelectorAll('.year-button');
    const allMonthButtons = document.querySelectorAll('.month-button');
    allYearButtons.forEach(btn => btn.classList.remove('active'));
    allMonthButtons.forEach(btn => btn.classList.remove('active'));
}

/**
 * Auto-hide years menu after delay
 */
function startYearsMenuTimer() {
    clearTimeout(yearsMenuTimer);
    yearsMenuTimer = setTimeout(() => {
        const yearsMenu = document.getElementById('yearsMenu');
        const monthsMenu = document.getElementById('monthsMenu');
        const calendarButton = document.getElementById('toggleYearsMenu');
        
        yearsMenu.classList.remove('visible');
        monthsMenu.classList.remove('visible');
        calendarButton.classList.remove('active');
    }, AUTO_HIDE_DELAY);
}

/**
 * Auto-hide months menu after delay
 */
function startMonthsMenuTimer() {
    clearTimeout(monthsMenuTimer);
    monthsMenuTimer = setTimeout(() => {
        const monthsMenu = document.getElementById('monthsMenu');
        monthsMenu.classList.remove('visible');
    }, AUTO_HIDE_DELAY);
}

/**
 * Cancel auto-hide timer for years menu
 */
function cancelYearsMenuTimer() {
    clearTimeout(yearsMenuTimer);
}

/**
 * Cancel auto-hide timer for months menu
 */
function cancelMonthsMenuTimer() {
    clearTimeout(monthsMenuTimer);
}

/**
 * Handle year filter selection
 * @param {number} year - Year to filter by (1941-1945)
 */
export function handleYearFilter(year) {
    // Check if any unit layer is currently visible
    const hasActiveLayer = layerState.isBrigadesLayerVisible || 
                           layerState.isDetachmentLayerVisible || 
                           layerState.isDivisionLayerVisible || 
                           layerState.isCorpsLayerVisible ||
                           layerState.isBattlesLayerVisible;
    
    if (!hasActiveLayer) {
        return; // Do nothing if no unit layer is visible
    }
    
    // Cancel previous timers
    cancelYearsMenuTimer();
    cancelMonthsMenuTimer();
    
    // Toggle year selection
    const yearButton = document.getElementById(`year${year}`);
    const allYearButtons = document.querySelectorAll('.year-button');
    const monthsMenu = document.getElementById('monthsMenu');
    const allMonthButtons = document.querySelectorAll('.month-button');
    
    if (layerState.selectedYear === year) {
        // Deselect current year
        layerState.selectedYear = null;
        layerState.selectedMonth = null;
        yearButton.classList.remove('active');
        
        // Hide months menu and clear month selection
        monthsMenu.classList.remove('visible');
        allMonthButtons.forEach(btn => btn.classList.remove('active'));
        
        // Restart years menu timer
        startYearsMenuTimer();
    } else {
        // Select new year
        layerState.selectedYear = year;
        layerState.selectedMonth = null; // Clear month when changing year
        
        // Remove active class from all year buttons
        allYearButtons.forEach(btn => btn.classList.remove('active'));
        
        // Add active class to clicked button
        yearButton.classList.add('active');
        
        // Show months menu
        monthsMenu.classList.add('visible');
        
        // Clear any previously selected month
        allMonthButtons.forEach(btn => btn.classList.remove('active'));
        
        // Start months menu timer
        startMonthsMenuTimer();
    }
    
    // Refresh all visible layers with the new filter
    refreshAllVisibleLayers();
}

/**
 * Handle month filter selection
 * @param {number} month - Month to filter by (1-12)
 */
export function handleMonthFilter(month) {
    // Month filter only works when a year is selected
    if (!layerState.selectedYear) {
        return; // Do nothing if no year is selected
    }
    
    // Cancel previous timer
    cancelMonthsMenuTimer();
    
    const monthButton = document.getElementById(`month${month}`);
    const allMonthButtons = document.querySelectorAll('.month-button');
    
    if (layerState.selectedMonth === month) {
        // Deselect current month
        layerState.selectedMonth = null;
        monthButton.classList.remove('active');
    } else {
        // Select new month
        layerState.selectedMonth = month;
        
        // Remove active class from all month buttons
        allMonthButtons.forEach(btn => btn.classList.remove('active'));
        
        // Add active class to clicked button
        monthButton.classList.add('active');
    }
    
    // Start months menu timer
    startMonthsMenuTimer();
    
    // Refresh all visible layers with the new filter
    refreshAllVisibleLayers();
}

/**
 * Handle calendar toggle button
 */
export function handleCalendarToggle() {
    const yearsMenu = document.getElementById('yearsMenu');
    const monthsMenu = document.getElementById('monthsMenu');
    const calendarButton = document.getElementById('toggleYearsMenu');
    
    // Cancel previous timers
    cancelYearsMenuTimer();
    cancelMonthsMenuTimer();
    
    if (yearsMenu.classList.contains('visible')) {
        // Hide years and months menus
        yearsMenu.classList.remove('visible');
        monthsMenu.classList.remove('visible');
        calendarButton.classList.remove('active');
        
        // Clear year and month filters
        clearYearFilter();
        
        // Refresh all visible layers to remove filter
        refreshAllVisibleLayers();
    } else {
        // Show years menu (months menu stays hidden until year is selected)
        yearsMenu.classList.add('visible');
        calendarButton.classList.add('active');
        
        // Start auto-hide timer
        startYearsMenuTimer();
    }
}

// Add mouse enter/leave handlers to cancel/restart timers
export function setupCalendarHoverHandlers() {
    const yearsMenu = document.getElementById('yearsMenu');
    const monthsMenu = document.getElementById('monthsMenu');
    const calendarButton = document.getElementById('toggleYearsMenu');
    
    // Years menu hover handlers
    yearsMenu.addEventListener('mouseenter', cancelYearsMenuTimer);
    yearsMenu.addEventListener('mouseleave', () => {
        if (yearsMenu.classList.contains('visible')) {
            startYearsMenuTimer();
        }
    });
    
    // Months menu hover handlers
    monthsMenu.addEventListener('mouseenter', cancelMonthsMenuTimer);
    monthsMenu.addEventListener('mouseleave', () => {
        if (monthsMenu.classList.contains('visible')) {
            startMonthsMenuTimer();
        }
    });
    
    // Calendar button hover handlers
    calendarButton.addEventListener('mouseenter', cancelYearsMenuTimer);
    calendarButton.addEventListener('mouseleave', () => {
        if (yearsMenu.classList.contains('visible')) {
            startYearsMenuTimer();
        }
    });
}
