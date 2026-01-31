/**
 * filterUtils.js - This file is part of the NOB web project.
 * 
 * Data filtering utility functions. Implements filtering logic for military units
 * based on formation dates (year and month), battles based on date ranges, and
 * campaigns based on campaign dates.
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

/**
 * Filter battles by date range - shows battles that were ongoing during the selected period
 * @param {Array} data - Array of battles
 * @param {number} selectedYear - Year to filter by (null for no filter)
 * @param {number} selectedMonth - Month to filter by (1-12, null for no filter)
 * @returns {Array} Filtered data
 */
export function filterBattlesByDateRange(data, selectedYear, selectedMonth) {
    if (!selectedYear) {
        return data; // No filter applied
    }

    return data.filter(battle => {
        if (!battle.start_date || !battle.end_date) {
            return false; // Exclude battles without date range
        }

        const startDate = new Date(battle.start_date);
        const endDate = new Date(battle.end_date);
        
        // Validate dates are valid
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            console.warn(`Invalid date format for battle: ${battle.name}`);
            return false;
        }

        // If both year and month are selected, check if battle was ongoing during that month
        if (selectedMonth) {
            // Create the first and last day of the selected month
            const filterMonthStart = new Date(selectedYear, selectedMonth - 1, 1);
            const filterMonthEnd = new Date(selectedYear, selectedMonth, 0); // Last day of month
            
            // Battle is ongoing if:
            // - Battle started before or during the selected month AND
            // - Battle ended during or after the selected month
            return startDate <= filterMonthEnd && endDate >= filterMonthStart;
        }

        // If only year is selected, check if battle was ongoing during that year
        const filterYearStart = new Date(selectedYear, 0, 1);
        const filterYearEnd = new Date(selectedYear, 11, 31);
        
        return startDate <= filterYearEnd && endDate >= filterYearStart;
    });
}

/**
 * Filter campaigns by date - shows campaigns that occurred before or during the selected period
 * @param {Array} data - Array of campaigns
 * @param {number} selectedYear - Year to filter by (null for no filter)
 * @param {number} selectedMonth - Month to filter by (1-12, null for no filter)
 * @returns {Array} Filtered data (campaigns that occurred before the selected date)
 */
export function filterCampaignsByDate(data, selectedYear, selectedMonth) {
    if (!selectedYear) {
        return data; // No filter applied
    }

    return data.filter(campaign => {
        if (!campaign.date) {
            return false; // Exclude campaigns without date
        }

        const campaignDate = new Date(campaign.date);
        
        // Validate date is valid
        if (isNaN(campaignDate.getTime())) {
            console.warn(`Invalid date format for campaign at: ${campaign.place}`);
            return false;
        }

        const campaignYear = campaignDate.getFullYear();
        const campaignMonth = campaignDate.getMonth() + 1; // getMonth() returns 0-11, we need 1-12

        // If both year and month are selected, show campaigns that occurred before or during that month
        if (selectedMonth) {
            // Create the end of the selected month
            const filterDate = new Date(selectedYear, selectedMonth, 0); // Last day of selected month
            
            // Show campaigns that occurred on or before the selected month
            return campaignDate <= filterDate;
        }

        // If only year is selected, show campaigns that occurred before or during that year
        const filterYearEnd = new Date(selectedYear, 11, 31);
        return campaignDate <= filterYearEnd;
    });
}
