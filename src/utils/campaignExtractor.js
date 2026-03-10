/**
 * campaignExtractor.js
 * Reusable module for extracting brigade campaign data from web sources using LLM APIs.
 * Adapted from scripts/generateBrigadeCampaignJSON.js for use as a streaming API service.
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

// ── Provider / model resolution ──────────────────────────────────────────────

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
        throw new Error(`Provider mismatch: provider "${normalizedProviderOption}" conflicts with model "${model}" (inferred: ${inferredProvider}).`);
    }

    const provider = normalizedProviderOption !== 'auto'
        ? normalizedProviderOption
        : (inferredProvider || 'openai');

    return { provider, model };
}

// ── JSON repair ───────────────────────────────────────────────────────────────

function tryParseJsonWithRepairs(jsonStr) {
    try {
        return JSON.parse(jsonStr);
    } catch {
        const repaired = jsonStr
            .replace(/^\uFEFF/, '')
            .replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(repaired);
    }
}

// ── Webpage fetching ──────────────────────────────────────────────────────────

async function fetchWebpage(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP error fetching page: ${response.status} ${response.statusText}`);
    }
    return response.text();
}

// ── HTML → plain text ─────────────────────────────────────────────────────────

function extractTextFromHtml(html, url) {
    if (/https?:\/\/(www\.)?znaci\.org\//.test(url)) {
        const divMatch = html.match(/<div[^>]+id=["']hronologija-sadrzaj["'][^>]*>([\s\S]*?)<\/div>/i);
        if (divMatch) {
            const pMatches = divMatch[1].match(/<p[\s\S]*?<\/p>/gi);
            if (pMatches && pMatches.length > 0) {
                return pMatches.map(p => cleanHtmlFragment(p)).join('\n');
            }
        }
        return '';
    }
    // Generic HTML strip
    let text = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n');
    return cleanHtmlFragment(text);
}

function cleanHtmlFragment(fragment) {
    return fragment
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<br\s*\/?>(?![^<]*<)/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}

// ── Text chunking ─────────────────────────────────────────────────────────────

function extractChronologyEntries(text) {
    const normalized = text.replace(/\r\n/g, '\n');
    const matches = normalized.match(/⚔️[\s\S]*?(?=\n\s*⚔️|$)/g);
    return matches ? matches.map(e => e.trim()).filter(Boolean) : [];
}

function splitEntriesIntoChunks(entries, maxEntries = 1, maxChars = 12000) {
    const chunks = [];
    let currentEntries = [];
    let currentLength = 0;

    for (const entry of entries) {
        const entryLength = entry.length + 1;
        if (currentEntries.length > 0 && (currentEntries.length >= maxEntries || currentLength + entryLength > maxChars)) {
            chunks.push({ text: currentEntries.join('\n'), entries: currentEntries });
            currentEntries = [];
            currentLength = 0;
        }
        currentEntries.push(entry);
        currentLength += entryLength;
    }
    if (currentEntries.length > 0) {
        chunks.push({ text: currentEntries.join('\n'), entries: currentEntries });
    }
    return chunks;
}

function splitTextIntoChunks(text, maxLen) {
    const chunks = [];
    for (let i = 0; i < text.length; i += maxLen) {
        chunks.push(text.substring(i, i + maxLen));
    }
    return chunks;
}

// ── Filename helpers ──────────────────────────────────────────────────────────

function brigadeNameToFilename(name, model) {
    const safeName = typeof name === 'string' && name.trim() ? name.trim() : 'unknown_unit';
    const areaMatch = safeName.match(/^(\d+\w*)\s+([A-Za-z]+)(?:\s+Brigade)?/i);
    const area = areaMatch ? `${areaMatch[1]} ${areaMatch[2]}` : safeName;
    const filename = area.toLowerCase().replace(/\s+/g, '_');
    return `${filename}_${model}.json`;
}

// ── Fallback for unparseable entries ──────────────────────────────────────────

function createFallbackMovementFromEntry(entryText) {
    const cleaned = entryText.replace(/^\s*⚔️\s*/, '').trim();
    const dateMatch = cleaned.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})\./);

    let date = null;
    if (dateMatch) {
        const day = String(Math.max(1, parseInt(dateMatch[1], 10))).padStart(2, '0');
        const month = String(Math.max(1, parseInt(dateMatch[2], 10))).padStart(2, '0');
        date = `${dateMatch[3]}-${month}-${day}`;
    }

    const placeMatch = cleaned.match(/(?:^|\s)(?:Na|U|Iz|Sa)\s+([^,.;]+)/i);
    return {
        date,
        place: placeMatch ? placeMatch[1].trim() : null,
        coordinates: null,
        operation: 'Unparsed chronology entry',
        division: null,
        notes: cleaned
    };
}

// ── LLM prompt & API call ─────────────────────────────────────────────────────

function buildPrompt(text, expectedEntries) {
    const entryInstruction = Number.isInteger(expectedEntries)
        ? `\n11. The input contains exactly ${expectedEntries} chronology entr${expectedEntries === 1 ? 'y' : 'ies'}. Return exactly ${expectedEntries} item(s) in "movements", preserving input order and covering every entry.`
        : '';

    return `You are an expert military historian analyzing historical documentation about WWII Yugoslav partisan military units: brigades, divisions and corps. The content may be in Serbian/Croatian/Bosnian.

Extract brigade campaign and movement data from the following webpage content. Return a JSON object in this exact format:

{
  "brigade_id": <number if the unit is a brigade, otherwise null>,
  "unit_name": "<area name only, e.g., '1st Dalmatian Brigade' or '8th Dalmatian Corps'>",
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
3. If there are events at the same location on consecutive days, merge them into a single movement with a date of the first day and include notes about the subsequent days' events
4. Include geographic coordinates (lat, lng) - use approximate coordinates for known locations (use null if unknown)
5. Identify the brigade name and extract brigade_id if mentioned (e.g., "8. dalmatinska brigada" = 8th Dalmatian Brigade)
6. Only return valid JSON, no markdown formatting or code blocks
7. If coordinates cannot be determined, use null for the entire coordinates object
8. Preserve division names as mentioned in the text; if the brigade was attached to a division during an operation, include that division name in the "division" field
9. Include full context in notes for each operation
10. Omit events that are purely ceremonial or administrative: award ceremonies, receiving flags, HQ meetings, and decorations — UNLESS they are directly connected to a combat operation or movement. Focus on actual campaign movements and operations.
11. Translate brigade/division/corps names to English
12. For unit names, use only the area name (e.g., '1st Dalmatian Brigade'), not the full honorific name.${entryInstruction}

Webpage Content:
${text}

Return ONLY the valid JSON object, nothing else.`;
}

async function callLlmApi({ provider, model, openaiClient, anthropicClient, prompt }) {
    let responseText = null;

    if (provider === 'openai') {
        const isGpt5 = /^gpt-5/i.test(model);
        const params = {
            model,
            messages: [{ role: 'user', content: prompt }],
            ...(isGpt5 ? { max_completion_tokens: 8192 } : { max_tokens: 8192 })
        };
        const completion = await openaiClient.chat.completions.create(params);
        const message = completion?.choices?.[0]?.message;
        const content = message?.content;
        if (typeof content === 'string') {
            responseText = content;
        } else if (Array.isArray(content)) {
            responseText = content.map(p => (p?.text || '')).join('').trim();
        }
        if (!responseText && message?.refusal) responseText = message.refusal;
    } else if (provider === 'anthropic') {
        const completion = await anthropicClient.messages.create({
            model,
            max_tokens: 8192,
            messages: [{ role: 'user', content: prompt }]
        });
        if (Array.isArray(completion?.content)) {
            responseText = completion.content
                .filter(p => p?.type === 'text' && typeof p.text === 'string')
                .map(p => p.text)
                .join('').trim();
        }
    } else {
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }

    return responseText;
}

async function extractChunkData({ provider, model, openaiClient, anthropicClient, text, expectedEntries, onLog }) {
    const prompt = buildPrompt(text, expectedEntries);

    let responseText;
    try {
        responseText = await callLlmApi({ provider, model, openaiClient, anthropicClient, prompt });
    } catch (err) {
        throw new Error(`LLM API call failed: ${err.message}`);
    }

    if (!responseText) {
        throw new Error(`LLM provider "${provider}" returned empty response`);
    }

    // Extract JSON from response (handle markdown-wrapped or raw JSON)
    let jsonMatch = responseText.match(/```json\n?([\s\S]*?)\n?```/);
    if (!jsonMatch) {
        jsonMatch = responseText.match(/\{[\s\S]*\}/);
    }
    if (!jsonMatch) {
        throw new Error('Could not locate JSON object in LLM response');
    }

    const jsonStr = jsonMatch[1] || jsonMatch[0];
    return tryParseJsonWithRepairs(jsonStr);
}

// ── Main public API ───────────────────────────────────────────────────────────

/**
 * Extract brigade campaign data from a URL using an LLM.
 *
 * @param {object} options
 * @param {string} options.url           - Source URL
 * @param {string} [options.model]       - Model name (default: 'gpt-4o')
 * @param {string} [options.provider]    - 'openai' | 'anthropic' | 'auto'
 * @param {function} [options.onLog]     - (message, level?) => void — called for progress updates
 * @param {function} [options.onChunkResult] - (movements[]) => void — called after each chunk
 * @param {boolean} [options.saveToFile] - Whether to save result JSON (default: true)
 * @returns {Promise<object>} The extracted campaign data object
 */
async function extractCampaign({ url, model = 'gpt-4o', provider = 'auto', onLog = console.log, onChunkResult, saveToFile = true }) {
    const log = (msg, level = 'info') => onLog(msg, level);

    // Resolve provider + model
    let resolvedProvider, resolvedModel;
    try {
        ({ provider: resolvedProvider, model: resolvedModel } = resolveProviderAndModel(model, provider));
    } catch (err) {
        throw new Error(`Configuration error: ${err.message}`);
    }

    // Validate API keys
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

    if (resolvedProvider === 'openai' && !openaiApiKey) {
        throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    if (resolvedProvider === 'anthropic' && !anthropicApiKey) {
        throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }

    const openaiClient = resolvedProvider === 'openai' ? new OpenAI({ apiKey: openaiApiKey }) : null;
    const anthropicClient = resolvedProvider === 'anthropic' ? new Anthropic({ apiKey: anthropicApiKey }) : null;

    log(`Provider: ${resolvedProvider} | Model: ${resolvedModel}`);
    log(`Fetching: ${url}`);

    // Fetch and parse page
    let html;
    try {
        html = await fetchWebpage(url);
    } catch (err) {
        throw new Error(`Failed to fetch URL: ${err.message}`);
    }
    log(`Page fetched (${Math.round(html.length / 1024)} KB)`);

    log('Extracting text content...');
    const textContent = extractTextFromHtml(html, url);

    if (!textContent || textContent.length < 50) {
        throw new Error('Extracted text is too short — the page may not be supported or text extraction failed');
    }
    log(`Text extracted: ${textContent.length} characters`);

    // Split into chunks
    const chronologyEntries = extractChronologyEntries(textContent);
    let chunkJobs;

    if (chronologyEntries.length > 0) {
        chunkJobs = splitEntriesIntoChunks(chronologyEntries, 1, 12000)
            .map(chunk => ({ text: chunk.text, expectedEntries: chunk.entries.length, entries: chunk.entries }));
        log(`Found ${chronologyEntries.length} ⚔️ chronology entries → ${chunkJobs.length} API request${chunkJobs.length !== 1 ? 's' : ''}`);
    } else {
        chunkJobs = splitTextIntoChunks(textContent, 24000)
            .map(chunkText => ({ text: chunkText, expectedEntries: null, entries: [] }));
        log(`No ⚔️ markers found — processing as ${chunkJobs.length} plain text chunk${chunkJobs.length !== 1 ? 's' : ''}`);
    }

    // Process chunks
    let allMovements = [];
    let brigadeId = null;
    let brigadeName = null;
    const notes = [];
    let placed = 0;
    let unplaced = 0;

    for (let idx = 0; idx < chunkJobs.length; idx++) {
        const chunk = chunkJobs[idx];
        log(`[${idx + 1}/${chunkJobs.length}] Calling ${resolvedProvider} (${resolvedModel})...`);

        let brigadeData;
        try {
            brigadeData = await extractChunkData({
                provider: resolvedProvider,
                model: resolvedModel,
                openaiClient,
                anthropicClient,
                text: chunk.text,
                expectedEntries: chunk.expectedEntries,
                onLog: log
            });
        } catch (err) {
            log(`Chunk ${idx + 1} failed: ${err.message}`, 'warn');
            // Apply fallback for all entries in this failed chunk
            if (chunk.entries.length > 0) {
                const fallbacks = chunk.entries.map(createFallbackMovementFromEntry);
                log(`Applied fallback for ${fallbacks.length} entry/entries`, 'warn');
                allMovements = allMovements.concat(fallbacks);
                unplaced += fallbacks.length;
                onChunkResult?.(fallbacks);
            }
            continue;
        }

        const movements = Array.isArray(brigadeData.movements) ? brigadeData.movements : [];
        const movementCount = movements.length;

        // Warn if fewer movements than expected
        if (Number.isInteger(chunk.expectedEntries) && movementCount < chunk.expectedEntries) {
            log(`Chunk ${idx + 1}: expected ${chunk.expectedEntries}, got ${movementCount} — applying fallback for ${chunk.expectedEntries - movementCount} missing`, 'warn');
            for (let mi = movementCount; mi < chunk.entries.length; mi++) {
                movements.push(createFallbackMovementFromEntry(chunk.entries[mi]));
            }
        }

        const chunkPlaced = movements.filter(m => m?.coordinates && Number.isFinite(m.coordinates.lat) && Number.isFinite(m.coordinates.lng)).length;
        placed += chunkPlaced;
        unplaced += movements.length - chunkPlaced;

        log(`Chunk ${idx + 1}: ${movementCount} movements extracted (${chunkPlaced} placed, ${movements.length - chunkPlaced} unplaced)`);
        allMovements = allMovements.concat(movements);

        // Resolve unit metadata from first successful chunk that has it
        if (!brigadeId && brigadeData.brigade_id) brigadeId = brigadeData.brigade_id;
        if (!brigadeName) {
            brigadeName = brigadeData.brigade_name || brigadeData.unit_name || null;
        }
        if (brigadeData.notes) notes.push(brigadeData.notes);

        // Stream partial results to caller (e.g. for live map updates)
        onChunkResult?.(movements);
    }

    log(`Total: ${allMovements.length} movements | ${placed} placed | ${unplaced} unplaced`);

    const output = {
        brigade_id: brigadeId,
        brigade_name: brigadeName,
        movements: allMovements,
        notes: notes.join(' | '),
        source: url
    };

    // Save to file
    if (saveToFile) {
        const filename = brigadeNameToFilename(brigadeName, resolvedModel);
        const outputDir = path.resolve(__dirname, '..', '..', 'public', 'assets', 'brigades', 'model_test');
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
        const outputPath = path.join(outputDir, filename);
        fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
        log(`Saved: public/assets/brigades/model_test/${filename}`);
        output._filename = filename;
    }

    return output;
}

module.exports = { extractCampaign, resolveProviderAndModel };
