import { icons } from './constants.js'; // Import the icons object
import { updateSidebar } from './sidebar.js'; // Import sidebar functions
import { map, toggleSidebar } from './map.js'; // Import the map object

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
                // Center the map on the item's location
                const [lng, lat] = data.location.replace('POINT(', '').replace(')', '').split(' ');
                map.setView([lat, lng], 13); // Center the map and set zoom level

                // Add a marker to the map for the selected item
                const marker = L.marker([lat, lng], { icon: icons[data.type] || L.Icon.Default }); // Use group-specific icon
                marker.bindPopup(`<strong>${data.name}</strong>`).openPopup();

                // Reuse toggleSidebar to show the sidebar
                toggleSidebar(item.type.charAt(0).toUpperCase() + item.type.slice(1), false); // Capitalize the type

                // Update the sidebar with the selected item's description
                if (data.description) {
                    updateSidebar(marked.parse(data.description)); // Render Markdown content
                } else {
                    updateSidebar('<p>No additional details available.</p>');
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
