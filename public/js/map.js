// Initialize map centered on Yugoslavia
var map = L.map('map').setView([44, 20], 6);

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
var corpusesLayer;
var isCorpusesLayerVisible = false;
var currentLayerName = '';

function showLayer(url, layer, isVisibleFlag, delay, setLayer, setVisibleFlag) {
    if (isVisibleFlag) {
        map.removeLayer(layer);
        setVisibleFlag(false);
    } else {
        fetch(url)
            .then(response => response.json())
            .then(data => {
                // Sort features by datum_formiranja
                data.features.sort((a, b) => new Date(a.properties.datum_formiranja) - new Date(b.properties.datum_formiranja));

                // Create a layer group to hold the markers
                layer = L.layerGroup().addTo(map);
                setLayer(layer);

                // Add markers with a delay
                data.features.forEach((feature, index) => {
                    setTimeout(() => {
                        var marker = L.marker([feature.geometry.coordinates[1], feature.geometry.coordinates[0]]);
                        marker.on('click', function () {
                            var popupContent = feature.properties.popup.replace('{datum_formiranja}', feature.properties.datum_formiranja);
                            if (feature.properties.wikipedia) {
                                if (feature.properties.wikipedia.startsWith('http')) {
                                    // Custom Wikipedia URL
                                    popupContent += `<br><a href="${feature.properties.wikipedia}" target="_blank">Read more on Wikipedia</a>`;
                                    marker.bindPopup(popupContent).openPopup(); // Bind and open the popup
                                    updateSidebar(popupContent); // Update the sidebar with the popup content
                                } else {
                                    // Fetch data from Wikipedia API
                                    fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${feature.properties.wikipedia}`)
                                        .then(response => response.json())
                                        .then(wikiData => {
                                            popupContent += `
                                                <p>${wikiData.extract}</p>
                                                ${wikiData.thumbnail ? `<img src="${wikiData.thumbnail.source}" alt="${feature.properties.naziv}">` : ''}
                                                <br><a href="${wikiData.content_urls.desktop.page}" target="_blank">Read more on Wikipedia</a>
                                            `;
                                            marker.bindPopup(popupContent).openPopup(); // Bind and open the popup
                                            updateSidebar(popupContent); // Update the sidebar with Wikipedia data
                                        })
                                        .catch(error => console.error('Error fetching Wikipedia data:', error));
                                }
                            } else {
                                // Default popup content for markers without Wikipedia property
                                marker.bindPopup(popupContent).openPopup(); // Bind and open the popup
                                updateSidebar(popupContent); // Update the sidebar with the popup content
                            }
                        });
                        layer.addLayer(marker);
                    }, index * delay); // Delay between each marker
                });

                setVisibleFlag(true);
            })
            .catch(error => console.error('Error loading data:', error));
    }
}

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
        case 'Corpuses':
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
        case 'Corpuses':
            content.innerHTML = `
                <h1>Corpuses</h1>
                <p>Information about corpuses will be displayed here.</p>
            `;
            showCorpuses();
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
        case 'Corpuses':
            if (isCorpusesLayerVisible) {
                map.removeLayer(corpusesLayer);
                isCorpusesLayerVisible = false;
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

// Function to show/hide brigades on the map
function showBrigades() {
    if (isBrigadeLayerVisible) {
        map.removeLayer(brigadeLayer);
        isBrigadeLayerVisible = false;
    } else {
        fetch('/api/brigades')
            .then(response => response.json())
            .then(data => {
                brigadeLayer = L.layerGroup().addTo(map);
                data.forEach(brigade => {
                    const [lng, lat] = brigade.location.replace('POINT(', '').replace(')', '').split(' ');
                    const marker = L.marker([lat, lng]);
                    marker.on('click', function () {
                        const popupContent = generatePopupContent({
                            name: brigade.name,
                            datum_formiranja: brigade.formation_date,
                            description: brigade.description,
                            wikipedia_url: brigade.wikipedia_url
                        });
                        marker.bindPopup(popupContent).openPopup();
                        updateSidebar(popupContent);
                    });
                    brigadeLayer.addLayer(marker);
                });
                isBrigadeLayerVisible = true;
            })
            .catch(error => console.error('Error fetching brigades:', error));
    }
}

// Function to show/hide occupied territories on the map
function showOccupiedTerritory() {
    if (isOccupiedTerritoryLayerVisible) {
        map.removeLayer(occupiedTerritoryLayer);
        isOccupiedTerritoryLayerVisible = false;
    } else {
        fetch('assets/occupied-territory.json')
            .then(response => response.json())
            .then(data => {
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
            })
            .catch(error => console.error('Error loading map data:', error));
    }
}

// Function to show/hide detachments on the map
function showDetachments() {
    if (isDetachmentLayerVisible) {
        map.removeLayer(detachmentLayer);
        isDetachmentLayerVisible = false;
    } else {
        fetch('/api/detachments')
            .then(response => response.json())
            .then(data => {
                detachmentLayer = L.layerGroup().addTo(map);
                data.forEach(detachment => {
                    const [lng, lat] = detachment.location.replace('POINT(', '').replace(')', '').split(' ');
                    const marker = L.marker([lat, lng]);
                    marker.on('click', function () {
                        const popupContent = generatePopupContent({
                            name: detachment.name,
                            datum_formiranja: detachment.formation_date,
                            description: detachment.description,
                            wikipedia_url: detachment.wikipedia_url
                        });
                        marker.bindPopup(popupContent).openPopup();
                        updateSidebar(popupContent);
                    });
                    detachmentLayer.addLayer(marker);
                });
                isDetachmentLayerVisible = true;
            })
            .catch(error => console.error('Error fetching detachments:', error));
    }
}

// Function to show/hide divisions on the map
function showDivisions() {
    if (isDivisionLayerVisible) {
        map.removeLayer(divisionLayer);
        isDivisionLayerVisible = false;
    } else {
        fetch('/api/divisions')
            .then(response => response.json())
            .then(data => {
                divisionLayer = L.layerGroup().addTo(map);
                data.forEach(division => {
                    const [lng, lat] = division.location.replace('POINT(', '').replace(')', '').split(' ');
                    const marker = L.marker([lat, lng]);
                    marker.on('click', function () {
                        const popupContent = generatePopupContent({
                            name: division.name,
                            datum_formiranja: division.formation_date,
                            description: division.description,
                            wikipedia_url: division.wikipedia_url
                        });
                        marker.bindPopup(popupContent).openPopup();
                        updateSidebar(popupContent);
                    });
                    divisionLayer.addLayer(marker);
                });
                isDivisionLayerVisible = true;
            })
            .catch(error => console.error('Error fetching divisions:', error));
    }
}

// Function to show/hide corpuses on the map
function showCorpuses() {
    if (isCorpusesLayerVisible) {
        map.removeLayer(corpusesLayer);
        isCorpusesLayerVisible = false;
    } else {
        fetch('/api/corpuses')
            .then(response => response.json())
            .then(data => {
                corpusesLayer = L.layerGroup().addTo(map);
                data.forEach(corpus => {
                    const [lng, lat] = corpus.location.replace('POINT(', '').replace(')', '').split(' ');
                    const marker = L.marker([lat, lng]);
                    marker.on('click', function () {
                        const popupContent = generatePopupContent({
                            name: corpus.name,
                            datum_formiranja: corpus.formation_date,
                            description: corpus.description,
                            wikipedia_url: corpus.wikipedia_url
                        });
                        marker.bindPopup(popupContent).openPopup();
                        updateSidebar(popupContent);
                    });
                    corpusesLayer.addLayer(marker);
                });
                isCorpusesLayerVisible = true;
            })
            .catch(error => console.error('Error fetching corpuses:', error));
    }
}

// Function to show/hide battles on the map
function showBattles() {
    alert('Battles data not available yet.');
}