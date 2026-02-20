/**
 * popupUtils.js - This file is part of the NOB web project.
 * 
 * Popup content generation utility functions. Creates formatted HTML content
 * for map marker popups displaying military unit and battle information.
 * 
 * Created: 11/2025
 * Authors: Pero & Github Copilot
 */

import { formatDate, formatDateRange } from './dateUtils.js';

/**
 * Generate compact popup content for markers
 * @param {Object} properties - Properties of the military unit
 * @returns {string} HTML content for popup
 */
export function generatePopupContent(properties) {
    const formattedDate = properties.datum_formiranja ? formatDate(properties.datum_formiranja) : 'Unknown';
    const formationSite = properties.formation_site || 'Unknown location';

    return `
        <div class="popup-content">
            <h3>${properties.naziv || properties.name || 'Unknown Name'}</h3>
            <p><strong>Formed:</strong> ${formattedDate}</p>
            <p><strong>Location:</strong> ${formationSite}</p>
            ${properties.opis || properties.description ? `<p>${properties.opis || properties.description}</p>` : ''}
            ${properties.wikipedia || properties.wikipedia_url ? `<p><a href="${properties.wikipedia || properties.wikipedia_url}" target="_blank">Wikipedia</a></p>` : ''}
        </div>
    `;
}

/**
 * Generate popup content for battle markers
 * @param {Object} properties - Properties of the battle
 * @returns {string} HTML content for popup
 */
export function generateBattlePopupContent(properties) {
    const formattedDateRange = formatDateRange(properties.start_date, properties.end_date);
    const place = properties.place || 'Unknown location';

    return `
        <div class="popup-content">
            <h3>${properties.name || 'Unknown Battle'}</h3>
            <p><strong>Location:</strong> ${place}</p>
            <p><strong>Date:</strong> ${formattedDateRange}</p>
            ${properties.wikipedia_url ? `<p><a href="${properties.wikipedia_url}" target="_blank">Wikipedia</a></p>` : ''}
        </div>
    `;
}

/**
 * Generate popup content for crime markers
 * @param {Object} properties - Properties of the crime
 * @returns {string} HTML content for popup
 */
export function generateCrimePopupContent(properties) {
    const formattedDateRange = formatDateRange(properties.start_date, properties.end_date);
    const site = properties.site || 'Unknown site';
    const deaths = properties.deaths ? properties.deaths.toLocaleString() : 'Unknown';

    return `
        <div class="popup-content">
            <h3>${site}</h3>
            <p><strong>Date:</strong> ${formattedDateRange}</p>
            <p><strong>Deaths:</strong> ${deaths}</p>
            ${properties.wikipedia_url ? `<p><a href="${properties.wikipedia_url}" target="_blank">Wikipedia</a></p>` : ''}
        </div>
    `;
}
