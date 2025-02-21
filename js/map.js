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

// Function to show/hide brigades on the map
function showBrigades() {
    isBrigadeLayerVisible = showLayer('assets/dalmatia-brigades.json', brigadeLayer, isBrigadeLayerVisible, 100, (layer) => brigadeLayer = layer, (flag) => isBrigadeLayerVisible = flag);
}

// Function to show/hide detachments on the map
function showDetachments() {
    isDetachmentLayerVisible = showLayer('assets/dalmatia-odredi.json', detachmentLayer, isDetachmentLayerVisible, 100, (layer) => detachmentLayer = layer, (flag) => isDetachmentLayerVisible = flag);
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
function showDivisions() {
    alert('Divisions data not available yet.');
}

function showCorpuses() {
    alert('Corpuses data not available yet.');
}

function showBattles() {
    alert('Battles data not available yet.');
}