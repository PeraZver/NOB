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

// Display suggestions
function displaySuggestions(suggestions) {
	suggestionsBox.innerHTML = '';
	if (suggestions.length === 0) {
		suggestionsBox.style.display = 'none';
		return;
	}

	suggestions.forEach((item) => {
		const suggestionDiv = document.createElement('div');
		suggestionDiv.textContent = item.name;
		suggestionDiv.onclick = () => {
			searchBox.value = item.name;
			suggestionsBox.style.display = 'none';
			// Optionally, trigger a map action or sidebar update here
		};
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
