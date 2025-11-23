import layerState from './layerState.js';
import { showLayerFromAPI, showOccupiedTerritory, showBattles, removeLayer, refreshAllVisibleLayers } from './map_layers.js'; // Import layer functions
import { loadDefaultText } from './sidebar.js'; // Import sidebar functions

// Declare the map variable globally
export const map = L.map('map').setView([44, 20], 6);

// Load a basic tile layer (like Google Maps)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

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
                // Clear year filter when layer is removed
                clearYearFilter();
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
        // Clear year filter when switching layers
        clearYearFilter();
        showLayerByName(layerName);
    }

    // Update the current layer name in the singleton object
    layerState.currentLayerName = layerName;
}

// Function to clear year filter
function clearYearFilter() {
    layerState.selectedYear = null;
    const allYearButtons = document.querySelectorAll('.year-button');
    allYearButtons.forEach(btn => btn.classList.remove('active'));
}

function showLayerByName(layerName) {
    var markdownFile = '';
    switch (layerName) {
        case 'Occupied Territory':
            markdownFile = 'assets/territory/occupied-territory.md';
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

// Removed the image overlay and GeoJSON code from here as it has been moved to the `showOccupiedTerritory` function.


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

// Year filter button handlers
document.getElementById('year1941').addEventListener('click', () => {
    handleYearFilter(1941);
});

document.getElementById('year1942').addEventListener('click', () => {
    handleYearFilter(1942);
});

document.getElementById('year1943').addEventListener('click', () => {
    handleYearFilter(1943);
});

document.getElementById('year1944').addEventListener('click', () => {
    handleYearFilter(1944);
});

document.getElementById('year1945').addEventListener('click', () => {
    handleYearFilter(1945);
});

// Function to handle year filter
function handleYearFilter(year) {
    // Check if any unit layer is currently visible (not just the current one)
    const hasActiveLayer = layerState.isBrigadesLayerVisible || 
                           layerState.isDetachmentLayerVisible || 
                           layerState.isDivisionLayerVisible || 
                           layerState.isCorpsLayerVisible;
    
    if (!hasActiveLayer) {
        return; // Do nothing if no unit layer is visible
    }
    
    // Toggle year selection
    const yearButton = document.getElementById(`year${year}`);
    const allYearButtons = document.querySelectorAll('.year-button');
    
    if (layerState.selectedYear === year) {
        // Deselect current year
        layerState.selectedYear = null;
        yearButton.classList.remove('active');
    } else {
        // Select new year
        layerState.selectedYear = year;
        
        // Remove active class from all buttons
        allYearButtons.forEach(btn => btn.classList.remove('active'));
        
        // Add active class to clicked button
        yearButton.classList.add('active');
    }
    
    // Refresh all visible layers with the new filter
    refreshAllVisibleLayers();
}