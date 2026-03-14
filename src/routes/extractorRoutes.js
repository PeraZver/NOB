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
const { execFile } = require('child_process');
const path = require('path');
const fs   = require('fs');
const { extractCampaign, OUTPUT_DIR, wikiCheck } = require('../utils/campaignExtractor');

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

// ── GET /api/extractor/wiki-check ─────────────────────────────────────────────
// SSE: cross-checks an existing brigade JSON against a Wikipedia article.

router.get('/extractor/wiki-check', async (req, res) => {
    const { wikiUrl, filename, model, provider } = req.query;
    if (!wikiUrl)  return res.status(400).json({ error: 'wikiUrl is required' });
    if (!filename) return res.status(400).json({ error: 'filename is required' });

    res.writeHead(200, {
        'Content-Type':      'text/event-stream',
        'Cache-Control':     'no-cache',
        'Connection':        'keep-alive',
        'X-Accel-Buffering': 'no'
    });

    const sendEvent = (type, data) => {
        try { res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`); if (typeof res.flush === 'function') res.flush(); } catch {}
    };

    let closed = false, resolveClose;
    const clientClosed = new Promise(r => { resolveClose = r; });
    req.on('close', () => { closed = true; resolveClose(); });

    // Load existing movements from file
    const filePath = path.join(OUTPUT_DIR, filename);
    let existingMovements = [];
    try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        existingMovements = Array.isArray(data.movements) ? data.movements : [];
    } catch {
        if (!closed) sendEvent('log', { message: `Warning: could not load ${filename} — comparing against empty set`, level: 'warn' });
    }

    try {
        const result = await wikiCheck({
            url: wikiUrl,
            existingMovements,
            model:    model    || 'gpt-4o',
            provider: provider || 'auto',
            onLog: (message, level = 'info') => { if (!closed) sendEvent('log', { message, level }); }
        });

        // Append new movements to file
        if (result.new_movements?.length > 0) {
            try {
                const existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                const keys = new Set((existing.movements || []).map(m => `${m.date || ''}|${(m.place || '').toLowerCase().trim()}`));
                const toAdd = result.new_movements.filter(m => !keys.has(`${m.date || ''}|${(m.place || '').toLowerCase().trim()}`));
                if (toAdd.length > 0) {
                    existing.movements = [...(existing.movements || []), ...toAdd];
                    fs.writeFileSync(filePath, JSON.stringify(existing, null, 2), 'utf8');
                    result._appended = toAdd.length;
                }
            } catch { result._appended = 0; }
        }

        if (!closed) {
            sendEvent('wiki_result', result);
            sendEvent('done', {});
        }
    } catch (err) {
        if (!closed) {
            sendEvent('error',  { message: err.message });
            sendEvent('done', {});
        }
    }

    await Promise.race([clientClosed, new Promise(r => setTimeout(r, 30000))]);
    res.end();
});

// ── GET /api/extractor/list-files ─────────────────────────────────────────────
// Returns all JSON files in OUTPUT_DIR sorted newest-first.

router.get('/extractor/list-files', (_req, res) => {
    try {
        const files = fs.readdirSync(OUTPUT_DIR)
            .filter(f => f.endsWith('.json'))
            .map(f => ({ name: f, mtime: fs.statSync(path.join(OUTPUT_DIR, f)).mtimeMs }))
            .sort((a, b) => b.mtime - a.mtime)
            .map(f => f.name);
        res.json({ files });
    } catch {
        res.json({ files: [] });
    }
});

// ── POST /api/extractor/save-file ─────────────────────────────────────────────
// Overwrites the movements array in a file in OUTPUT_DIR (preserves metadata).

router.post('/extractor/save-file', (req, res) => {
    const { filename, movements } = req.body;
    if (!filename || /[/\\]/.test(filename) || filename.includes('..')) {
        return res.status(400).json({ error: 'Invalid filename' });
    }
    if (!Array.isArray(movements)) {
        return res.status(400).json({ error: 'movements must be an array' });
    }
    const filePath = path.join(OUTPUT_DIR, filename);
    try {
        let existing = {};
        try { existing = JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { /* new file */ }
        fs.writeFileSync(filePath, JSON.stringify({ ...existing, movements }, null, 2), 'utf8');
        res.json({ ok: true, saved: movements.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/extractor/open-file ──────────────────────────────────────────────
// Opens the saved JSON file with the OS default text editor.

router.get('/extractor/open-file', (req, res) => {
    const { filename } = req.query;
    if (!filename || /[/\\]/.test(filename) || filename.includes('..')) {
        return res.status(400).json({ error: 'Invalid filename' });
    }
    const filePath = path.join(OUTPUT_DIR, filename);
    console.log('[open-file] path:', filePath, '| exists:', fs.existsSync(filePath));

    // Use execFile with explicit args to avoid shell-quoting issues on paths with spaces
    const onErr = err => err && console.error('[open-file]', err.message);
    if (process.platform === 'win32') {
        // cmd /c start "" "<path>"  — opens with the default Windows handler
        execFile('cmd', ['/c', 'start', '', filePath], onErr);
    } else if (process.platform === 'darwin') {
        execFile('open', [filePath], onErr);
    } else {
        execFile('xdg-open', [filePath], onErr);
    }

    res.json({ ok: true });
});

module.exports = router;
