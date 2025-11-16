import { map, toggleSidebar } from './map.js'; // Import the map object
import { handleMarkerClick } from './map_layers.js';
import layerState from './layerState.js';

// DOM Elements
const searchBox = document.getElementById('search-box');
const suggestionsBox = document.getElementById('suggestions');

// Fetch suggestions dynamically
async function fetchSuggestions(query) {
    if (!query) {
        suggestionsBox.style.display = 'none';
        return [];
    }

    try {
        const response = await fetch(`/api/search?q=${query}`);
        if (response.ok) {
            return await response.json();
        } else {
            console.error('Error fetching suggestions:', response.statusText);
            return [];
        }
    } catch (error) {
        console.error('Error fetching suggestions:', error);
        return [];
    }
}

// Handle search result selection
function handleSearchSelection(item) {
    // Clear the search box and suggestions
    searchBox.value = item.name;
    suggestionsBox.style.display = 'none';

    // Fetch the selected item's details
    fetch(`/api/search/${item.type}/${item.id}`)
        .then(response => response.json())
        .then(data => {
            if (data) {
                // Open the respective layer if not already open
                toggleSidebar(item.type.charAt(0).toUpperCase() + item.type.slice(1), false);

                // Center the map on the item's location
                const [lng, lat] = data.location.replace('POINT(', '').replace(')', '').split(' ');
                map.setView([lat, lng], 13); // Center the map and set zoom level
 
                // Debugging: Log layerState and item.type
                console.log('Layer state:', layerState);
                console.log('Item type:', item.type);
                // Find the marker in the layer group
                
                const layerGroup = layerState[`${item.type}Layer`]; // Get the layer group for the item type
                if (!layerGroup) {
                    console.error(`Layer group for ${item.type} is not initialized.`);
                    return;
                }
                let targetMarker = null;

                layerGroup.eachLayer((layer) => {
                    if (layer.getLatLng().lat === parseFloat(lat) && layer.getLatLng().lng === parseFloat(lng)) {
                        targetMarker = layer; // Find the marker with matching coordinates
                    }
                });

                if (targetMarker) {
                    // Call handleMarkerClick to bind the popup and update the sidebar
                    handleMarkerClick(targetMarker, data);
                } else {
                    console.error('Marker not found in layer group');
                }
            }
        })
        .catch(error => console.error('Error fetching search result details:', error));
}

// Display suggestions
function displaySuggestions(suggestions) {
    suggestionsBox.innerHTML = '';
    if (suggestions.length === 0) {
        suggestionsBox.style.display = 'none';
        return;
    }

    suggestions.forEach((item) => {
        const suggestionDiv = document.createElement('div');
        suggestionDiv.textContent = item.name; // Display only the name of the item
        suggestionDiv.onclick = () => handleSearchSelection(item); // Handle selection
        suggestionsBox.appendChild(suggestionDiv);
    });

    suggestionsBox.style.display = 'block';
}

// Handle input event
searchBox.addEventListener('input', async () => {
    const query = searchBox.value.trim();
    const suggestions = await fetchSuggestions(query);
    displaySuggestions(suggestions);
});
