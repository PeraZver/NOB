import layerState from './layerState.js';
import { showLayerFromAPI, showOccupiedTerritory, showBattles, removeLayer } from './map_layers.js'; // Import layer functions
import { loadDefaultText } from './sidebar.js'; // Import sidebar functions

// Declare the map variable globally
export const map = L.map('map').setView([44, 20], 6);

// Load a basic tile layer (like Google Maps)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Add an image overlay for the occupied zones during WW2
const imageUrl = '../img/NDHOccupationZonesLocatorMap.png'; // Path to the image in public/img
const imageBounds = [[42.14, 14.15], 
                     [46.75, 20.682]]; // Replace with the actual bounds of your image

const occupiedZonesOverlay = L.imageOverlay(imageUrl, imageBounds, {
    opacity: 0.7, // Fully opaque
    interactive: true, // Set to true if you want the image to capture events
    zIndex: 10 // Ensure it appears above other layers
});

// Add the overlay to the map
occupiedZonesOverlay.addTo(map);

map.on('click', function (e) {
    console.log(`Clicked at ${e.latlng.lat}, ${e.latlng.lng}`);
});

// Add a map click event to reset the sidebar to default text
map.on('click', function () {
    var markdownFile = '';
    switch (layerState.currentLayerName) { // Use the singleton object
        case 'Occupied Territory':
            markdownFile = 'assets/occupied-territory.md';
            break;
        case 'Detachments':
            markdownFile = 'assets/detachments.md';
            break;
        case 'Brigades':
            markdownFile = 'assets/brigades.md';
            break;
        case 'Divisions':
            markdownFile = 'assets/divizije.md';
            break;
        case 'Corps':
            markdownFile = 'assets/korpusi.md';
            break;
        case 'Battles':
            markdownFile = 'assets/battles.md';
            break;
    }
    if (markdownFile) {
        loadDefaultText(markdownFile); // Load the default text for the current layer
    }
});

export function toggleSidebar(layerName, shouldRemoveLayer = true) {
    const sidebar = document.getElementById('sidebar');
    const content = document.getElementById('content');
    const mapElement = document.getElementById('map');

    if (layerState.currentLayerName === layerName) { // Use the singleton object
        // If the same button is clicked, toggle the sidebar visibility and remove the layer
        if (sidebar.classList.contains('visible')) {
            if (shouldRemoveLayer) {
                sidebar.classList.remove('visible');
                mapElement.style.transform = 'translateX(0)';
                content.classList.remove('visible');
                removeLayer(layerName);
            }
        } else {
            sidebar.classList.add('visible');
            mapElement.style.transform = 'translateX(50%)'; // Adjust this value to match the CSS
            content.classList.add('visible');
            showLayerByName(layerName);
        }
    } else {
        // If a different button is clicked, change the content and show the sidebar
        sidebar.classList.add('visible');
        mapElement.style.transform = 'translateX(50%)'; // Adjust this value to match the CSS
        content.classList.add('visible');
        if (shouldRemoveLayer) {
                removeLayer(layerName); // Remove the layer only if removeLayer is true
            }
        showLayerByName(layerName);
    }

    // Update the current layer name in the singleton object
    layerState.currentLayerName = layerName;
}

function showLayerByName(layerName) {
    var markdownFile = '';
    switch (layerName) {
        case 'Occupied Territory':
            markdownFile = 'assets/occupied-territory.md';
            showOccupiedTerritory();
            break;
        case 'Detachments':
            markdownFile = 'assets/detachments.md';
            showLayerFromAPI('/api/detachments', 'detachmentLayer', 'assets/detachments.md', 'detachments');
            break;
        case 'Brigades':
            markdownFile = 'assets/brigades.md';
            showLayerFromAPI('/api/brigades', 'brigadesLayer', 'assets/brigades.md', 'brigades');
            break;
        case 'Divisions':
            content.innerHTML = `
                <h1>Divisions</h1>
                <p>Information about divisions will be displayed here.</p>
            `;
            showLayerFromAPI('/api/divisions', 'divisionLayer', 'assets/divizije.md', 'divisions');
            break;
        case 'Corps':
            content.innerHTML = `
                <h1>Corps</h1>
                <p>Information about corps will be displayed here.</p>
            `;
            showLayerFromAPI('/api/corps', 'corpsLayer', 'assets/korpusi.md', 'corps');
            break;
        case 'Battles':
            content.innerHTML = `
                <h1>Battles</h1>
                <p>Information about battles will be displayed here.</p>
            `;
            showBattles();
            break;
    }

    if (markdownFile) {
        fetch(markdownFile)
            .then(response => response.text())
            .then(markdown => {
                content.innerHTML = marked.parse(markdown);
            })
            .catch(error => console.error('Error loading content:', error));
    }
}

// Load and display the NDH borders GeoJSON file
fetch('../assets/territory/image_borders.geojson')
    .then(response => response.json())
    .then(data => {
        const ndhBordersLayer = L.geoJSON(data, {
            style: {
                color: 'blue', // Set the border color
                weight: 2,     // Set the border thickness
                opacity: 1     // Ensure full opacity
            }
        });
        ndhBordersLayer.addTo(map); // Add the layer to the map
    })
    .catch(error => console.error('Error loading GeoJSON:', error));


document.getElementById('toggleOccupiedTerritory').addEventListener('click', () => {
    toggleSidebar('Occupied Territory');
});

document.getElementById('toggleDetachments').addEventListener('click', () => {
    toggleSidebar('Detachments');
});

document.getElementById('toggleBrigades').addEventListener('click', () => {
    toggleSidebar('Brigades');
});

document.getElementById('toggleDivisions').addEventListener('click', () => {
    toggleSidebar('Divisions');
});

document.getElementById('toggleCorps').addEventListener('click', () => {
    toggleSidebar('Corps');
});

document.getElementById('toggleBattles').addEventListener('click', () => {
    toggleSidebar('Battles');
});