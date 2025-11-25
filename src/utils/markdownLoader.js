/**
 * markdownLoader.js - This file is part of the NOB web project.
 * 
 * Utility functions for loading and reading markdown content from files.
 * Provides async file reading with error handling.
 * 
 * Created: 11/2025
 * Authors: Pero & Github Copilot
 */

const fs = require('fs').promises;

/**
 * Helper function to fetch Markdown content from a file
 * @param {string} filePath - Path to the markdown file
 * @returns {Promise<string|null>} - Markdown content or null if error
 */
async function getMarkdownContent(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf8');
        return content;
    } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
        return null;
    }
}

module.exports = { getMarkdownContent };
