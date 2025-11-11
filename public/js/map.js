// Declare the map variable globally
window.map = L.map('map').setView([44, 20], 6);

// Load a basic tile layer (like Google Maps)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(window.map);

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

// Function to update the sidebar content
function updateSidebar(content) {
    var sidebarContent = document.getElementById('content');
    sidebarContent.innerHTML = content;
}

// Function to load default text from a Markdown file
function loadDefaultText(markdownFile) {
    fetch(markdownFile)
        .then(response => response.text())
        .then(markdown => {
            updateSidebar(marked.parse(markdown));
        })
        .catch(error => console.error('Error loading default text:', error));
}

var brigadeLayer;
var isBrigadeLayerVisible = false;
var occupiedTerritoryLayer;
var isOccupiedTerritoryLayerVisible = false;
var detachmentLayer;
var isDetachmentLayerVisible = false;
var divisionLayer;
var isDivisionLayerVisible = false;
var corpsLayer;
var isCorpsLayerVisible = false;
var currentLayerName = '';

// Add a map click event to reset the sidebar to default text
map.on('click', function () {
    var markdownFile = '';
    switch (currentLayerName) {
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
    var sidebar = document.getElementById('sidebar');
    var content = document.getElementById('content');
    var mapElement = document.getElementById('map');

    if (currentLayerName === layerName) {
        // If the same button is clicked, toggle the sidebar visibility and remove the layer
        if (sidebar.classList.contains('visible')) {
            sidebar.classList.remove('visible');
            mapElement.style.transform = 'translateX(0)';
            content.classList.remove('visible');
            removeLayer(layerName);
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

    // Update the current layer name
    currentLayerName = layerName;
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

function removeLayer(layerName) {
    switch (layerName) {
        case 'Occupied Territory':
            if (isOccupiedTerritoryLayerVisible) {
                map.removeLayer(occupiedTerritoryLayer);
                isOccupiedTerritoryLayerVisible = false;
            }
            break;
        case 'Detachments':
            if (isDetachmentLayerVisible) {
                map.removeLayer(detachmentLayer);
                isDetachmentLayerVisible = false;
            }
            break;
        case 'Brigades':
            if (isBrigadeLayerVisible) {
                map.removeLayer(brigadeLayer);
                isBrigadeLayerVisible = false;
            }
            break;
        case 'Divisions':
            if (isDivisionLayerVisible) {
                map.removeLayer(divisionLayer);
                isDivisionLayerVisible = false;
            }
            break;
        case 'Corps':
            if (isCorpsLayerVisible) {
                map.removeLayer(corpsLayer);
                isCorpsLayerVisible = false;
            }
            break;
        case 'Battles':
            // Placeholder for battles layer removal
            break;
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

// Define custom icons for each group
const icons = {
    brigades: L.icon({
        iconUrl: 'assets/icons/brigades-icon.png', // Replace with the actual filename
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    }),
    detachments: L.icon({
        iconUrl: 'assets/icons/detachments-icon.png', // Replace with the actual filename
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    }),
    divisions: L.icon({
        iconUrl: 'assets/icons/divisions-icon.png', // Replace with the actual filename
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    }),
    corps: L.icon({
        iconUrl: 'assets/icons/corps-icon.png', // Replace with the actual filename
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    })
};

// Generic function to fetch and display data for a layer
function showLayerFromAPI(apiEndpoint, layer, isVisibleFlag, setLayer, setVisibleFlag, markdownFile = null, group = null) {
    if (isVisibleFlag) {
        map.removeLayer(layer);
        setVisibleFlag(false);
    } else {
        fetch(apiEndpoint)
            .then(response => response.json())
            .then(data => {
                layer = L.layerGroup().addTo(map);
                setLayer(layer);
                data.forEach(item => {
                    const [lng, lat] = item.location.replace('POINT(', '').replace(')', '').split(' ');
                    const marker = L.marker([lat, lng], { icon: icons[group] || L.Icon.Default }); // Use group-specific icon
                    marker.on('click', function () {
                        const popupContent = generatePopupContent({
                            name: item.name,
                            datum_formiranja: item.formation_date,
                            description: null, // Exclude description from the pop-up
                            wikipedia_url: item.wikipedia_url
                        });
                        marker.bindPopup(popupContent).openPopup();

                        // Update the sidebar with the description
                        if (item.description) {
                            updateSidebar(marked.parse(item.description)); // Render Markdown in the sidebar
                        } else {
                            updateSidebar('<p>No additional details available.</p>'); // Fallback for empty descriptions
                        }
                    });
                    layer.addLayer(marker);
                });
                setVisibleFlag(true);

                // Update the sidebar with default text if a markdown file is provided
                if (markdownFile) {
                    loadDefaultText(markdownFile);
                }
            })
            .catch(error => console.error(`Error fetching data from ${apiEndpoint}:`, error));
    }
}

// Function to show/hide brigades on the map
function showBrigades() {
    showLayerFromAPI('/api/brigades', brigadeLayer, isBrigadeLayerVisible, (layer) => brigadeLayer = layer, (flag) => isBrigadeLayerVisible = flag, 'assets/brigades.md', 'brigades');
}

// Function to show/hide detachments on the map
function showDetachments() {
    showLayerFromAPI('/api/detachments', detachmentLayer, isDetachmentLayerVisible, (layer) => detachmentLayer = layer, (flag) => isDetachmentLayerVisible = flag, 'assets/detachments.md', 'detachments');
}

// Function to show/hide divisions on the map
function showDivisions() {
    showLayerFromAPI('/api/divisions', divisionLayer, isDivisionLayerVisible, (layer) => divisionLayer = layer, (flag) => isDivisionLayerVisible = flag, 'assets/divizije.md', 'divisions');
}

// Function to show/hide corps on the map
function showCorps() {
    showLayerFromAPI('/api/corps', corpsLayer, isCorpsLayerVisible, (layer) => corpsLayer = layer, (flag) => isCorpsLayerVisible = flag, 'assets/korpusi.md', 'corps');
}

// Function to show/hide occupied territories on the map
function showOccupiedTerritory() {
    if (isOccupiedTerritoryLayerVisible) {
        map.removeLayer(occupiedTerritoryLayer);
        isOccupiedTerritoryLayerVisible = false;
    } else {
        fetch('assets/occupied-territory.json')
            .then(response => response.json())
            .then (data => {
                occupiedTerritoryLayer = L.geoJSON(data, {
                    style: function (feature) {
                        return { color: feature.properties.color };
                    },
                    onEachFeature: function (feature, layer) {
                        if (feature.properties) {
                            const popupContent = generatePopupContent(feature.properties);
                            layer.bindPopup(popupContent);
                        }
                    }
                }).addTo(map);
                isOccupiedTerritoryLayerVisible = true;

                // Update the sidebar with default text for occupied territories
                loadDefaultText('assets/occupied-territory.md');
            })
            .catch(error => console.error('Error loading map data:', error));
    }
}

// Function to show/hide battles on the map
function showBattles() {
    alert('Battles data not available yet.');
}