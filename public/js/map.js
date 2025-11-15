import layerState from './layerState.js';
import { showLayerFromAPI, showOccupiedTerritory, showBattles, removeLayer } from './map_layers.js'; // Import layer functions
import { updateSidebar, loadDefaultText } from './sidebar.js'; // Import sidebar functions

// Declare the map variable globally
export const map = L.map('map').setView([44, 20], 6);

// Load a basic tile layer (like Google Maps)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);


// Function to color each occupied area
function style(feature) {
    return {
        fillColor: feature.properties.color,
        weight: 2,
        opacity: 1,
        color: 'black',
        fillOpacity: 0.5
    };
}

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

function toggleSidebar(layerName) {
    const sidebar = document.getElementById('sidebar');
    const content = document.getElementById('content');
    const mapElement = document.getElementById('map');

    if (layerState.currentLayerName === layerName) { // Use the singleton object
        // If the same button is clicked, toggle the sidebar visibility and remove the layer
        if (sidebar.classList.contains('visible')) {
            sidebar.classList.remove('visible');
            mapElement.style.transform = 'translateX(0)';
            content.classList.remove('visible');
            console.log('Layer state before removing:', layerState);
            removeLayer(layerName);
            console.log('Layer state after removing:', layerState);
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
            showDetachments();
            break;
        case 'Brigades':
            markdownFile = 'assets/brigades.md';
            showBrigades();
            break;
        case 'Divisions':
            content.innerHTML = `
                <h1>Divisions</h1>
                <p>Information about divisions will be displayed here.</p>
            `;
            showDivisions();
            break;
        case 'Corps':
            content.innerHTML = `
                <h1>Corps</h1>
                <p>Information about corps will be displayed here.</p>
            `;
            showCorps();
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


// Function to show/hide brigades on the map
function showBrigades() {
    showLayerFromAPI('/api/brigades', 'brigadeLayer', 'assets/brigades.md', 'brigades');
}

// Function to show/hide detachments on the map
function showDetachments() {
    showLayerFromAPI('/api/detachments', 'detachmentLayer', 'assets/detachments.md', 'detachments');
}

// Function to show/hide divisions on the map
function showDivisions() {
    showLayerFromAPI('/api/divisions', 'divisionLayer', 'assets/divizije.md', 'divisions');
}

// Function to show/hide corps on the map
function showCorps() {
    showLayerFromAPI('/api/corps', 'corpsLayer', 'assets/korpusi.md', 'corps');
}

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