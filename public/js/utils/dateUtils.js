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
