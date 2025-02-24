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
                                    marker.bindPopup(popupContent).openPopup();
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
                                            marker.bindPopup(popupContent).openPopup();
                                        })
                                        .catch(error => console.error('Error fetching Wikipedia data:', error));
                                }
                            } else {
                                // Default popup content for markers without Wikipedia property
                                marker.bindPopup(popupContent).openPopup();
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
            mapElement.style.transform = 'translateX(150px)';
            content.classList.add('visible');
            showLayerByName(layerName);
        }
    } else {
        // If a different button is clicked, change the content and show the sidebar
        sidebar.classList.add('visible');
        mapElement.style.transform = 'translateX(150px)';
        content.classList.add('visible');
        showLayerByName(layerName);
    }

    // Update the current layer name
    currentLayerName = layerName;
}

function showLayerByName(layerName) {
    switch (layerName) {
        case 'Occupied Territory':
            content.innerHTML = `
                <h1>Yugoslavia Occupied Territories - April 1941</h1>
                <p>In April 1941, Yugoslavia was invaded and divided by Axis powers: </p>
                <ul>
                    <li><strong>Germany</strong> took northern and central Yugoslavia, including Serbia.</li>
                    <li><strong>Italy</strong> controlled parts of Slovenia, Dalmatian coast, and Montenegro.</li>
                    <li><strong>Hungary</strong> annexed northern territories.</li>
                    <li><strong>Bulgaria</strong> occupied Macedonia.</li>
                    <li><strong>Independent State of Croatia (NDH)</strong> was established under German and Italian control.</li>
                </ul>
            `;
            showOccupiedTerritory();
            break;
        case 'Detachments':
            content.innerHTML = `
                <h1>Detachments</h1>
                <p>Information about detachments will be displayed here.</p>
            `;
            showDetachments();
            break;
        case 'Brigades':
            content.innerHTML = `
                <h1>Brigades</h1>
                <p>Information about brigades will be displayed here.</p>
            `;
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

// Function to show/hide brigades on the map
function showBrigades() {
    isBrigadeLayerVisible = showLayer('assets/dalmatia-brigades.json', brigadeLayer, isBrigadeLayerVisible, 100, (layer) => brigadeLayer = layer, (flag) => isBrigadeLayerVisible = flag);
}

// Function to show/hide detachments on the map
function showDetachments() {
    isDetachmentLayerVisible = showLayer('assets/dalmatia-odredi.json', detachmentLayer, isDetachmentLayerVisible, 100, (layer) => detachmentLayer = layer, (flag) => isDetachmentLayerVisible = flag);
}

// Function to show/hide divisions on the map
function showDivisions() {
    isDivisionLayerVisible = showLayer('assets/divizije.json', divisionLayer, isDivisionLayerVisible, 100, (layer) => divisionLayer = layer, (flag) => isDivisionLayerVisible = flag);
}

// Function to show/hide corpuses on the map
function showCorpuses() {
    isCorpusesLayerVisible = showLayer('assets/korpusi.json', corpusesLayer, isCorpusesLayerVisible, 100, (layer) => corpusesLayer = layer, (flag) => isCorpusesLayerVisible = flag);
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
                        if (feature.properties && feature.properties.popup) {
                            layer.bindTooltip(feature.properties.popup, { permanent: false, direction: "auto" });
                        }
                    }
                }).addTo(map);
                isOccupiedTerritoryLayerVisible = true;
            })
            .catch(error => console.error('Error loading map data:', error));
    }
}

// Placeholder functions for other menu options
function showBattles() {
    alert('Battles data not available yet.');
}