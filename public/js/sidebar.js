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
 * Show the campaign list panel on the right edge of the map.
 * @param {Array} items - Array of { dateStr, place, operation, onSelect } objects
 * @param {string} title - Title for the panel header
 */
export function showCampaignListPanel(items, title) {
    let panel = document.getElementById('campaignListPanel');
    if (!panel) {
        panel = createCampaignListPanel();
    }

    // Update title
    const titleEl = panel.querySelector('.campaign-list-panel-title');
    if (titleEl) {
        titleEl.textContent = title || 'Campaign Movement';
    }

    // Build list
    const body = panel.querySelector('.campaign-list-panel-body');
    body.innerHTML = '';
    items.forEach(item => {
        const el = document.createElement('div');
        el.className = 'campaign-list-item';
        let html = '';
        if (item.dateStr) {
            html += `<span class="campaign-list-item-date">${item.dateStr}</span>`;
        }
        if (item.place) {
            html += `<span class="campaign-list-item-place">${item.place}</span>`;
        }
        if (item.operation) {
            html += ` <span class="campaign-list-item-op">– ${item.operation}</span>`;
        }
        el.innerHTML = html;
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof item.onSelect === 'function') {
                item.onSelect();
            }
        });
        body.appendChild(el);
    });

    panel.classList.remove('hidden');
    document.dispatchEvent(new CustomEvent('campaignListPanelShown'));
}

/**
 * Hide and clear the campaign list panel.
 */
export function hideCampaignListPanel() {
    const panel = document.getElementById('campaignListPanel');
    if (panel) {
        panel.classList.add('hidden');
        document.dispatchEvent(new CustomEvent('campaignListPanelHidden'));
    }
}

/**
 * Build and insert the campaign list panel DOM element inside the map.
 * @returns {HTMLElement}
 */
function createCampaignListPanel() {
    const panel = document.createElement('div');
    panel.id = 'campaignListPanel';
    panel.className = 'campaign-list-panel hidden';
    panel.innerHTML = `
        <div class="campaign-list-panel-header">
            <span class="campaign-list-panel-title">Campaign Movement</span>
            <button class="campaign-list-panel-close" title="Close">&times;</button>
        </div>
        <div class="campaign-list-panel-body"></div>
    `;

    const closeBtn = panel.querySelector('.campaign-list-panel-close');
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        panel.classList.add('hidden');
        document.dispatchEvent(new CustomEvent('campaignListPanelHidden'));
    });

    const mapEl = document.getElementById('map');
    if (mapEl) {
        mapEl.appendChild(panel);
    } else {
        document.body.appendChild(panel);
    }

    // Prevent wheel events on the panel from bubbling to the Leaflet map
    if (typeof L !== 'undefined' && L.DomEvent) {
        L.DomEvent.disableScrollPropagation(panel);
    }

    return panel;
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
