/**
 * filterUtils.js - This file is part of the NOB web project.
 * 
 * Data filtering utility functions. Implements filtering logic for military units
 * based on formation dates (year and month), battles based on date ranges, and
 * campaigns based on campaign dates. Updated to support date range filtering.
 * 
 * Created: 11/2025
 * Authors: Pero & Github Copilot
 */

/**
 * Filter data by formation year and optionally by month
 * Now supports date range filtering with start and end dates
 * @param {Array} data - Array of military units
 * @param {number} selectedYear - Year to filter by (null for no filter) - for backward compatibility
 * @param {number} selectedMonth - Month to filter by (1-12, null for no filter) - for backward compatibility
 * @param {number} startYear - Start year for range filter (optional)
 * @param {number} startMonth - Start month for range filter (optional)
 * @param {number} endYear - End year for range filter (optional)
 * @param {number} endMonth - End month for range filter (optional)
 * @returns {Array} Filtered data
 */
export function filterDataByYear(data, selectedYear, selectedMonth, startYear = null, startMonth = null, endYear = null, endMonth = null) {
    // If range parameters are provided, use them
    if (startYear !== null && endYear !== null) {
        return data.filter(item => {
            if (!item.formation_date) {
                return false; // Exclude items without formation date
            }

            const date = new Date(item.formation_date);
            if (isNaN(date.getTime())) {
                console.warn(`Invalid date format for item: ${item.name}`);
                return false;
            }

            const formationYear = date.getFullYear();
            const formationMonth = date.getMonth() + 1; // getMonth() returns 0-11, we need 1-12

            // Create start and end comparison dates
            const formationDate = new Date(formationYear, formationMonth - 1, 1);
            const rangeStart = new Date(startYear, startMonth ? startMonth - 1 : 0, 1);
            const rangeEnd = new Date(endYear, endMonth ? endMonth : 12, 0); // Last day of month

            // Check if formation date is within range
            return formationDate >= rangeStart && formationDate <= rangeEnd;
        });
    }
    
    // Backward compatibility: use old single-date filtering
    if (!selectedYear) {
        return data; // No filter applied
    }

    return data.filter(item => {
        if (!item.formation_date) {
            return false;
        }

        const date = new Date(item.formation_date);
        if (isNaN(date.getTime())) {
            console.warn(`Invalid date format for item: ${item.name}`);
            return false;
        }

        const formationYear = date.getFullYear();
        const formationMonth = date.getMonth() + 1;

        if (selectedMonth) {
            return (
                formationYear < selectedYear || 
                (formationYear === selectedYear && formationMonth <= selectedMonth)
            );
        }

        return formationYear <= selectedYear;
    });
}

/**
 * Filter battles by date range - shows battles that were ongoing during the selected period
 * Now supports date range filtering with start and end dates
 * @param {Array} data - Array of battles
 * @param {number} selectedYear - Year to filter by (null for no filter) - for backward compatibility
 * @param {number} selectedMonth - Month to filter by (1-12, null for no filter) - for backward compatibility
 * @param {number} startYear - Start year for range filter (optional)
 * @param {number} startMonth - Start month for range filter (optional)
 * @param {number} endYear - End year for range filter (optional)
 * @param {number} endMonth - End month for range filter (optional)
 * @returns {Array} Filtered data
 */
export function filterBattlesByDateRange(data, selectedYear, selectedMonth, startYear = null, startMonth = null, endYear = null, endMonth = null) {
    // If range parameters are provided, use them
    if (startYear !== null && endYear !== null) {
        return data.filter(battle => {
            if (!battle.start_date || !battle.end_date) {
                return false;
            }

            const battleStart = new Date(battle.start_date);
            const battleEnd = new Date(battle.end_date);
            
            if (isNaN(battleStart.getTime()) || isNaN(battleEnd.getTime())) {
                console.warn(`Invalid date format for battle: ${battle.name}`);
                return false;
            }

            // Create filter range dates
            const rangeStart = new Date(startYear, startMonth ? startMonth - 1 : 0, 1);
            const rangeEnd = new Date(endYear, endMonth ? endMonth : 12, 0); // Last day of month
            
            // Battle overlaps with range if:
            // - Battle started before or during range END AND
            // - Battle ended during or after range START
            return battleStart <= rangeEnd && battleEnd >= rangeStart;
        });
    }
    
    // Backward compatibility: use old single-date filtering
    if (!selectedYear) {
        return data;
    }

    return data.filter(battle => {
        if (!battle.start_date || !battle.end_date) {
            return false;
        }

        const startDate = new Date(battle.start_date);
        const endDate = new Date(battle.end_date);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            console.warn(`Invalid date format for battle: ${battle.name}`);
            return false;
        }

        if (selectedMonth) {
            const filterMonthStart = new Date(selectedYear, selectedMonth - 1, 1);
            const filterMonthEnd = new Date(selectedYear, selectedMonth, 0);
            return startDate <= filterMonthEnd && endDate >= filterMonthStart;
        }

        const filterYearStart = new Date(selectedYear, 0, 1);
        const filterYearEnd = new Date(selectedYear, 11, 31);
        return startDate <= filterYearEnd && endDate >= filterYearStart;
    });
}

/**
 * Filter campaigns by date - shows campaigns that occurred within the selected period
 * Now supports date range filtering with start and end dates
 * @param {Array} data - Array of campaigns
 * @param {number} selectedYear - Year to filter by (null for no filter) - for backward compatibility
 * @param {number} selectedMonth - Month to filter by (1-12, null for no filter) - for backward compatibility
 * @param {number} startYear - Start year for range filter (optional)
 * @param {number} startMonth - Start month for range filter (optional)
 * @param {number} endYear - End year for range filter (optional)
 * @param {number} endMonth - End month for range filter (optional)
 * @returns {Array} Filtered data
 */
export function filterCampaignsByDate(data, selectedYear, selectedMonth, startYear = null, startMonth = null, endYear = null, endMonth = null) {
    // If range parameters are provided, use them
    if (startYear !== null && endYear !== null) {
        return data.filter(campaign => {
            if (!campaign.date) {
                return false;
            }

            const campaignDate = new Date(campaign.date);
            
            if (isNaN(campaignDate.getTime())) {
                console.warn(`Invalid date format for campaign at: ${campaign.place}`);
                return false;
            }

            // Create filter range dates
            const rangeStart = new Date(startYear, startMonth ? startMonth - 1 : 0, 1);
            const rangeEnd = new Date(endYear, endMonth ? endMonth : 12, 0); // Last day of month
            
            // Campaign is in range if it occurred between start and end dates
            return campaignDate >= rangeStart && campaignDate <= rangeEnd;
        });
    }
    
    // Backward compatibility: use old single-date filtering
    if (!selectedYear) {
        return data;
    }

    return data.filter(campaign => {
        if (!campaign.date) {
            return false;
        }

        const campaignDate = new Date(campaign.date);
        
        if (isNaN(campaignDate.getTime())) {
            console.warn(`Invalid date format for campaign at: ${campaign.place}`);
            return false;
        }

        const campaignYear = campaignDate.getFullYear();
        const campaignMonth = campaignDate.getMonth() + 1;

        if (selectedMonth) {
            const filterDate = new Date(selectedYear, selectedMonth, 0);
            return campaignDate <= filterDate;
        }

        const filterYearEnd = new Date(selectedYear, 11, 31);
        return campaignDate <= filterYearEnd;
    });
}
