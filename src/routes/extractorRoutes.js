/**
 * extractorRoutes.js
 * API routes for the Campaign Extractor web tool.
 *
 * GET /api/extractor/stream?url=<encoded>&model=<model>&provider=<provider>
 *   Server-Sent Events stream: emits log, chunk_result, result, error, done events.
 *
 * GET /api/extractor/models
 *   Returns the list of available models and providers.
 */

const express = require('express');
const router = express.Router();
const { extractCampaign } = require('../utils/campaignExtractor');

// ── Available model catalogue ─────────────────────────────────────────────────

const AVAILABLE_MODELS = [
    // ── Anthropic ─────────────────────────────────────────────────────────────
    { id: 'claude-opus-4-6',            provider: 'anthropic', label: 'Claude Opus 4.6 ★' },
    { id: 'claude-sonnet-4-6',          provider: 'anthropic', label: 'Claude Sonnet 4.6 ★' },
    { id: 'claude-opus-4-5-20251101',   provider: 'anthropic', label: 'Claude Opus 4.5' },
    { id: 'claude-sonnet-4-5',          provider: 'anthropic', label: 'Claude Sonnet 4.5 ★' },
    { id: 'claude-sonnet-4-5-20251015', provider: 'anthropic', label: 'Claude Sonnet 4.5 (dated)' },
    { id: 'claude-3-7-sonnet-20250219', provider: 'anthropic', label: 'Claude 3.7 Sonnet' },
    { id: 'claude-3-5-sonnet-20241022', provider: 'anthropic', label: 'Claude 3.5 Sonnet' },
    // ── OpenAI ────────────────────────────────────────────────────────────────
    { id: 'gpt-5.1',                    provider: 'openai',    label: 'GPT-5.1 ★' },
    { id: 'gpt-5.2',                    provider: 'openai',    label: 'GPT-5.2 ★' },
    { id: 'gpt-4.1',                    provider: 'openai',    label: 'GPT-4.1 ★' },
    { id: 'gpt-4o',                     provider: 'openai',    label: 'GPT-4o ★' },
    { id: 'gpt-4.1-mini',               provider: 'openai',    label: 'GPT-4.1 mini' },
    { id: 'o3',                         provider: 'openai',    label: 'o3' },
    { id: 'o4-mini',                    provider: 'openai',    label: 'o4-mini' },
];

// ── GET /api/extractor/models ─────────────────────────────────────────────────

router.get('/extractor/models', (req, res) => {
    const availableKeys = {
        openai:    !!process.env.OPENAI_API_KEY,
        anthropic: !!process.env.ANTHROPIC_API_KEY
    };
    res.json({ models: AVAILABLE_MODELS, availableKeys });
});

// ── GET /api/extractor/stream ─────────────────────────────────────────────────
// Server-Sent Events endpoint: streams extraction progress and results.

router.get('/extractor/stream', async (req, res) => {
    const { url, model, provider, filterBrigade, filterFromDate } = req.query;

    // Validate required params
    if (!url) {
        return res.status(400).json({ error: 'url query parameter is required' });
    }

    // SSE headers
    res.writeHead(200, {
        'Content-Type':      'text/event-stream',
        'Cache-Control':     'no-cache',
        'Connection':        'keep-alive',
        'X-Accel-Buffering': 'no'
    });

    // Helper: write a named SSE event
    const sendEvent = (type, data) => {
        try {
            res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
            if (typeof res.flush === 'function') res.flush();
        } catch {
            // Client disconnected — ignore write errors
        }
    };

    // Resolve when client disconnects so we can end the response cleanly
    let resolveClose;
    const clientClosed = new Promise(resolve => { resolveClose = resolve; });
    let closed = false;
    req.on('close', () => { closed = true; resolveClose(); });

    try {
        const result = await extractCampaign({
            url,
            model:    model    || 'gpt-4o',
            provider: provider || 'auto',

            onLog: (message, level = 'info') => {
                if (!closed) sendEvent('log', { message, level });
            },

            onChunkResult: (movements) => {
                if (!closed) sendEvent('chunk_result', { movements });
            },

            brigadeFilter: (filterBrigade && filterFromDate)
                ? { name: filterBrigade, fromDate: filterFromDate }
                : undefined,

            saveToFile: true
        });

        if (!closed) {
            sendEvent('result', {
                brigade_name: result.brigade_name,
                brigade_id:   result.brigade_id,
                movements:    result.movements,
                notes:        result.notes,
                source:       result.source,
                filename:     result._filename || null
            });
            sendEvent('done', { total: result.movements.length });
        }
    } catch (err) {
        if (!closed) {
            sendEvent('error', { message: err.message });
            sendEvent('done',  { total: 0 });
        }
    }

    // Wait for the client to close the EventSource (triggered by the 'done' handler),
    // then end the response. This prevents the race condition where res.end() fires
    // before the browser has processed the last SSE event.
    await Promise.race([
        clientClosed,
        new Promise(resolve => setTimeout(resolve, 10000)) // 10s safety timeout
    ]);
    res.end();
});

module.exports = router;
