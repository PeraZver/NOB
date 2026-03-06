/**
 * sidebar.js - This file is part of the NOB web project.
 * 
 * Sidebar content management functions. Handles updating sidebar content
 * with markdown-rendered information about military units and layers.
 * 
 * Created: 11/2025
 * Authors: Pero & Github Copilot
 */

export function updateSidebar(content) {
    const sidebarContent = document.getElementById('content');
    if (content) {
        sidebarContent.innerHTML = content; // Update the sidebar with the provided content
    } else {
        sidebarContent.innerHTML = '<p>No additional details available.</p>'; // Fallback for empty content
    }
    // Update the map info overlay with a preview of the sidebar text
    const text = sidebarContent.innerText || sidebarContent.textContent || '';
    updateMapInfoOverlay(text);
}

export function loadDefaultText(markdownFile) {
    fetch(markdownFile)
        .then(response => response.text())
        .then(markdown => {
            updateSidebar(marked.parse(markdown)); // Render Markdown content in the sidebar
        })
        .catch(error => console.error('Error loading default text:', error));
}

/**
 * Update the semi-transparent info overlay on the map with a preview of the sidebar text.
 * Creates the overlay element if it does not yet exist.
 * @param {string} text - Plain text extracted from the sidebar content
 */
export function updateMapInfoOverlay(text) {
    let overlay = document.getElementById('mapInfoOverlay');
    if (!overlay) {
        overlay = createMapInfoOverlay();
    }
    const trimmed = (text || '').trim().replace(/\s+/g, ' ');
    const preview = trimmed.length > 200 ? trimmed.substring(0, 200) + '...' : trimmed;
    const textEl = overlay.querySelector('.map-info-overlay-text');
    if (textEl) {
        textEl.textContent = preview;
    }
    if (trimmed.length > 0) {
        overlay.classList.add('visible');
    }
}

/**
 * Hide the map info overlay (e.g. when the sidebar is closed).
 */
export function hideMapInfoOverlay() {
    const overlay = document.getElementById('mapInfoOverlay');
    if (overlay) {
        overlay.classList.remove('visible');
    }
}

/**
 * Build and insert the map info overlay DOM element.
 * @returns {HTMLElement}
 */
function createMapInfoOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'mapInfoOverlay';
    overlay.className = 'map-info-overlay';
    overlay.innerHTML = `
        <span class="map-info-overlay-close" title="Close">&times;</span>
        <p class="map-info-overlay-text"></p>
        <a class="map-info-overlay-link" href="#">more details</a>
    `;

    const closeBtn = overlay.querySelector('.map-info-overlay-close');
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent the click from bubbling to Leaflet's map click handler
        overlay.classList.remove('visible');
    });

    const moreLink = overlay.querySelector('.map-info-overlay-link');
    moreLink.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent the click from bubbling to Leaflet's map click handler
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });

    // Append inside the map div so absolute positioning is relative to the map
    // (Leaflet sets position:relative on the map container)
    const mapEl = document.getElementById('map');
    if (mapEl) {
        mapEl.appendChild(overlay);
    } else {
        const mapSidebarContainer = document.querySelector('.map-sidebar-container');
        if (mapSidebarContainer) {
            mapSidebarContainer.appendChild(overlay);
        } else {
            document.body.appendChild(overlay);
        }
    }

    return overlay;
}
