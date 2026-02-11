/*
 * Script: generateBrigadeCampaignJSON.js
 * Description: Fetches brigade campaign data from a website using OpenAI API and generates a JSON file.
 * The script automatically detects the brigade name and saves the JSON with an appropriate filename.
 * Author: PeraZver
 * Date: January 27, 2026
 */

require('dotenv').config(); // Load environment variables from .env file

const fs = require('fs');
const path = require('path');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const OpenAI = require('openai');

// Parse command-line arguments
const argv = require('yargs/yargs')(process.argv.slice(2))
  .option('website', {
    alias: 'w',
    description: 'URL of the brigade campaign page',
    type: 'string',
    demandOption: true
  })
  .option('model', {
    alias: 'm',
    description: 'OpenAI model to use (e.g., gpt-4o, gpt-3.5-turbo, gpt-4)',
    type: 'string',
    default: 'gpt-4o'
  })
  .help()
  .argv;

const MODEL = argv.model;

const websiteUrl = argv.website;
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!openaiApiKey) {
    console.error('Error: OPENAI_API_KEY environment variable is not set.');
    process.exit(1);
}

const client = new OpenAI({ apiKey: openaiApiKey });

/**
 * Fetch webpage content
 */
async function fetchWebpage(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const html = await response.text();
        return html;
    } catch (error) {
        console.error(`Error fetching webpage: ${error.message}`);
        throw error;
    }
}

/**
 * Extract text content from HTML (basic implementation)
 */
function extractTextFromHtml(html) {
    // Remove script and style elements
    let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    // Remove HTML tags but preserve some structure
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<\/p>/gi, '\n');
    text = text.replace(/<[^>]+>/g, ' ');
    // Decode HTML entities
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#x27;/g, "'");
    text = text.replace(/&apos;/g, "'");
    // Remove extra whitespace
    text = text.replace(/\s+/g, ' ').trim();
    return text;
}

/**
 * Convert brigade name to filename format
 * Example: "7th Banija Brigade" -> "7th_banija.json"
 */
function brigadeNameToFilename(name, model) {
    // Extract the core brigade name (remove "Brigade" suffix)
    let brigadeNameCore = name.replace(/\s+Brigade\s*$/i, '').trim();
    
    // Convert to lowercase and replace spaces with underscores
    let filename = brigadeNameCore.toLowerCase().replace(/\s+/g, '_');
    
    // Add .json extension
    return `${filename}_campaign_${model}.json`;
}

/**
 * Extract brigade ID from full name or use provided context
 */
function extractBrigadeId(brigadeNameFull) {
    // Try to extract numeric ID from the name (e.g., "3rd Dalmatian Brigade" -> 3)
    const match = brigadeNameFull.match(/^(\d+)/);
    if (match) {
        return parseInt(match[1], 10);
    }
    return null;
}

/**
 * Query OpenAI to extract brigade campaign data from webpage content
 */
async function extractBrigadeCampaignData(text) {
    const prompt = `You are an expert military historian analyzing historical documentation about WWII Yugoslav partisan brigades. The content may be in Serbian/Croatian/Bosnian.

Extract brigade campaign and movement data from the following webpage content. Return a JSON object in this exact format:

{
  "brigade_id": <number or null>,
  "brigade_name": "<full brigade name in English>",
  "movements": [
    {
      "date": "<YYYY-MM-DD format>",
      "place": "<location name>",
      "coordinates": { "lat": <latitude>, "lng": <longitude> },
      "operation": "<operation type/name>",
      "division": "<division name or null>",
      "notes": "<detailed notes about the operation>"
    }
  ],
  "notes": "<any general notes about the data>"
  "source": "<URL of the webpage>"
}

IMPORTANT REQUIREMENTS:
1. Extract ALL military operations, movements, and campaigns mentioned (look for ⚔️ symbols or dated entries)
2. For each entry, provide date in YYYY-MM-DD format (use best estimate if only partial date given)
3. Include geographic coordinates (lat, lng) - use approximate coordinates for known locations (use null if unknown)
4. Identify the brigade name and extract brigade_id if mentioned (e.g., "8. dalmatinska brigada" = 8th Dalmatian Brigade)
5. Only return valid JSON, no markdown formatting or code blocks
6. If coordinates cannot be determined, use null for the entire coordinates object
7. Preserve division names as mentioned in the text
8. Include full context in notes for each operation
9. Translate brigade/division names to English

Webpage Content:
${text}

Return ONLY the valid JSON object, nothing else.`;

    try {
        const completion = await client.chat.completions.create({
            model: MODEL,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 4096,
        });

        // Extract the text response
        const responseText = completion.choices[0].message.content;
        
        // Parse JSON from response - handle cases where JSON might be wrapped in markdown
        let jsonMatch = responseText.match(/```json\n?([\s\S]*?)\n?```/);
        if (!jsonMatch) {
            jsonMatch = responseText.match(/\{[\s\S]*\}/);
        }
        
        if (!jsonMatch) {
            console.error('Raw response:', responseText);
            throw new Error('Could not extract JSON from OpenAI response');
        }

        const jsonStr = jsonMatch[1] || jsonMatch[0];
        const brigadeData = JSON.parse(jsonStr);
        return brigadeData;
    } catch (error) {
        console.error('Error querying OpenAI:', error.message);
        if (error.response) {
            console.error('API Response:', error.response.data);
        }
        throw error;
    }
}

/**
 * Main function
 */
async function generateBrigadeCampaignJSON() {
    try {
        console.log(`Fetching webpage: ${websiteUrl}`);
        const html = await fetchWebpage(websiteUrl);

        console.log('Extracting text content from webpage...');
        const textContent = extractTextFromHtml(html);

        // Limit content to avoid token limits (use first 15000 characters for better coverage)
        const limitedContent = textContent.substring(0, 15000);
        console.log(`Processing ${limitedContent.length} characters of webpage content...`);

        console.log('Querying OpenAI API for brigade campaign data...');
        const brigadeData = await extractBrigadeCampaignData(limitedContent);

        console.log(`\nExtracted Brigade: ${brigadeData.brigade_name}`);
        console.log(`Campaign Records: ${brigadeData.movements.length}`);

        // Attach source URL to the output JSON
        brigadeData.source = websiteUrl;

        // Generate filename from brigade name
        const filename = brigadeNameToFilename(brigadeData.brigade_name, MODEL);
        const outputPath = path.resolve(__dirname, '..', 'public', 'assets', 'brigades', filename);

        // Create directory if it doesn't exist
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Write JSON to file
        fs.writeFileSync(outputPath, JSON.stringify(brigadeData, null, 2), 'utf8');
        console.log(`\nJSON file saved: ${outputPath}`);
        console.log(`Filename: ${filename}`);

        return brigadeData;
    } catch (error) {
        console.error('Error during campaign data generation:', error.message);
        process.exit(1);
    }
}

// Run the function
generateBrigadeCampaignJSON();
