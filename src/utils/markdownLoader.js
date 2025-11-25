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
