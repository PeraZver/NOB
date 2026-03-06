/**
 * legend.js - This file is part of the NOB web project.
 *
 * Manages the map legend Leaflet control. Shows every visible layer with
 * its icon, display name, and the number of markers currently rendered
 * (which already reflects any active calendar / date-range filter).
 * Each row has a small "×" button that removes the layer from the map;
 * the layer can only be re-activated via the menu buttons.
 * Campaigns are intentionally excluded from the legend.
 *
 * Created: 03/2026
 * Authors: Pero & Github Copilot
 */

import { map } from './map.js';
import layerState from './layerState.js';
import { icons } from './config.js';
// Note: circular import is intentional and safe in ES modules – removeLayer
// is only called inside an event-handler callback, never at module-eval time.
import { removeLayer } from './map_layers.js';

// Layers tracked in the legend – campaigns are intentionally excluded
const LEGEND_LAYERS = [
    { visibleFlag: 'isDetachmentLayerVisible', layerKey: 'detachmentLayer', label: 'Detachments', iconGroup: 'detachments' },
    { visibleFlag: 'isBrigadesLayerVisible',   layerKey: 'brigadesLayer',   label: 'Brigades',    iconGroup: 'brigades'    },
    { visibleFlag: 'isDivisionLayerVisible',   layerKey: 'divisionLayer',   label: 'Divisions',   iconGroup: 'divisions'   },
    { visibleFlag: 'isCorpsLayerVisible',      layerKey: 'corpsLayer',      label: 'Corps',       iconGroup: 'corps'       },
    { visibleFlag: 'isBattlesLayerVisible',    layerKey: 'battlesLayer',    label: 'Battles',     iconGroup: 'battles'     },
    { visibleFlag: 'isCrimesLayerVisible',     layerKey: 'crimesLayer',     label: 'Crimes',      iconGroup: 'crimes'      },
];

let legendControl = null;

function initLegend() {
    if (!map || legendControl) return;

    const LegendControl = L.Control.extend({
        options: { position: 'topright' },
        onAdd() {
            const div = L.DomUtil.create('div', 'map-legend');
            div.style.display = 'none';
            // Prevent map interactions from passing through the legend panel
            L.DomEvent.disableClickPropagation(div);
            L.DomEvent.disableScrollPropagation(div);

            // Single delegated click listener – survives innerHTML rebuilds
            div.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-remove-layer]');
                if (!btn) return;
                const layerName = btn.getAttribute('data-remove-layer');
                removeLayer(layerName);
            });

            return div;
        }
    });

    legendControl = new LegendControl();
    legendControl.addTo(map);
}

/**
 * Rebuild and show/hide the legend based on current layer visibility.
 * Call this whenever a layer is toggled or the date filter changes.
 */
export function updateLegend() {
    if (!map) return;
    if (!legendControl) initLegend();

    const container = legendControl.getContainer();
    if (!container) return;

    const visibleLayers = LEGEND_LAYERS.filter(l => layerState[l.visibleFlag]);

    if (visibleLayers.length === 0) {
        container.style.display = 'none';
        return;
    }

    const rows = visibleLayers.map(l => {
        const layer = layerState[l.layerKey];
        const count = layer ? layer.getLayers().length : 0;
        const iconObj = icons[l.iconGroup];
        const iconUrl = iconObj ? iconObj.options.iconUrl : '';
        return `<div class="map-legend-row">
            <img src="${iconUrl}" class="map-legend-icon" alt="${l.label}">
            <span class="map-legend-label">${l.label}</span>
            <span class="map-legend-count">${count}</span>
            <button class="map-legend-remove" data-remove-layer="${l.label}" title="Remove layer" aria-label="Remove ${l.label} layer">&times;</button>
        </div>`;
    });

    container.innerHTML = `<div class="map-legend-title">Legend</div>${rows.join('')}`;
    container.style.display = 'block';
}
