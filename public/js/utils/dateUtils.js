/**
 * dateUtils.js - This file is part of the NOB web project.
 * 
 * Date formatting utility functions. Provides consistent date formatting
 * across the application for displaying formation dates.
 * 
 * Created: 11/2025
 * Authors: Pero & Github Copilot
 */

/**
 * Utility functions for date formatting
 */

/**
 * Format a date string to "Month DD, YYYY" format
 * @param {string} dateString - Date string to format
 * @returns {string} Formatted date or 'Unknown'
 */
export function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Unknown';
    const options = { year: 'numeric', month: 'long', day: '2-digit' };
    return date.toLocaleDateString('en-US', options);
}

/**
 * Format a date string to "DD. Month YYYY" format (e.g., "12. February 1942")
 * @param {string} dateString - Date string to format
 * @returns {string} Formatted date or 'Unknown date'
 */
export function formatCampaignDate(dateString) {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Unknown date';
    
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    const year = date.getFullYear();
    
    return `${day}. ${month} ${year}`;
}

/**
 * Get the last day of a month
 * @param {number} year - Year
 * @param {number} month - Month (0-11)
 * @returns {number} Last day of the month
 */
function getLastDayOfMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

/**
 * Format a date range intelligently for crime popups
 * - If dates span the full month (1st to last day), show "Month, Year"
 * - If dates span multiple months, show "Month - Month Year"
 * - Otherwise use default formatting
 * @param {string} startDateString - Start date string
 * @param {string} endDateString - End date string (optional)
 * @returns {string} Formatted date range
 */
export function formatDateRange(startDateString, endDateString) {
    if (!startDateString) return 'Unknown';
    
    const startDate = new Date(startDateString);
    if (isNaN(startDate.getTime())) return 'Unknown';
    
    // If no end date, just format the start date
    if (!endDateString) {
        return formatDate(startDateString);
    }
    
    const endDate = new Date(endDateString);
    if (isNaN(endDate.getTime())) {
        return formatDate(startDateString);
    }
    
    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth();
    const startDay = startDate.getDate();
    
    const endYear = endDate.getFullYear();
    const endMonth = endDate.getMonth();
    const endDay = endDate.getDate();
    
    const startMonthName = startDate.toLocaleDateString('en-US', { month: 'long' });
    const endMonthName = endDate.toLocaleDateString('en-US', { month: 'long' });
    
    // Check if dates span the full month (1st to last day of same month)
    if (startYear === endYear && startMonth === endMonth) {
        const lastDay = getLastDayOfMonth(startYear, startMonth);
        if (startDay === 1 && endDay === lastDay) {
            return `${startMonthName}, ${startYear}`;
        }
    }
    
    // Check if dates span multiple months in the same year
    if (startYear === endYear && startMonth !== endMonth) {
        return `${startMonthName} - ${endMonthName} ${startYear}`;
    }
    
    // Check if dates span multiple months across different years
    if (startYear !== endYear) {
        return `${startMonthName} ${startYear} - ${endMonthName} ${endYear}`;
    }
    
    // Default: show both dates
    return `${formatDate(startDateString)} to ${formatDate(endDateString)}`;
}
