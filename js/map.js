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

// Function to show/hide brigades on the map
function showBrigades() {
    if (isBrigadeLayerVisible) {
        map.removeLayer(brigadeLayer);
        isBrigadeLayerVisible = false;
    } else {
        fetch('assets/dalmatia-brigades.json')
            .then(response => response.json())
            .then(data => {
                brigadeLayer = L.geoJSON(data, {
                    pointToLayer: function (feature, latlng) {
                        var marker = L.marker(latlng);
                        marker.on('click', function () {
                            if (feature.properties.wikipedia) {
                                if (feature.properties.wikipedia.startsWith('http')) {
                                    // Custom Wikipedia URL
                                    var popupContent = `
                                        <b>${feature.properties.naziv}</b><br>
                                        Formed on: ${feature.properties.datum_formiranja}<br>
                                        Location: ${feature.properties.mesto_formiranja}<br>
                                        <a href="${feature.properties.wikipedia}" target="_blank">Read more on Wikipedia</a>
                                    `;
                                    marker.bindPopup(popupContent).openPopup();
                                } else {
                                    // Fetch data from Wikipedia API
                                    fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${feature.properties.wikipedia}`)
                                        .then(response => response.json())
                                        .then(wikiData => {
                                            var popupContent = `
                                                <b>${feature.properties.naziv}</b><br>
                                                Formed on: ${feature.properties.datum_formiranja}<br>
                                                Location: ${feature.properties.mesto_formiranja}<br>
                                                <p>${wikiData.extract}</p>
                                                ${wikiData.thumbnail ? `<img src="${wikiData.thumbnail.source}" alt="${feature.properties.naziv}">` : ''}
                                                <a href="${wikiData.content_urls.desktop.page}" target="_blank">Read more on Wikipedia</a>
                                            `;
                                            marker.bindPopup(popupContent).openPopup();
                                        })
                                        .catch(error => console.error('Error fetching Wikipedia data:', error));
                                }
                            } else {
                                // Default popup content for markers without Wikipedia property
                                var popupContent = `
                                    <b>${feature.properties.naziv}</b><br>
                                    Formed on: ${feature.properties.datum_formiranja}<br>
                                    Location: ${feature.properties.mesto_formiranja}
                                `;
                                marker.bindPopup(popupContent).openPopup();
                            }
                        });
                        return marker;
                    }
                }).addTo(map);
                isBrigadeLayerVisible = true;
            })
            .catch(error => console.error('Error loading brigades data:', error));
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
function showDetachments() {
    alert('Detachments data not available yet.');
}

function showDivisions() {
    alert('Divisions data not available yet.');
}

function showCorpuses() {
    alert('Corpuses data not available yet.');
}

function showBattles() {
    alert('Battles data not available yet.');
}