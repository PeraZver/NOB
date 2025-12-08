/**
 * generateBrigadeMarkdown.js - Generate markdown files for brigades from Wikipedia
 * 
 * This script reads brigade data from a JSON file, fetches Wikipedia content,
 * translates it to English if needed, and generates formatted markdown files.
 * 
 * Usage: node scripts/generateBrigadeMarkdown.js <path-to-json-file>
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const Anthropic = require('@anthropic-ai/sdk');

// Initialize Anthropic client for AI processing
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || ''
});

/**
 * Converts brigade name to filename format
 * Example: "5. dalmatinska udarna brigada" -> "5th_dalm.md"
 */
function generateFilename(brigadeName) {
    // Extract number and first significant word
    const match = brigadeName.match(/^(\d+)[\.\s]+(\w+)/i);
    if (match) {
        const number = match[1];
        const word = match[2].substring(0, 4).toLowerCase();
        return `${number}th_${word}.md`;
    }
    // Fallback to simple conversion
    return brigadeName.toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '') + '.md';
}

/**
 * Fetch Wikipedia page content
 */
async function fetchWikipediaContent(url) {
    try {
        console.log(`Fetching: ${url}`);
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; BrigadeMarkdownGenerator/1.0)'
            },
            timeout: 30000
        });
        
        const $ = cheerio.load(response.data);
        
        // Remove unwanted elements
        $('script, style, .references, .reflist, .navbox, .vertical-navbox, .sistersitebox, .mw-editsection').remove();
        
        // Get main content
        const content = $('#mw-content-text .mw-parser-output').text();
        
        return content.replace(/\s+/g, ' ').trim();
    } catch (error) {
        console.error(`Error fetching Wikipedia page: ${error.message}`);
        return null;
    }
}

/**
 * Process Wikipedia content with AI to extract information and generate markdown
 */
async function processWithAI(brigadeName, wikipediaContent) {
    try {
        const prompt = `You are a military historian specializing in World War II and the Yugoslav Partisan movement.

I have Wikipedia content about "${brigadeName}". Please analyze this content and create a structured markdown document following this EXACT template:

# ${brigadeName}

## Formation
 - **Date of formation**: [Extract the formation date in format: Month Day, Year. If not found, write "Information not available"]
 - **Place of formation**: [Extract the place/location of formation. If not found, write "Information not available"]
 - **Constituent battalions**: 
\t- [List each constituent battalion on a separate line with a bullet point. If not found, write "Information not available"]
 - **Strength at the time**: [Extract the number of fighters at the time of formation. If not found, write "Information not available"]
 - **Commander**: [Extract the name of the first commander. If not found, write "Information not available"]
 - **Commissar**: [Extract the name of the political commissar. If not found, write "Information not available"]

## Operations
[Write a meaningful summary of the Brigade's operations and war path. Structure it chronologically with key battles, movements, and achievements. Use subheadings (###) for major operations or time periods if appropriate. This should be a comprehensive narrative summary, not bullet points.]

Important guidelines:
1. If the Wikipedia content is not in English, translate all extracted information to English
2. Be precise with dates, names, and numbers
3. For the Operations section, create a coherent narrative that covers the brigade's entire war history
4. Use proper markdown formatting
5. Do not add any information not found in the source material
6. If critical information is missing, note it as "Information not available"

Here is the Wikipedia content:

${wikipediaContent.substring(0, 50000)}`;

        const message = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 8000,
            messages: [{
                role: "user",
                content: prompt
            }]
        });

        return message.content[0].text;
    } catch (error) {
        console.error(`Error processing with AI: ${error.message}`);
        return null;
    }
}

/**
 * Main processing function
 */
async function processBrigades(jsonFilePath) {
    try {
        // Read brigade data
        const brigadesData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
        console.log(`Processing ${brigadesData.length} brigades...`);
        
        // Ensure output directory exists
        const outputDir = path.join(__dirname, '../public/assets/brigades');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        let processed = 0;
        let failed = 0;
        
        for (const brigade of brigadesData) {
            const { name, wikipedia_url } = brigade;
            
            if (!wikipedia_url) {
                console.log(`Skipping ${name} - no Wikipedia URL`);
                failed++;
                continue;
            }
            
            console.log(`\nProcessing: ${name}`);
            
            // Fetch Wikipedia content
            const content = await fetchWikipediaContent(wikipedia_url);
            if (!content) {
                console.log(`Failed to fetch content for ${name}`);
                failed++;
                continue;
            }
            
            // Process with AI
            const markdown = await processWithAI(name, content);
            if (!markdown) {
                console.log(`Failed to process ${name} with AI`);
                failed++;
                continue;
            }
            
            // Generate filename and save
            const filename = generateFilename(name);
            const filepath = path.join(outputDir, filename);
            
            fs.writeFileSync(filepath, markdown);
            console.log(`✓ Created: ${filename}`);
            processed++;
            
            // Add delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        console.log(`\n=== Summary ===`);
        console.log(`Processed: ${processed}`);
        console.log(`Failed: ${failed}`);
        console.log(`Total: ${brigadesData.length}`);
        
    } catch (error) {
        console.error('Error in main process:', error.message);
        throw error;
    }
}

// Main execution
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.error('Usage: node scripts/generateBrigadeMarkdown.js <path-to-json-file>');
        process.exit(1);
    }
    
    const jsonFilePath = path.resolve(args[0]);
    
    if (!fs.existsSync(jsonFilePath)) {
        console.error(`Error: File not found: ${jsonFilePath}`);
        process.exit(1);
    }
    
    processBrigades(jsonFilePath)
        .then(() => {
            console.log('\nDone!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

module.exports = { processBrigades, generateFilename };
