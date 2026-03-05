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
const Anthropic = require('@anthropic-ai/sdk');

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
    description: 'LLM model to use (e.g., gpt-5.2, openai/gpt-4o, claude-3-5-sonnet-latest, anthropic/claude-3-7-sonnet-latest)',
    type: 'string',
    default: 'gpt-4o'
  })
  .option('provider', {
    alias: 'p',
    description: 'LLM provider to use: openai, anthropic, or auto (infer from model)',
    type: 'string',
    default: 'auto',
    choices: ['auto', 'openai', 'anthropic']
  })
  .help()
  .argv;

function resolveProviderAndModel(rawModel, providerOption = 'auto') {
    if (!rawModel || typeof rawModel !== 'string') {
        throw new Error('Model must be a non-empty string.');
    }

    let model = rawModel.trim();
    let inferredProvider = null;

    const providerPrefixMatch = model.match(/^(openai|anthropic)[/:](.+)$/i);
    if (providerPrefixMatch) {
        inferredProvider = providerPrefixMatch[1].toLowerCase();
        model = providerPrefixMatch[2].trim();
    } else if (/^claude/i.test(model)) {
        inferredProvider = 'anthropic';
    } else if (/^gpt|^o\d|^text-|^chatgpt/i.test(model)) {
        inferredProvider = 'openai';
    }

    const normalizedProviderOption = (providerOption || 'auto').toLowerCase();
    if (normalizedProviderOption !== 'auto' && inferredProvider && normalizedProviderOption !== inferredProvider) {
        throw new Error(`Provider mismatch: --provider ${normalizedProviderOption} conflicts with model prefix/inference (${inferredProvider}).`);
    }

    const provider = normalizedProviderOption !== 'auto'
        ? normalizedProviderOption
        : (inferredProvider || 'openai');

    return { provider, model };
}

const { provider: LLM_PROVIDER, model: MODEL } = resolveProviderAndModel(argv.model, argv.provider);

const websiteUrl = argv.website;
const openaiApiKey = process.env.OPENAI_API_KEY;
const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

if (LLM_PROVIDER === 'openai' && !openaiApiKey) {
    console.error('Error: OPENAI_API_KEY environment variable is not set.');
    process.exit(1);
}

if (LLM_PROVIDER === 'anthropic' && !anthropicApiKey) {
    console.error('Error: ANTHROPIC_API_KEY environment variable is not set.');
    process.exit(1);
}

const openaiClient = LLM_PROVIDER === 'openai'
    ? new OpenAI({ apiKey: openaiApiKey })
    : null;
const anthropicClient = LLM_PROVIDER === 'anthropic'
    ? new Anthropic({ apiKey: anthropicApiKey })
    : null;

const getTimestamp = () => {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-');
};

function tryParseJsonWithRepairs(jsonStr) {
    try {
        return JSON.parse(jsonStr);
    } catch (initialError) {
        const repaired = jsonStr
            .replace(/^\uFEFF/, '')
            .replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(repaired);
    }
}

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
    const safeName = typeof name === 'string' && name.trim() ? name.trim() : 'unknown_unit';
    // Extract the area part (e.g., "1st Dalmatian Brigade" or "1st Dalmatian Proletarian Shock Brigade" -> "1st Dalmatian Brigade")
    let areaMatch = safeName.match(/^(\d+\w*)\s+([A-Za-z]+)(?:\s+Brigade)?/i);
    let area = areaMatch ? `${areaMatch[1]} ${areaMatch[2]}` : safeName;
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
async function extractBrigadeCampaignData(text, expectedEntries = null) {
    const expectedEntriesInstruction = Number.isInteger(expectedEntries)
        ? `\n11. The input contains exactly ${expectedEntries} chronology entr${expectedEntries === 1 ? 'y' : 'ies'}. Return exactly ${expectedEntries} item(s) in \"movements\", preserving input order and covering every entry.`
        : '';

    const prompt = `You are an expert military historian analyzing historical documentation about WWII Yugoslav partisan military units: brigade, divisions and corps. The content may be in Serbian/Croatian/Bosnian.

Extract brigade campaign and movement data from the following webpage content. Return a JSON object in this exact format:

{
  "brigade_id": <number if the unit i a brigade, otherwise null>,
  "unit_name": "<area name only, e.g., '1st Dalmatian Brigade' or '8th dalmatian corps'>",
  "movements": [
    {
      "date": "<YYYY-MM-DD format>",
      "place": "<location name>",
      "coordinates": { "lat": <latitude>, "lng": <longitude> },
      "operation": "<operation type/name>",
      "division": "<division name where the brigade was attached during this operation, if mentioned>",
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
7. Preserve division names as mentioned in the text, if the brigade was attached to a division during an operation, include that division name in the "division" field
8. Include full context in notes for each operation
9. Translate brigade/division/corps names to English
10. For 'brigade_name' or 'division_name', use only the area name (e.g., '1st Dalmatian Brigade'), not the full official or honorific name.
${expectedEntriesInstruction}

Webpage Content:
${text}

Return ONLY the valid JSON object, nothing else.`;

    try {
        let responseText = null;
        let rawResponseForLog = null;

        if (LLM_PROVIDER === 'openai') {
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

            const completion = await openaiClient.chat.completions.create(completionParams);
            rawResponseForLog = completion;

            const message = completion?.choices?.[0]?.message;
            const responseContent = message?.content;

            if (typeof responseContent === 'string') {
                responseText = responseContent;
            } else if (Array.isArray(responseContent)) {
                responseText = responseContent
                    .map((part) => (part && typeof part.text === 'string' ? part.text : ''))
                    .join('')
                    .trim();
            }

            if (!responseText && message?.refusal) {
                responseText = message.refusal;
            }
        } else if (LLM_PROVIDER === 'anthropic') {
            const completion = await anthropicClient.messages.create({
                model: MODEL,
                max_tokens: 8192,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            });
            rawResponseForLog = completion;

            if (Array.isArray(completion?.content)) {
                responseText = completion.content
                    .filter((part) => part && part.type === 'text' && typeof part.text === 'string')
                    .map((part) => part.text)
                    .join('')
                    .trim();
            }
        } else {
            throw new Error(`Unsupported LLM provider: ${LLM_PROVIDER}`);
        }

        if (!responseText) {
            const noContentLogFilename = `${LLM_PROVIDER}_no_content_${getTimestamp()}.log`;
            const noContentLogPath = path.resolve(__dirname, '..', 'public', 'assets', 'brigades', 'model_test', noContentLogFilename);
            fs.writeFileSync(
                noContentLogPath,
                `Error: ${LLM_PROVIDER} response did not contain text content.\nRaw response: ${JSON.stringify(rawResponseForLog, null, 2)}`,
                'utf8'
            );
            throw new Error(`${LLM_PROVIDER} response did not contain text content`);
        }

        // Parse JSON from response - handle cases where JSON might be wrapped in markdown
        let jsonMatch = responseText.match(/```json\n?([\s\S]*?)\n?```/);
        if (!jsonMatch) {
            jsonMatch = responseText.match(/\{[\s\S]*\}/);
        }

        if (!jsonMatch) {
            // Only create log file if error
            const logFilename = `${LLM_PROVIDER}_response_${getTimestamp()}.log`;
            const logPath = path.resolve(__dirname, '..', 'public', 'assets', 'brigades', 'model_test', logFilename);
            fs.writeFileSync(logPath, `Error: Could not extract JSON from ${LLM_PROVIDER} response.\n` + responseText, 'utf8');
            console.error('Raw response:', responseText);
            throw new Error(`Could not extract JSON from ${LLM_PROVIDER} response`);
        }

        const jsonStr = jsonMatch[1] || jsonMatch[0];
        try {
            const brigadeData = tryParseJsonWithRepairs(jsonStr);
            return brigadeData;
        } catch (parseError) {
            // Only create log file if error
            const jsonLogFilename = `${LLM_PROVIDER}_json_error_${getTimestamp()}.log`;
            const jsonLogPath = path.resolve(__dirname, '..', 'public', 'assets', 'brigades', 'model_test', jsonLogFilename);
            fs.writeFileSync(jsonLogPath, 'Error: ' + parseError.message + '\n' + jsonStr, 'utf8');
            console.error('JSON parse error:', parseError.message);
            console.error('Raw JSON string:', jsonStr);
            throw parseError;
        }
    } catch (error) {
        // Only create log file if error
        const errLogFilename = `${LLM_PROVIDER}_fatal_error_${getTimestamp()}.log`;
        const errLogPath = path.resolve(__dirname, '..', 'public', 'assets', 'brigades', 'model_test', errLogFilename);
        fs.writeFileSync(errLogPath, 'Error: ' + error.message, 'utf8');
        console.error(`Error querying ${LLM_PROVIDER}:`, error.message);
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
 * Extract chronology entries marked with ⚔️
 */
function extractChronologyEntries(text) {
    const normalized = text.replace(/\r\n/g, '\n');
    const matches = normalized.match(/⚔️[\s\S]*?(?=\n\s*⚔️|$)/g);
    return matches ? matches.map((entry) => entry.trim()).filter(Boolean) : [];
}

/**
 * Split chronology entries into chunks with entry count and char limits
 */
function splitEntriesIntoChunks(entries, maxEntries = 1, maxChars = 12000) {
    const chunks = [];
    let currentEntries = [];
    let currentLength = 0;

    for (const entry of entries) {
        const entryLength = entry.length + 1;
        const exceedsEntryCount = currentEntries.length >= maxEntries;
        const exceedsCharLimit = currentLength + entryLength > maxChars;

        if (currentEntries.length > 0 && (exceedsEntryCount || exceedsCharLimit)) {
            chunks.push({
                text: currentEntries.join('\n'),
                entries: currentEntries
            });
            currentEntries = [];
            currentLength = 0;
        }

        currentEntries.push(entry);
        currentLength += entryLength;
    }

    if (currentEntries.length > 0) {
        chunks.push({
            text: currentEntries.join('\n'),
            entries: currentEntries
        });
    }

    return chunks;
}

/**
 * Fallback movement if the model fails to produce movement data for an entry
 */
function createFallbackMovementFromEntry(entryText) {
    const cleaned = entryText.replace(/^\s*⚔️\s*/, '').trim();
    const dateMatch = cleaned.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})\./);

    let date = null;
    if (dateMatch) {
        let day = parseInt(dateMatch[1], 10);
        let month = parseInt(dateMatch[2], 10);
        const year = parseInt(dateMatch[3], 10);

        if (day === 0) day = 1;
        if (month === 0) month = 1;

        const dayStr = String(day).padStart(2, '0');
        const monthStr = String(month).padStart(2, '0');
        date = `${year}-${monthStr}-${dayStr}`;
    }

    const placeMatch = cleaned.match(/(?:^|\s)(?:Na|U|Iz|Sa)\s+([^,.;]+)/i);
    const place = placeMatch ? placeMatch[1].trim() : null;

    return {
        date,
        place,
        coordinates: null,
        operation: 'Unparsed chronology entry',
        division: null,
        notes: cleaned
    };
}

/**
 * Main function
 */
async function generateBrigadeCampaignJSON() {
    try {
        console.log(`Using LLM provider: ${LLM_PROVIDER}, model: ${MODEL}`);
        console.log(`Fetching webpage: ${websiteUrl}`);
        const html = await fetchWebpage(websiteUrl);

        console.log('Extracting text content from webpage...');
        const textContent = extractTextFromHtml(html, websiteUrl);

        const chronologyEntries = extractChronologyEntries(textContent);
        let chunkJobs = [];

        if (chronologyEntries.length > 0) {
            const ENTRY_CHUNK_SIZE = 1;
            const ENTRY_CHUNK_MAX_CHARS = 12000;
            chunkJobs = splitEntriesIntoChunks(chronologyEntries, ENTRY_CHUNK_SIZE, ENTRY_CHUNK_MAX_CHARS)
                .map((chunk) => ({
                    text: chunk.text,
                    expectedEntries: chunk.entries.length,
                    entries: chunk.entries
                }));
            console.log(`Detected ${chronologyEntries.length} chronology entr${chronologyEntries.length === 1 ? 'y' : 'ies'} (⚔️ markers). Processing ${chunkJobs.length} chunk(s) with up to ${ENTRY_CHUNK_SIZE} entr${ENTRY_CHUNK_SIZE === 1 ? 'y' : 'ies'} per request...`);
        } else {
            const CHUNK_SIZE = 24000;
            chunkJobs = splitTextIntoChunks(textContent, CHUNK_SIZE).map((chunkText) => ({
                text: chunkText,
                expectedEntries: null,
                entries: []
            }));
            console.log(`Processing ${chunkJobs.length} chunk(s) of up to ${CHUNK_SIZE} characters each...`);
        }

        let allMovements = [];
        let brigadeId = null;
        let brigadeName = null;
        let notes = [];
        for (let idx = 0; idx < chunkJobs.length; idx++) {
            const chunk = chunkJobs[idx];
            console.log(`Querying ${LLM_PROVIDER} API for chunk ${idx + 1} of ${chunkJobs.length}...`);
            const brigadeData = await extractBrigadeCampaignData(chunk.text, chunk.expectedEntries);

            const movementCount = Array.isArray(brigadeData.movements) ? brigadeData.movements.length : 0;
            if (Number.isInteger(chunk.expectedEntries) && movementCount < chunk.expectedEntries) {
                console.warn(`Chunk ${idx + 1}: expected ${chunk.expectedEntries} movement(s), got ${movementCount}. Applying fallback for missing entries.`);
            }

            if (brigadeData.movements && Array.isArray(brigadeData.movements)) {
                allMovements = allMovements.concat(brigadeData.movements);
            }

            if (Number.isInteger(chunk.expectedEntries) && movementCount < chunk.expectedEntries && chunk.entries.length > 0) {
                for (let missingIdx = movementCount; missingIdx < chunk.entries.length; missingIdx++) {
                    allMovements.push(createFallbackMovementFromEntry(chunk.entries[missingIdx]));
                }
            }

            if (!brigadeId && brigadeData.brigade_id) brigadeId = brigadeData.brigade_id;
            if (!brigadeName && brigadeData.brigade_name) brigadeName = brigadeData.brigade_name;
            if (!brigadeName && brigadeData.unit_name) brigadeName = brigadeData.unit_name;
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
