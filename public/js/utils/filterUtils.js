/**
 * filterUtils.js - This file is part of the NOB web project.
 * 
 * Data filtering utility functions. Implements filtering logic for military units
 * based on formation dates (year and month).
 * 
 * Created: 11/2025
 * Authors: Pero & Github Copilot
 */

/**
 * Filter data by formation year and optionally by month
 * @param {Array} data - Array of military units
 * @param {number} selectedYear - Year to filter by (null for no filter)
 * @param {number} selectedMonth - Month to filter by (1-12, null for no filter)
 * @returns {Array} Filtered data
 */
export function filterDataByYear(data, selectedYear, selectedMonth) {
    if (!selectedYear) {
        return data; // No filter applied
    }

    return data.filter(item => {
        if (!item.formation_date) {
            return false; // Exclude items without formation date
        }

        const date = new Date(item.formation_date);
        // Validate the date is valid
        if (isNaN(date.getTime())) {
            console.warn(`Invalid date format for item: ${item.name}`);
            return false; // Exclude items with invalid dates
        }

        const formationYear = date.getFullYear();
        const formationMonth = date.getMonth() + 1; // getMonth() returns 0-11, we need 1-12

        // If both year and month are selected, show units formed up until that month and year
        if (selectedMonth) {
            return (
                formationYear < selectedYear || 
                (formationYear === selectedYear && formationMonth <= selectedMonth)
            );
        }

        // If only year is selected, show units formed in the selected year or earlier
        return formationYear <= selectedYear;
    });
}
