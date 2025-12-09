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
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const OpenAI = require('openai');

// Configuration constants
const CONFIG = {
    MAX_CONTENT_LENGTH: 50000,  // Maximum Wikipedia content length to send to AI
    RETRY_DELAY_MS: 3000,        // Delay between retry attempts
    RATE_LIMIT_DELAY_MS: 2000,   // Delay between processing brigades
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
 * Converts brigade name to filename format
 * Example: "5. dalmatinska udarna brigada" -> "5th_dalm.md"
 */
function generateFilename(brigadeName) {
    // Function to get proper ordinal suffix
    function getOrdinalSuffix(num) {
        const j = num % 10;
        const k = num % 100;
        if (j === 1 && k !== 11) return num + 'st';
        if (j === 2 && k !== 12) return num + 'nd';
        if (j === 3 && k !== 13) return num + 'rd';
        return num + 'th';
    }
    
    // Extract number and first significant word
    const match = brigadeName.match(/^(\d+)[\.\s]+(\w+)/i);
    if (match) {
        const number = parseInt(match[1]);
        const word = match[2].substring(0, 4).toLowerCase();
        return `${getOrdinalSuffix(number)}_${word}.md`;
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
            timeout: 30000,
            maxRedirects: 5
        });
        
        const $ = cheerio.load(response.data);
        
        // Remove unwanted elements
        $('script, style, .references, .reflist, .navbox, .vertical-navbox, .sistersitebox, .mw-editsection, .infobox, .thumb').remove();
        
        // Get main content
        const content = $('#mw-content-text .mw-parser-output, #bodyContent').text();
        
        if (!content || content.trim().length < 100) {
            console.warn(`Warning: Content seems too short (${content.length} chars)`);
        }
        
        return content.replace(/\s+/g, ' ').trim();
    } catch (error) {
        console.error(`Error fetching Wikipedia page: ${error.message}`);
        if (error.response) {
            console.error(`HTTP Status: ${error.response.status}`);
        }
        return null;
    }
}

/**
 * Process Wikipedia content with AI to extract information and generate markdown
 */
async function processWithAI(brigadeName, wikipediaContent, retries = CONFIG.MAX_RETRIES) {
    const client = initializeOpenAI();
    
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            if (attempt > 0) {
                console.log(`Retry attempt ${attempt}/${retries}...`);
                await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY_MS));
            }
            
            const prompt = `You are a military historian specializing in World War II and the Yugoslav Partisan movement.

I have Wikipedia content about "${brigadeName}". Please analyze this content and create a structured markdown document following this EXACT template:

# ${brigadeName}

## Formation
 - **Date of formation**: [Extract the formation date in format: Month Day, Year. If not found, write "Information not available"]
 - **Place of formation**: [Extract the place/location of formation. If not found, write "Information not available"]
 - **Constituent battalions**: 
   - [List each constituent battalion on a separate line with a bullet point. If not found, write "Information not available"]
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

${wikipediaContent.substring(0, CONFIG.MAX_CONTENT_LENGTH)}`;

            const completion = await client.chat.completions.create({
                model: "gpt-4o",
                messages: [{
                    role: "user",
                    content: prompt
                }],
                max_tokens: 4000,
                temperature: 0.3
            });

            return completion.choices[0].message.content;
        } catch (error) {
            console.error(`Error processing with AI (attempt ${attempt + 1}): ${error.message}`);
            if (attempt === retries) {
                return null;
            }
        }
    }
    return null;
}

/**
 * Main processing function
 */
async function processBrigades(jsonFilePath, options = {}) {
    const { dryRun = false, limit = null } = options;
    
    try {
        // Read brigade data
        let brigadesData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
        
        // Apply limit if specified
        if (limit !== null && limit > 0) {
            brigadesData = brigadesData.slice(0, limit);
            console.log(`Limiting to first ${limit} brigades`);
        }
        
        console.log(`Processing ${brigadesData.length} brigades...`);
        
        if (dryRun) {
            console.log('\n=== DRY RUN MODE - No files will be created ===\n');
        }
        
        // Ensure output directory exists
        const outputDir = path.join(__dirname, '../public/assets/brigades');
        if (!fs.existsSync(outputDir) && !dryRun) {
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
            
            // Generate filename
            const filename = generateFilename(name);
            console.log(`Target filename: ${filename}`);
            
            if (dryRun) {
                console.log(`✓ Would process: ${name} -> ${filename}`);
                processed++;
                continue;
            }
            
            // Fetch Wikipedia content
            const content = await fetchWikipediaContent(wikipedia_url);
            if (!content) {
                console.log(`Failed to fetch content for ${name}`);
                failed++;
                continue;
            }
            
            console.log(`Fetched ${content.length} characters of content`);
            
            // Process with AI
            const markdown = await processWithAI(name, content);
            if (!markdown) {
                console.log(`Failed to process ${name} with AI`);
                failed++;
                continue;
            }
            
            // Save markdown file
            const filepath = path.join(outputDir, filename);
            
            fs.writeFileSync(filepath, markdown);
            console.log(`✓ Created: ${filename}`);
            processed++;
            
            // Add delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, CONFIG.RATE_LIMIT_DELAY_MS));
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
    
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        console.log('Usage: node scripts/generateBrigadeMarkdown.js <path-to-json-file> [options]');
        console.log('');
        console.log('Options:');
        console.log('  --dry-run         Test the script without fetching content or creating files');
        console.log('  -a, --all         Process all brigades (default)');
        console.log('  -<number>         Process only the first N brigades (e.g., -3 for first 3)');
        console.log('  --help, -h        Show this help message');
        console.log('');
        console.log('Examples:');
        console.log('  node scripts/generateBrigadeMarkdown.js brigades_croatia.json -3');
        console.log('  node scripts/generateBrigadeMarkdown.js brigades_croatia.json -a');
        console.log('  node scripts/generateBrigadeMarkdown.js brigades_sample.json --dry-run');
        console.log('');
        console.log('Environment Variables:');
        console.log('  OPENAI_API_KEY    Required for AI processing (get from https://platform.openai.com/api-keys)');
        process.exit(args.length === 0 ? 1 : 0);
    }
    
    const jsonFilePath = path.resolve(args[0]);
    const dryRun = args.includes('--dry-run');
    const allBrigades = args.includes('-a') || args.includes('--all');
    
    // Parse limit argument (e.g., -3, -5, etc.)
    let limit = null;
    for (const arg of args) {
        if (arg.match(/^-\d+$/)) {
            limit = parseInt(arg.substring(1));
            break;
        }
    }
    
    if (!fs.existsSync(jsonFilePath)) {
        console.error(`Error: File not found: ${jsonFilePath}`);
        process.exit(1);
    }
    
    processBrigades(jsonFilePath, { dryRun, limit })
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
