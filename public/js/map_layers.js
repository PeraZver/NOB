import { map } from './map.js'; // Import the map object
import { icons } from './constants.js'; // Import the icons object
import { updateSidebar, loadDefaultText } from './sidebar.js'; // Import sidebar functions
import layerState from './layerState.js';

// Add an image overlay for the occupied zones during WW2
const imageUrl = '../img/NDHOccupationZonesLocatorMap.png'; // Path to the image in public/img
const imageBounds = [[42.14, 14.15], 
                    [46.75, 20.682]]; // Replace with the actual bounds of your image

// Generic function to fetch and display data for a layer
export function showLayerFromAPI(apiEndpoint, layerName, markdownFile = null, group = null) {
    const capitalizedLayerName = layerName.charAt(0).toUpperCase() + layerName.slice(1); // Capitalize the first letter
    const layer = layerState[`${layerName}`];
    const isVisibleFlag = layerState[`is${capitalizedLayerName}Visible`];
    
    if (isVisibleFlag && layer) {
        map.removeLayer(layer);
        layerState[`${layerName}`] = null; // Clear the layer reference
        layerState[`is${capitalizedLayerName}Visible`] = false;
    } else {
        fetch(apiEndpoint)
            .then(response => response.json())
            .then(data => {
                // Store all data for filtering
                layerState.allLayerData[layerName] = data;
                
                // Filter data based on selected year
                const filteredData = filterDataByYear(data, layerState.selectedYear);
                
                const newLayer = L.layerGroup().addTo(map);
                filteredData.forEach(item => {
                    const [lng, lat] = item.location.replace('POINT(', '').replace(')', '').split(' ');
                    const marker = L.marker([lat, lng], { icon: icons[group] || L.Icon.Default });

                    // Add label next to the marker
                    marker.bindTooltip(item.name || 'Unknown', {
                        permanent: true,
                        direction: 'right',
                        className: 'marker-label'
                    });

                    marker.on('click', () => handleMarkerClick(marker, item));

                    newLayer.addLayer(marker);
                });

                layerState[`${layerName}`] = newLayer;
                layerState[`is${capitalizedLayerName}Visible`] = true;

                // Update the sidebar with default text if a markdown file is provided
                if (markdownFile) {
                    loadDefaultText(markdownFile);
                }
            })
            .catch(error => console.error(`Error fetching data from ${apiEndpoint}:`, error));
    }
}

// Function to filter data by year
function filterDataByYear(data, selectedYear) {
    if (!selectedYear) {
        return data; // No filter applied
    }
    
    return data.filter(item => {
        if (!item.formation_date) {
            return false; // Exclude items without formation date
        }
        
        const formationYear = new Date(item.formation_date).getFullYear();
        // Show units formed in the selected year or earlier
        return formationYear <= selectedYear;
    });
}

// Function to refresh the current layer with year filter
export function refreshCurrentLayer() {
    const currentLayer = layerState.currentLayerName;
    
    if (!currentLayer) {
        return; // No layer is currently active
    }
    
    // Map layer names to their API endpoints and layer identifiers
    const layerMapping = {
        'Detachments': { api: '/api/detachments', layerName: 'detachmentLayer', markdown: 'assets/detachments.md', group: 'detachments' },
        'Brigades': { api: '/api/brigades', layerName: 'brigadesLayer', markdown: 'assets/brigades.md', group: 'brigades' },
        'Divisions': { api: '/api/divisions', layerName: 'divisionLayer', markdown: 'assets/divizije.md', group: 'divisions' },
        'Corps': { api: '/api/corps', layerName: 'corpsLayer', markdown: 'assets/korpusi.md', group: 'corps' }
    };
    
    const layerInfo = layerMapping[currentLayer];
    if (!layerInfo) {
        return; // Current layer doesn't support filtering
    }
    
    // Get stored data
    const storedData = layerState.allLayerData[layerInfo.layerName];
    if (!storedData) {
        return; // No data stored yet
    }
    
    // Remove existing layer
    const capitalizedLayerName = layerInfo.layerName.charAt(0).toUpperCase() + layerInfo.layerName.slice(1);
    const layer = layerState[layerInfo.layerName];
    if (layer) {
        map.removeLayer(layer);
    }
    
    // Filter and redraw
    const filteredData = filterDataByYear(storedData, layerState.selectedYear);
    const newLayer = L.layerGroup().addTo(map);
    
    filteredData.forEach(item => {
        const [lng, lat] = item.location.replace('POINT(', '').replace(')', '').split(' ');
        const marker = L.marker([lat, lng], { icon: icons[layerInfo.group] || L.Icon.Default });

        // Add label next to the marker
        marker.bindTooltip(item.name || 'Unknown', {
            permanent: true,
            direction: 'right',
            className: 'marker-label'
        });

        marker.on('click', () => handleMarkerClick(marker, item));

        newLayer.addLayer(marker);
    });
    
    layerState[layerInfo.layerName] = newLayer;
    layerState[`is${capitalizedLayerName}Visible`] = true;
}

// Function to show/hide occupied territories on the map
export function showOccupiedTerritory() {
    if (layerState.isOccupiedTerritoryVisible) {
        map.removeLayer(layerState.occupiedTerritoryLayer);
        layerState.isOccupiedTerritoryLayerVisible = false;
        
    } 
    else {
        layerState.occupiedTerritoryLayer  =L.imageOverlay(imageUrl, imageBounds, {
            opacity: 0.7, // Fully opaque
            interactive: true, // Set to true if you want the image to capture events
            zIndex: 10 // Ensure it appears above other layers
        }).addTo(map);
        layerState.isOccupiedTerritoryLayerVisible = true;
        loadDefaultText('assets/territory/occupied-territory.md');
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
            if (layerState.isBrigadesLayerVisible) {
                map.removeLayer(layerState.brigadesLayer);
                layerState.isBrigadesLayerVisible = false;
                layerState.brigadesLayer = null;
            }
            break;
        case 'Detachments':
            if (layerState.isDetachmentLayerVisible) {
                map.removeLayer(layerState.detachmentLayer);
                layerState.isDetachmentLayerVisible = false;
                layerState.detachmentLayer = null;
            }
            break;
        case 'Divisions':
            if (layerState.isDivisionLayerVisible) {
                map.removeLayer(layerState.divisionLayer);
                layerState.isDivisionLayerVisible = false;
                layerState.divisionLayer = null;
            }
            break;
        case 'Corps':
            if (layerState.isCorpsLayerVisible) {
                map.removeLayer(layerState.corpsLayer);
                layerState.isCorpsLayerVisible = false;
                layerState.corpsLayer = null;
            }
            break;
        case 'Occupied Territory':
            if (layerState.isOccupiedTerritoryLayerVisible) {
                map.removeLayer(layerState.occupiedTerritoryLayer);
                layerState.isOccupiedTerritoryLayerVisible = false;
                layerState.occupiedTerritoryLayer = null;
            }
            break;
        case 'Battles':
            if (layerState.isBattlesLayerVisible) {
                map.removeLayer(layerState.battlesLayer);
                layerState.isBattlesLayerVisible = false;
                layerState.battlesLayer = null;
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
    const formationSite = properties.formation_site || 'Unknown location'; // Default to "Unknown location" if not provided

    return `
        <strong>${properties.naziv || properties.name || 'Unknown Name'}</strong><br>
        <small>Formed on ${formattedDate} <br> at ${formationSite}</small><br>
        ${properties.opis || properties.description ? `<small>${properties.opis || properties.description}</small><br>` : ''}
        ${properties.wikipedia || properties.wikipedia_url ? `<a href="${properties.wikipedia || properties.wikipedia_url}" target="_blank">Wikipedia</a>` : ''}
    `;
}

// Function to handle marker clicks
export function handleMarkerClick(marker, item) {
    console.log('Marker in handleMarkerClick:', marker);
    const popupContent = generatePopupContent({
                    name: item.name,
                    datum_formiranja: item.formation_date,
                    formation_site: item.formation_site,
                    description: null, // Exclude description from the pop-up
                    wikipedia_url: item.wikipedia_url
                    });

    // Bind and open the popup
    marker.unbindPopup();
    marker.bindPopup(popupContent).openPopup();

    // Update the sidebar with the item's description
    if (item.description) {
        updateSidebar(marked.parse(item.description)); // Render Markdown content
    } else {
        updateSidebar('<p>No additional details available.</p>');
    }
}