/**
 * popupUtils.js - This file is part of the NOB web project.
 * 
 * Popup content generation utility functions. Creates formatted HTML content
 * for map marker popups displaying military unit information.
 * 
 * Created: 11/2025
 * Authors: Pero & Github Copilot
 */

import { formatDate } from './dateUtils.js';

/**
 * Generate compact popup content for markers
 * @param {Object} properties - Properties of the military unit
 * @returns {string} HTML content for popup
 */
export function generatePopupContent(properties) {
    const formattedDate = properties.datum_formiranja ? formatDate(properties.datum_formiranja) : 'Unknown';
    const formationSite = properties.formation_site || 'Unknown location';

    return `
        <strong>${properties.naziv || properties.name || 'Unknown Name'}</strong><br>
        <small>Formed on ${formattedDate} <br> at ${formationSite}</small><br>
        ${properties.opis || properties.description ? `<small>${properties.opis || properties.description}</small><br>` : ''}
        ${properties.wikipedia || properties.wikipedia_url ? `<a href="${properties.wikipedia || properties.wikipedia_url}" target="_blank">Wikipedia</a>` : ''}
    `;
}
