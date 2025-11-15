import { map } from './map.js'; // Import the map object
import { icons } from './constants.js'; // Import the icons object
import { updateSidebar, loadDefaultText } from './sidebar.js'; // Import sidebar functions
import layerState from './layerState.js';

// Generic function to fetch and display data for a layer
export function showLayerFromAPI(apiEndpoint, layerName, markdownFile = null, group = null) {
    const layer = layerState[`${layerName}Layer`];
    const isVisibleFlag = layerState[`is${layerName}LayerVisible`];
    
    if (isVisibleFlag) {
        map.removeLayer(layer);
        layerState[`is${layerName}LayerVisible`] = false;
    } else {
        fetch(apiEndpoint)
            .then(response => response.json())
            .then(data => {
                const newLayer = L.layerGroup().addTo(map);
                data.forEach(item => {
                    const [lng, lat] = item.location.replace('POINT(', '').replace(')', '').split(' ');
                    const marker = L.marker([lat, lng], { icon: icons[group] || L.Icon.Default });

                    marker.on('click', function () {
                        const popupContent = generatePopupContent({
                            name: item.name,
                            datum_formiranja: item.formation_date,
                            description: null, // Exclude description from the pop-up
                            wikipedia_url: item.wikipedia_url
                        });

                        // Unbind any existing popup and bind the new one
                        marker.unbindPopup();
                        marker.bindPopup(popupContent).openPopup();

                        // Update the sidebar with the description
                        if (item.description) {
                            updateSidebar(marked.parse(item.description)); // Render Markdown in the sidebar
                        } else {
                            updateSidebar('<p>No additional details available.</p>'); // Fallback for empty descriptions
                        }
                    });

                    newLayer.addLayer(marker);
                });

                layerState[`${layerName}Layer`] = newLayer;
                layerState[`is${layerName}LayerVisible`] = true;

                // Update the sidebar with default text if a markdown file is provided
                if (markdownFile) {
                    loadDefaultText(markdownFile);
                }
            })
            .catch(error => console.error(`Error fetching data from ${apiEndpoint}:`, error));
    }
}

// Function to show/hide occupied territories on the map
export function showOccupiedTerritory() {
    if (isOccupiedTerritoryLayerVisible) {
        map.removeLayer(occupiedTerritoryLayer);
        isOccupiedTerritoryLayerVisible = false;
    } else {
        fetch('assets/occupied-territory.json')
            .then(response => response.json())
            .then(data => {
                occupiedTerritoryLayer = L.geoJSON(data, {
                    style: (feature) => ({ color: feature.properties.color }),
                    onEachFeature: (feature, layer) => {
                        if (feature.properties) {
                            const popupContent = `
                                <strong>${feature.properties.name || 'Unknown Name'}</strong><br>
                                ${feature.properties.description || ''}
                            `;
                            layer.bindPopup(popupContent);
                        }
                    }
                }).addTo(map);
                isOccupiedTerritoryLayerVisible = true;

                loadDefaultText('assets/occupied-territory.md');
            })
            .catch(error => console.error('Error loading map data:', error));
    }
}

// Function to show/hide battles on the map
export function showBattles() {
    alert('Battles data not available yet.');
}

// Function to remove a layer from the map
export function removeLayer(layerName) {
    switch (layerName) {
        case 'Brigades':
            if (layerState.isBrigadeLayerVisible) {
                map.removeLayer(layerState.brigadeLayer);
                layerState.isBrigadeLayerVisible = false;
            }
            break;
        case 'Detachments':
            if (layerState.isDetachmentLayerVisible) {
                map.removeLayer(layerState.detachmentLayer);
                layerState.isDetachmentLayerVisible = false;
            }
            break;
        case 'Divisions':
            if (layerState.isDivisionLayerVisible) {
                map.removeLayer(layerState.divisionLayer);
                layerState.isDivisionLayerVisible = false;
            }
            break;
        case 'Corps':
            if (layerState.isCorpsLayerVisible) {
                map.removeLayer(layerState.corpsLayer);
                layerState.isCorpsLayerVisible = false;
            }
            break;
        case 'Occupied Territory':
            if (layerState.isOccupiedTerritoryLayerVisible) {
                map.removeLayer(layerState.occupiedTerritoryLayer);
                layerState.isOccupiedTerritoryLayerVisible = false;
            }
            break;
        case 'Battles':
            if (layerState.isBattlesLayerVisible) {
                map.removeLayer(layerState.battlesLayer);
                layerState.isBattlesLayerVisible = false;
            }
            break;
        default:
            console.warn(`Unknown layer: ${layerName}`);
    }
}

// Helper function to format dates as "Month DD, YYYY"
function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: '2-digit' };
    return date.toLocaleDateString('en-US', options);
}

// Helper function to generate compact pop-up content
function generatePopupContent(properties) {
    const formattedDate = properties.datum_formiranja ? formatDate(properties.datum_formiranja) : 'Unknown';
    return `
        <strong>${properties.naziv || properties.name || 'Unknown Name'}</strong><br>
        <small>Formed: ${formattedDate}</small><br>
        ${properties.opis || properties.description ? `<small>${properties.opis || properties.description}</small><br>` : ''}
        ${properties.wikipedia || properties.wikipedia_url ? `<a href="${properties.wikipedia || properties.wikipedia_url}" target="_blank">Wikipedia</a>` : ''}
    `;
}

