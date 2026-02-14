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

const getTimestamp = () => {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-');
};

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
function extractTextFromHtml(html, url) {
    // Only for znaci.org URLs: extract all <p> tags within <div id="hronologija-sadrzaj">
    if (/https?:\/\/(www\.)?znaci\.org\//.test(url)) {
        console.log('[extractTextFromHtml] Matched znaci.org domain.');
        const divMatch = html.match(/<div[^>]+id=["']hronologija-sadrzaj["'][^>]*>([\s\S]*?)<\/div>/i);
        if (divMatch) {
            console.log('[extractTextFromHtml] Found hronologija-sadrzaj div.');
            const divContent = divMatch[1];
            // Extract all <p>...</p> blocks
            const pMatches = divContent.match(/<p[\s\S]*?<\/p>/gi);
            if (pMatches && pMatches.length > 0) {
                console.log(`[extractTextFromHtml] Found ${pMatches.length} <p> tags in hronologija-sadrzaj div.`);
                // Clean each <p> block
                let allText = pMatches.map(p => {
                    let t = p.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
                    t = t.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
                    t = t.replace(/<br\s*\/?>(?![^<]*<)/gi, '\n');
                    t = t.replace(/<[^>]+>/g, ' ');
                    t = t.replace(/&nbsp;/g, ' ');
                    t = t.replace(/&amp;/g, '&');
                    t = t.replace(/&lt;/g, '<');
                    t = t.replace(/&gt;/g, '>');
                    t = t.replace(/&quot;/g, '"');
                    t = t.replace(/&#x27;/g, "'");
                    t = t.replace(/&apos;/g, "'");
                    t = t.replace(/\s+/g, ' ').trim();
                    return t;
                }).join('\n');
                return allText;
            }
        }
        // If not found, fallback to empty string
        return '';
    }
    // Fallback: old extraction for other domains
    let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    text = text.replace(/<br\s*\/>/gi, '\n');
    text = text.replace(/<\/p>/gi, '\n');
    text = text.replace(/<[^>]+>/g, ' ');
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#x27;/g, "'");
    text = text.replace(/&apos;/g, "'");
    text = text.replace(/\s+/g, ' ').trim();
    return text;
}

/**
 * Convert brigade name to filename format
 * Example: "7th Banija Brigade" -> "7th_banija.json"
 */
function brigadeNameToFilename(name, model) {
    // Extract the area part (e.g., "1st Dalmatian Brigade" or "1st Dalmatian Proletarian Shock Brigade" -> "1st Dalmatian Brigade")
    let areaMatch = name.match(/^(\d+\w*)\s+([A-Za-z]+)(?:\s+Brigade)?/i);
    let area = areaMatch ? `${areaMatch[1]} ${areaMatch[2]}` : name;
    // Convert to lowercase and replace spaces with underscores
    let filename = area.toLowerCase().replace(/\s+/g, '_');
    return `${filename}_${model}.json`;
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
  "brigade_name": "<area name only, e.g., '1st Dalmatian Brigade'>",
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
  "notes": "<any general notes about the data>",
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
10. For 'brigade_name', use only the area name (e.g., '1st Dalmatian Brigade'), not the full official or honorific name.

Webpage Content:
${text}

Return ONLY the valid JSON object, nothing else.`;

    try {
        // Determine correct token parameter for model version
        const isGpt5 = /^gpt-5/i.test(MODEL);
        const completionParams = {
            model: MODEL,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ]
        };
        if (isGpt5) {
            completionParams.max_completion_tokens = 8192;
        } else {
            completionParams.max_tokens = 8192;
        }
        const completion = await client.chat.completions.create(completionParams);

        // Extract the text response
        const responseText = completion.choices[0].message.content;

        // Parse JSON from response - handle cases where JSON might be wrapped in markdown
        let jsonMatch = responseText.match(/```json\n?([\s\S]*?)\n?```/);
        if (!jsonMatch) {
            jsonMatch = responseText.match(/\{[\s\S]*\}/);
        }

        if (!jsonMatch) {
            // Only create log file if error
            const logFilename = `openai_response_${getTimestamp()}.log`;
            const logPath = path.resolve(__dirname, '..', 'public', 'assets', 'brigades', 'model_test', logFilename);
            fs.writeFileSync(logPath, 'Error: Could not extract JSON from OpenAI response.\n' + responseText, 'utf8');
            console.error('Raw response:', responseText);
            throw new Error('Could not extract JSON from OpenAI response');
        }

        const jsonStr = jsonMatch[1] || jsonMatch[0];
        try {
            const brigadeData = JSON.parse(jsonStr);
            return brigadeData;
        } catch (parseError) {
            // Only create log file if error
            const jsonLogFilename = `openai_json_error_${getTimestamp()}.log`;
            const jsonLogPath = path.resolve(__dirname, '..', 'public', 'assets', 'brigades', 'model_test', jsonLogFilename);
            fs.writeFileSync(jsonLogPath, 'Error: ' + parseError.message + '\n' + jsonStr, 'utf8');
            console.error('JSON parse error:', parseError.message);
            console.error('Raw JSON string:', jsonStr);
            throw parseError;
        }
    } catch (error) {
        // Only create log file if error
        const errLogFilename = `openai_fatal_error_${getTimestamp()}.log`;
        const errLogPath = path.resolve(__dirname, '..', 'public', 'assets', 'brigades', 'model_test', errLogFilename);
        fs.writeFileSync(errLogPath, 'Error: ' + error.message, 'utf8');
        console.error('Error querying OpenAI:', error.message);
        if (error.response) {
            console.error('API Response:', error.response.data);
        }
        throw error;
    }
}

/**
 * Helper to split text into chunks of max length
 */
function splitTextIntoChunks(text, maxLen) {
    const chunks = [];
    let i = 0;
    while (i < text.length) {
        chunks.push(text.substring(i, i + maxLen));
        i += maxLen;
    }
    return chunks;
}

/**
 * Main function
 */
async function generateBrigadeCampaignJSON() {
    try {
        console.log(`Fetching webpage: ${websiteUrl}`);
        const html = await fetchWebpage(websiteUrl);

        console.log('Extracting text content from webpage...');
        const textContent = extractTextFromHtml(html, websiteUrl);

        // Split content into chunks (e.g., 24000 chars for 8k token models)
        const CHUNK_SIZE = 24000;
        const chunks = splitTextIntoChunks(textContent, CHUNK_SIZE);
        console.log(`Processing ${chunks.length} chunk(s) of up to ${CHUNK_SIZE} characters each...`);

        let allMovements = [];
        let brigadeId = null;
        let brigadeName = null;
        let notes = [];
        for (let idx = 0; idx < chunks.length; idx++) {
            console.log(`Querying OpenAI API for chunk ${idx + 1} of ${chunks.length}...`);
            const brigadeData = await extractBrigadeCampaignData(chunks[idx]);
            if (brigadeData.movements && Array.isArray(brigadeData.movements)) {
                allMovements = allMovements.concat(brigadeData.movements);
            }
            if (!brigadeId && brigadeData.brigade_id) brigadeId = brigadeData.brigade_id;
            if (!brigadeName && brigadeData.brigade_name) brigadeName = brigadeData.brigade_name;
            if (brigadeData.notes) notes.push(brigadeData.notes);
        }

        // Attach source URL to the output JSON
        const output = {
            brigade_id: brigadeId,
            brigade_name: brigadeName,
            movements: allMovements,
            notes: notes.join(' | '),
            source: websiteUrl
        };

        // Generate filename from brigade name
        const filename = brigadeNameToFilename(brigadeName, MODEL);
        const outputPath = path.resolve(__dirname, '..', 'public', 'assets', 'brigades', 'model_test', filename);

        // Create directory if it doesn't exist
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Write JSON to file
        fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
        console.log(`\nJSON file saved: ${outputPath}`);
        console.log(`Filename: ${filename}`);

        return output;
    } catch (error) {
        console.error('Error during campaign data generation:', error.message);
        process.exit(1);
    }
}

// Run the function
generateBrigadeCampaignJSON();
