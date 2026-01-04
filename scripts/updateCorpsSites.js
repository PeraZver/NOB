/**
 * updateCorpsSites.js - Update corps with formation site and geocoordinates
 * 
 * This script reads corps data from a JSON file, fetches Wikipedia content,
 * uses OpenAI API to extract formation site information, finds approximate
 * geocoordinates, and outputs an updated JSON file.
 * 
 * Usage: node scripts/updateCorpsSites.js <path-to-json-file>
 * Example: node scripts/updateCorpsSites.js corps_data.json
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const dotenv = require('dotenv');
const OpenAI = require('openai');

// Load environment variables
dotenv.config();

// Configuration constants
const CONFIG = {
    MAX_CONTENT_LENGTH: 50000,  // Maximum Wikipedia content length to send to AI
    RETRY_DELAY_MS: 3000,        // Delay between retry attempts
    RATE_LIMIT_DELAY_MS: 2000,   // Delay between processing corps
    MAX_RETRIES: 2               // Maximum number of retry attempts
};

let openai = null;

/**
 * Initialize OpenAI client (lazy initialization)
 */
function initializeOpenAI() {
    if (!openai) {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY environment variable is not set. Get one at https://platform.openai.com/api-keys');
        }
        openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }
    return openai;
}

/**
 * Sleep helper function
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch Wikipedia content from URL
 */
async function fetchWikipediaContent(url) {
    try {
        console.log(`Fetching Wikipedia content from: ${url}`);
        
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'NOB-Corps-Updater/1.0 (Educational project)'
            },
            timeout: 30000
        });
        
        const $ = cheerio.load(response.data);
        
        // Remove unwanted elements
        $('script, style, .mw-editsection, .reference, .reflist, .navbox, .infobox').remove();
        
        // Get main content
        const content = $('#mw-content-text .mw-parser-output').text()
            .replace(/\[\d+\]/g, '') // Remove reference numbers
            .replace(/\s+/g, ' ')     // Normalize whitespace
            .trim();
        
        if (!content || content.length < 100) {
            throw new Error('Wikipedia content too short or empty');
        }
        
        console.log(`✓ Fetched ${content.length} characters of content`);
        return content;
        
    } catch (error) {
        console.error(`Error fetching Wikipedia content: ${error.message}`);
        return null;
    }
}

/**
 * Extract formation site using OpenAI
 */
async function extractFormationSite(wikipediaContent, corpsName, retries = CONFIG.MAX_RETRIES) {
    const client = initializeOpenAI();
    
    for (let attempt = 0; attempt <= retries; attempt++) {
        if (attempt > 0) {
            console.log(`Retrying... (attempt ${attempt + 1}/${retries + 1})`);
            await sleep(CONFIG.RETRY_DELAY_MS);
        }
        
        try {
            const prompt = `You are analyzing Wikipedia content about a WW2 military corps: "${corpsName}".

Your task is to extract the formation site (place of formation) from the content.

Please provide:
1. The exact formation site/location name
2. A brief explanation of how you determined this (1-2 sentences)

If the formation site is not explicitly mentioned in the content, try to infer it from context clues such as:
- Where the corps was first assembled
- The location mentioned in connection with its formation date
- The region or city associated with its early operations

Format your response as JSON:
{
  "formation_site": "City/Location Name",
  "confidence": "high|medium|low",
  "explanation": "Brief explanation of how you determined this"
}

If you cannot determine the formation site at all, respond with:
{
  "formation_site": null,
  "confidence": "none",
  "explanation": "Formation site not found in the provided content"
}

Here is the Wikipedia content:

${wikipediaContent.substring(0, CONFIG.MAX_CONTENT_LENGTH)}`;

            const completion = await client.chat.completions.create({
                model: "gpt-4o",
                messages: [{
                    role: "user",
                    content: prompt
                }],
                max_tokens: 500,
                temperature: 0.3,
                response_format: { type: "json_object" }
            });

            const result = JSON.parse(completion.choices[0].message.content);
            console.log(`✓ Formation site extracted: ${result.formation_site || 'Not found'}`);
            console.log(`  Confidence: ${result.confidence}`);
            console.log(`  Explanation: ${result.explanation}`);
            
            return result;
            
        } catch (error) {
            console.error(`Error extracting formation site (attempt ${attempt + 1}): ${error.message}`);
            if (attempt === retries) {
                return {
                    formation_site: null,
                    confidence: "none",
                    explanation: `Error: ${error.message}`
                };
            }
        }
    }
}

/**
 * Get geocoordinates for a location using OpenAI
 */
async function getGeocoordinates(locationName, corpsName, retries = CONFIG.MAX_RETRIES) {
    if (!locationName) {
        return null;
    }
    
    const client = initializeOpenAI();
    
    for (let attempt = 0; attempt <= retries; attempt++) {
        if (attempt > 0) {
            console.log(`Retrying geocoordinates... (attempt ${attempt + 1}/${retries + 1})`);
            await sleep(CONFIG.RETRY_DELAY_MS);
        }
        
        try {
            const prompt = `You are a geography expert helping to find coordinates for a WW2 historical location.

Corps: "${corpsName}"
Formation site: "${locationName}"

Based on the historical context (WW2, Yugoslavia/Balkans region), please provide the approximate latitude and longitude coordinates for this location.

Important guidelines:
1. Consider the historical context - this is likely in Yugoslavia or nearby regions
2. If the exact location is ambiguous, provide coordinates for the most likely location
3. Provide coordinates in decimal format (e.g., 44.8125, 20.4612)
4. Include your confidence level

Format your response as JSON:
{
  "latitude": 44.8125,
  "longitude": 20.4612,
  "confidence": "high|medium|low",
  "location_details": "City name, Country (modern borders)"
}

If you cannot determine coordinates, respond with:
{
  "latitude": null,
  "longitude": null,
  "confidence": "none",
  "location_details": "Could not determine location"
}`;

            const completion = await client.chat.completions.create({
                model: "gpt-4o",
                messages: [{
                    role: "user",
                    content: prompt
                }],
                max_tokens: 300,
                temperature: 0.3,
                response_format: { type: "json_object" }
            });

            const result = JSON.parse(completion.choices[0].message.content);
            console.log(`✓ Geocoordinates found: [${result.latitude}, ${result.longitude}]`);
            console.log(`  Confidence: ${result.confidence}`);
            console.log(`  Location: ${result.location_details}`);
            
            return result;
            
        } catch (error) {
            console.error(`Error getting geocoordinates (attempt ${attempt + 1}): ${error.message}`);
            if (attempt === retries) {
                return {
                    latitude: null,
                    longitude: null,
                    confidence: "none",
                    location_details: `Error: ${error.message}`
                };
            }
        }
    }
}

/**
 * Helper function to create formation_geo object
 */
function createFormationGeo(geocoordinates) {
    if (geocoordinates && geocoordinates.latitude && geocoordinates.longitude) {
        return {
            latitude: geocoordinates.latitude,
            longitude: geocoordinates.longitude
        };
    }
    return null;
}

/**
 * Process a single corps
 */
async function processCorps(corps) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`Processing: ${corps.name}`);
    console.log(`${'='.repeat(70)}`);
    
    // Check if corps already has formation_site
    if (corps.formation_site) {
        console.log(`Corps already has formation_site: ${corps.formation_site}`);
        console.log('Skipping...');
        return corps;
    }
    
    // Check if wikipedia_url exists
    if (!corps.wikipedia_url) {
        console.log('No Wikipedia URL found. Skipping...');
        return corps;
    }
    
    // Fetch Wikipedia content
    const wikipediaContent = await fetchWikipediaContent(corps.wikipedia_url);
    if (!wikipediaContent) {
        console.log('Failed to fetch Wikipedia content. Skipping...');
        return corps;
    }
    
    // Extract formation site
    const formationSiteResult = await extractFormationSite(wikipediaContent, corps.name);
    
    // Get geocoordinates if formation site was found
    let geocoordinates = null;
    if (formationSiteResult.formation_site) {
        geocoordinates = await getGeocoordinates(formationSiteResult.formation_site, corps.name);
    }
    
    // Update corps object with new data
    const updatedCorps = {
        ...corps,
        formation_site: formationSiteResult.formation_site,
        formation_geo: createFormationGeo(geocoordinates)
    };
    
    console.log('\n✓ Corps processing complete');
    return updatedCorps;
}

/**
 * Main function to process all corps
 */
async function main() {
    try {
        // Get input file path from command line arguments
        const args = process.argv.slice(2);
        if (args.length === 0) {
            console.error('Usage: node scripts/updateCorpsSites.js <path-to-json-file>');
            console.error('Example: node scripts/updateCorpsSites.js corps_data.json');
            process.exit(1);
        }
        
        const inputPath = path.resolve(args[0]);
        
        // Check if file exists
        if (!fs.existsSync(inputPath)) {
            console.error(`Error: File not found: ${inputPath}`);
            process.exit(1);
        }
        
        // Read input JSON file
        console.log(`Reading corps from: ${inputPath}`);
        const corps = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
        console.log(`Found ${corps.length} corps\n`);
        
        // Process each corps
        const updatedCorps = [];
        for (let i = 0; i < corps.length; i++) {
            const corpsItem = corps[i];
            console.log(`\nProcessing corps ${i + 1}/${corps.length}`);
            
            const updatedCorpsItem = await processCorps(corpsItem);
            updatedCorps.push(updatedCorpsItem);
            
            // Rate limiting - wait between processing corps
            if (i < corps.length - 1) {
                console.log(`\nWaiting ${CONFIG.RATE_LIMIT_DELAY_MS}ms before next corps...`);
                await sleep(CONFIG.RATE_LIMIT_DELAY_MS);
            }
        }
        
        // Generate output filename
        const inputBasename = path.basename(inputPath, '.json');
        const outputPath = path.join(path.dirname(inputPath), `${inputBasename}_updated.json`);
        
        // Save updated JSON file
        fs.writeFileSync(outputPath, JSON.stringify(updatedCorps, null, 2));
        console.log(`\n${'='.repeat(70)}`);
        console.log(`✓ Processing complete!`);
        console.log(`Updated corps saved to: ${outputPath}`);
        console.log(`${'='.repeat(70)}\n`);
        
        // Print summary
        const processedCount = updatedCorps.filter(d => d.formation_site).length;
        const withGeoCount = updatedCorps.filter(d => d.formation_geo && d.formation_geo.latitude).length;
        
        console.log('Summary:');
        console.log(`  Total corps: ${updatedCorps.length}`);
        console.log(`  With formation site: ${processedCount}`);
        console.log(`  With geocoordinates: ${withGeoCount}`);
        
    } catch (error) {
        console.error('Fatal error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run the script
main();