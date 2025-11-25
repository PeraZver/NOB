/**
 * sidebar.js - This file is part of the NOB web project.
 * 
 * Sidebar content management functions. Handles updating sidebar content
 * with markdown-rendered information about military units and layers.
 * 
 * Created: 11/2025
 * Authors: Pero & Github Copilot
 */

export function updateSidebar(content) {
    const sidebarContent = document.getElementById('content');
    if (content) {
        sidebarContent.innerHTML = content; // Update the sidebar with the provided content
    } else {
        sidebarContent.innerHTML = '<p>No additional details available.</p>'; // Fallback for empty content
    }
}

export function loadDefaultText(markdownFile) {
    fetch(markdownFile)
        .then(response => response.text())
        .then(markdown => {
            updateSidebar(marked.parse(markdown)); // Render Markdown content in the sidebar
        })
        .catch(error => console.error('Error loading default text:', error));
}
