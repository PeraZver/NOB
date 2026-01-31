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
