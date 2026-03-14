/**
 * extractor.js
 * Client-side logic for the NOB Campaign Extractor page (extractor.html).
 * Depends on: Leaflet (must be loaded first)
 */

// ── State ─────────────────────────────────────────────────────────────────────
const STATE = {
  eventSource:  null,
  allMovements: [],
  placed:       0,
  unplaced:     0,
  chunksDone:   0,
  finalResult:  null,
  markerLayer:  null,
  routeLayer:   null,
  map:          null,
};

// ── Map initialisation ────────────────────────────────────────────────────────
(function initMap() {
  STATE.map = L.map('map', { zoomControl: true }).setView([44.2, 17.5], 7);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 18
  }).addTo(STATE.map);
  STATE.markerLayer = L.layerGroup().addTo(STATE.map);
  STATE.routeLayer  = L.layerGroup().addTo(STATE.map);
})();

// ── Console helpers ───────────────────────────────────────────────────────────
const consoleEl = document.getElementById('console-output');

function logLine(message, level = 'info') {
  const ts = new Date().toLocaleTimeString('en-GB', { hour12: false });
  const line = document.createElement('div');
  line.className = 'log-line';

  const className =
    level === 'warn'  ? 'log-warn'  :
    level === 'error' ? 'log-error' :
    level === 'ok'    ? 'log-ok'    : 'log-info';

  line.innerHTML =
    `<span class="log-ts">${ts}</span>` +
    `<span class="${className}">${escHtml(message)}</span>`;
  consoleEl.appendChild(line);
  consoleEl.scrollTop = consoleEl.scrollHeight;
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

document.getElementById('clear-console').addEventListener('click', () => {
  consoleEl.innerHTML = '';
});

// ── Status bar helpers ────────────────────────────────────────────────────────
function setStatus(type, label) {
  const pill = document.getElementById('status-pill');
  pill.className = `pill ${type}`;
  pill.innerHTML = type === 'running'
    ? `<span class="dot-pulse"></span> ${label}`
    : label;
}

function updateStats() {
  document.getElementById('stat-chunks').textContent   = STATE.chunksDone || '—';
  document.getElementById('stat-total').textContent    = STATE.allMovements.length || '—';
  document.getElementById('stat-placed').textContent   = STATE.placed   || '—';
  document.getElementById('stat-unplaced').textContent = STATE.unplaced || '—';
}

// ── Map rendering ─────────────────────────────────────────────────────────────
const ROUTE_COLOR   = '#4b9cf5';
const MARKER_PLACED = '#3dba6a';

function addMarkersForMovements(movements) {
  movements.forEach(item => {
    if (!item?.coordinates || !Number.isFinite(item.coordinates.lat) || !Number.isFinite(item.coordinates.lng)) return;
    const { lat, lng } = item.coordinates;
    const marker = L.circleMarker([lat, lng], {
      radius:      7,
      color:       MARKER_PLACED,
      fillColor:   MARKER_PLACED,
      fillOpacity: 0.75,
      weight:      2
    });
    marker.bindPopup(buildPopup(item));
    marker.addTo(STATE.markerLayer);
  });
}

function buildPopup(item) {
  const coords = item.coordinates
    ? `${item.coordinates.lat.toFixed(4)}, ${item.coordinates.lng.toFixed(4)}`
    : 'n/a';
  return `<div style="font-family:Calibri,Arial,sans-serif;min-width:180px;max-width:300px;">
    <strong style="font-size:1.05em">${escHtml(item.place || '?')}</strong>
    <div style="color:#666;font-size:.9em;margin:2px 0">${escHtml(item.date || '?')}</div>
    <div style="margin:4px 0 2px"><em>${escHtml(item.operation || '')}</em></div>
    ${item.division ? `<div style="font-size:.88em;color:#555">Division: ${escHtml(item.division)}</div>` : ''}
    ${item.notes    ? `<div style="font-size:.85em;margin-top:5px;color:#333">${escHtml(item.notes.substring(0, 260))}${item.notes.length > 260 ? '…' : ''}</div>` : ''}
    <div style="font-size:.75em;color:#aaa;margin-top:6px">📍 ${coords}</div>
  </div>`;
}

function drawRoute(movements) {
  STATE.routeLayer.clearLayers();
  const points = movements
    .filter(m => m?.coordinates && Number.isFinite(m.coordinates.lat) && Number.isFinite(m.coordinates.lng))
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    .map(m => [m.coordinates.lat, m.coordinates.lng]);

  if (points.length >= 2) {
    L.polyline(points, {
      color:     ROUTE_COLOR,
      weight:    2.5,
      opacity:   0.55,
      dashArray: '5, 6'
    }).addTo(STATE.routeLayer);
  }
}

function fitMapToMovements(movements) {
  const pts = movements
    .filter(m => m?.coordinates && Number.isFinite(m.coordinates.lat) && Number.isFinite(m.coordinates.lng))
    .map(m => [m.coordinates.lat, m.coordinates.lng]);
  if (pts.length === 0) return;
  try {
    STATE.map.fitBounds(L.latLngBounds(pts), { padding: [30, 30], maxZoom: 10 });
  } catch {}
}

function updateLegend(brigadeName, placed, total) {
  const legendEl = document.getElementById('legend-content');
  const pct = total > 0 ? Math.round(placed / total * 100) : 0;
  legendEl.innerHTML =
    `<div class="legend-row"><span class="legend-dot" style="background:${MARKER_PLACED}"></span> Placed (${placed})</div>` +
    `<div class="legend-row"><span class="legend-dot" style="background:#e05252"></span> Unplaced (${total - placed})</div>` +
    `<hr style="border-color:#3a3b40;margin:5px 0">` +
    `<div style="color:#9eb8d8;font-size:.9em">${escHtml(brigadeName || 'Unknown unit')}</div>` +
    `<div style="color:#7c7f87;font-size:.85em">${placed}/${total} placed (${pct}%)</div>`;
}

// ── Results table ─────────────────────────────────────────────────────────────
const tbody = document.getElementById('results-tbody');
let resultsVisible = true;

function appendTableRows(movements) {
  movements.forEach(item => {
    const tr = document.createElement('tr');
    const hasCoords = item?.coordinates && Number.isFinite(item.coordinates.lat);
    const coordStr = hasCoords
      ? `${item.coordinates.lat.toFixed(3)}, ${item.coordinates.lng.toFixed(3)}`
      : '—';
    tr.innerHTML =
      `<td style="color:var(--text-dim)">${tbody.children.length + 1}</td>` +
      `<td class="date-cell">${escHtml(item.date || '?')}</td>` +
      `<td>${escHtml(item.place || '?')}</td>` +
      `<td>${escHtml((item.operation || '').substring(0, 50))}</td>` +
      `<td style="color:var(--text-dim)">${escHtml(item.division || '—')}</td>` +
      `<td class="coords-cell">${escHtml(coordStr)}</td>` +
      `<td class="${hasCoords ? 'placed' : 'unplaced'}">${hasCoords ? '✓' : '✗'}</td>` +
      `<td class="actions-col"></td>`;
    tbody.appendChild(tr);
  });
  document.getElementById('results-label').textContent = `Movements (${tbody.children.length})`;
}

function toggleResults() {
  resultsVisible = !resultsVisible;
  const wrap = document.getElementById('results-table-wrap');
  const chev = document.getElementById('results-chevron');
  wrap.style.display = resultsVisible ? '' : 'none';
  chev.textContent   = resultsVisible ? '▲' : '▼';
}

// ── Model dropdown (populated from server) ────────────────────────────────────
async function loadModels() {
  const sel = document.getElementById('model-select');
  try {
    const resp = await fetch('/api/extractor/models');
    const data = await resp.json();
    sel.innerHTML = '';

    const groups = {};
    data.models.forEach(m => {
      if (!groups[m.provider]) groups[m.provider] = [];
      groups[m.provider].push(m);
    });

    const providerLabels = { anthropic: 'Anthropic', openai: 'OpenAI' };
    Object.entries(groups).forEach(([provider, models]) => {
      const hasKey = data.availableKeys[provider];
      const grp = document.createElement('optgroup');
      grp.label = `${providerLabels[provider] || provider}${hasKey ? '' : ' (no API key)'}`;
      models.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.label;
        opt.disabled = !hasKey;
        grp.appendChild(opt);
      });
      sel.appendChild(grp);
    });

    const first = Array.from(sel.options).find(o => !o.disabled);
    if (first) first.selected = true;
  } catch {
    sel.innerHTML = '<option value="gpt-4o">gpt-4o</option>';
  }
  document.getElementById('extract-btn').disabled = false;
}
loadModels();

// ── Extraction ────────────────────────────────────────────────────────────────
document.getElementById('extract-btn').addEventListener('click', () => {
  if (STATE.eventSource) { stopExtraction(); return; }
  startExtraction();
});

function startExtraction() {
  const url            = document.getElementById('url-input').value.trim();
  const model          = document.getElementById('model-select').value;
  const provider       = document.getElementById('provider-select').value;
  const filterBrigade  = document.getElementById('filter-brigade').value.trim();
  const filterFromDate = document.getElementById('filter-date').value;

  if (!url) { logLine('Please enter a URL.', 'warn'); return; }

  // Reset state
  STATE.allMovements = [];
  STATE.placed       = 0;
  STATE.unplaced     = 0;
  STATE.chunksDone   = 0;
  STATE.finalResult  = null;
  STATE.markerLayer.clearLayers();
  STATE.routeLayer.clearLayers();
  tbody.innerHTML = '';
  document.getElementById('results-pane').style.display   = 'none';
  document.getElementById('save-btn').style.display       = 'none';
  document.getElementById('open-file-btn').style.display  = 'none';
  document.getElementById('export-db-btn').style.display  = 'none';
  document.getElementById('save-review-btn').style.display = 'none';
  document.getElementById('stat-file').textContent        = '';
  document.getElementById('wiki-check-btn').disabled      = true;
  document.body.classList.remove('review-active');
  updateStats();
  updateLegend(null, 0, 0);

  logLine(`Starting extraction…`);
  logLine(`URL: ${url}`);
  logLine(`Model: ${model} | Provider: ${provider}`);
  if (filterBrigade && filterFromDate) {
    logLine(`Brigade filter: "${filterBrigade}" from ${filterFromDate}`, 'warn');
  }
  setStatus('running', 'Extracting');

  const btn = document.getElementById('extract-btn');
  btn.textContent = 'Stop';
  btn.classList.add('stop');

  const params = { url, model, provider };
  if (filterBrigade && filterFromDate) {
    params.filterBrigade  = filterBrigade;
    params.filterFromDate = filterFromDate;
  }
  const es = new EventSource(`/api/extractor/stream?${new URLSearchParams(params)}`);
  STATE.eventSource = es;

  es.addEventListener('log', e => {
    const { message, level } = JSON.parse(e.data);
    logLine(message, level || 'info');
  });

  es.addEventListener('chunk_result', e => {
    const { movements } = JSON.parse(e.data);
    STATE.chunksDone++;
    STATE.allMovements = STATE.allMovements.concat(movements);
    const chunkPlaced = movements.filter(
      m => m?.coordinates && Number.isFinite(m.coordinates.lat) && Number.isFinite(m.coordinates.lng)
    ).length;
    STATE.placed   += chunkPlaced;
    STATE.unplaced += movements.length - chunkPlaced;

    movements.forEach(m => {
      const note    = (m.notes || '').trim();
      const snippet = note.length > 100 ? note.slice(0, 100) + '…' : note;
      logLine([m.date || '?', m.place || '?', snippet].filter(Boolean).join('  ·  '));
    });

    addMarkersForMovements(movements);
    drawRoute(STATE.allMovements);
    appendTableRows(movements);
    updateStats();
  });

  es.addEventListener('result', e => {
    STATE.finalResult = JSON.parse(e.data);
  });

  es.addEventListener('error', e => {
    try {
      const { message } = JSON.parse(e.data);
      logLine(`Error: ${message}`, 'error');
    } catch {
      if (STATE.eventSource) {
        logLine('Connection lost — is the server running?', 'error');
        closeEventSource();
        resetButton();
        setStatus('error', 'Connection lost');
      }
    }
  });

  es.addEventListener('done', e => {
    const { total } = JSON.parse(e.data);
    const placed = STATE.placed;
    logLine(`Done. ${total} movements | ${placed} placed | ${STATE.unplaced} unplaced`, 'ok');

    if (STATE.finalResult) {
      updateLegend(STATE.finalResult.brigade_name, placed, total);
      if (STATE.finalResult.filename) {
        document.getElementById('stat-file').textContent = `Saved: ${STATE.finalResult.filename}`;
        const openBtn = document.getElementById('open-file-btn');
        openBtn.style.display = '';
        openBtn.onclick = () => fetch(`/api/extractor/open-file?filename=${encodeURIComponent(STATE.finalResult.filename)}`);
        // Refresh file list and auto-select the newly extracted file
        loadFileList(STATE.finalResult.filename);
      }
      document.getElementById('save-btn').style.display = '';
    }

    setStatus('done', `Done — ${total} movements`);
    fitMapToMovements(STATE.allMovements);

    if (tbody.children.length > 0) {
      document.getElementById('results-pane').style.display = 'flex';
    }

    closeEventSource();
    resetButton();
  });
}

function stopExtraction() {
  closeEventSource();
  resetButton();
  setStatus('idle', 'Stopped');
  logLine('Extraction stopped by user.', 'warn');
}

function closeEventSource() {
  if (STATE.eventSource) {
    STATE.eventSource.close();
    STATE.eventSource = null;
  }
}

function resetButton() {
  const btn = document.getElementById('extract-btn');
  btn.textContent = 'Extract';
  btn.classList.remove('stop');
  btn.disabled = false;
}

// ── Save JSON ─────────────────────────────────────────────────────────────────
document.getElementById('save-btn').addEventListener('click', () => {
  if (!STATE.finalResult) return;
  const blob = new Blob([JSON.stringify(STATE.finalResult, null, 2)], { type: 'application/json' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = STATE.finalResult.filename || 'campaign.json';
  a.click();
  URL.revokeObjectURL(a.href);
});

// ── Keyboard shortcut ─────────────────────────────────────────────────────────
document.getElementById('url-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('extract-btn').click();
});

// ── Brigade filter bar ────────────────────────────────────────────────────────
const filterToggleBtn = document.getElementById('filter-toggle-btn');
const filterBar       = document.getElementById('filter-bar');
const filterHint      = document.getElementById('filter-active-hint');

filterToggleBtn.addEventListener('click', () => {
  const open = filterBar.classList.toggle('open');
  filterToggleBtn.classList.toggle('active', open);
});

document.getElementById('filter-clear-btn').addEventListener('click', () => {
  document.getElementById('filter-brigade').value = '';
  document.getElementById('filter-date').value    = '';
  filterHint.classList.remove('visible');
});

function updateFilterHint() {
  const hasName = !!document.getElementById('filter-brigade').value.trim();
  const hasDate = !!document.getElementById('filter-date').value;
  filterHint.classList.toggle('visible', hasName && hasDate);
}

document.getElementById('filter-brigade').addEventListener('input', updateFilterHint);
document.getElementById('filter-date').addEventListener('change', updateFilterHint);

// ── Wikipedia cross-check bar ─────────────────────────────────────────────────
const wikiToggleBtn = document.getElementById('wiki-toggle-btn');
const wikiBar       = document.getElementById('wiki-bar');

wikiToggleBtn.addEventListener('click', () => {
  const open = wikiBar.classList.toggle('open');
  wikiToggleBtn.classList.toggle('active', open);
  if (open) loadFileList();
});

async function loadFileList(autoSelect = null) {
  const sel = document.getElementById('wiki-file-select');
  try {
    const { files } = await fetch('/api/extractor/list-files').then(r => r.json());
    const prev = autoSelect || sel.value;
    sel.innerHTML = '<option value="">— select file —</option>';
    files.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f;
      opt.textContent = f;
      if (f === prev) opt.selected = true;
      sel.appendChild(opt);
    });
  } catch {
    // silently ignore; keep existing options
  }
  document.getElementById('wiki-check-btn').disabled = !sel.value;
}

document.getElementById('wiki-refresh-btn').addEventListener('click', () => loadFileList());

document.getElementById('wiki-file-select').addEventListener('change', e => {
  document.getElementById('wiki-check-btn').disabled = !e.target.value;
});

document.getElementById('wiki-check-btn').addEventListener('click', () => {
  const wikiUrl  = document.getElementById('wiki-url-input').value.trim();
  const filename = document.getElementById('wiki-file-select').value;
  if (!wikiUrl || !filename) return;

  const model    = document.getElementById('model-select').value;
  const provider = document.getElementById('provider-select').value;

  const btn = document.getElementById('wiki-check-btn');
  btn.textContent = 'Checking…';
  btn.disabled    = true;

  logLine('');
  logLine('── Wikipedia Cross-Check ─────────────────────────────', 'ok');
  logLine(`File: ${filename}`);
  logLine(`URL: ${wikiUrl}`);

  const params = new URLSearchParams({ wikiUrl, filename, model, provider });
  const es = new EventSource(`/api/extractor/wiki-check?${params}`);

  es.addEventListener('log', e => {
    const { message, level } = JSON.parse(e.data);
    logLine(message, level || 'info');
  });

  es.addEventListener('wiki_result', e => {
    const r = JSON.parse(e.data);
    const score  = r.consistency_score ?? '?';
    const color  = score >= 80 ? 'ok' : score >= 50 ? 'warn' : 'error';

    logLine('');
    logLine(`Consistency score: ${score}%`, color);
    logLine(r.summary || '', 'info');

    if (r.matched?.length) {
      logLine('');
      logLine(`Matched (${r.matched.length}):`, 'ok');
      r.matched.forEach(m => logLine(`  ✓  ${m.json_entry}  —  ${m.wiki_event}`));
    }
    if (r.missing?.length) {
      logLine('');
      logLine(`Missing (${r.missing.length}):`, 'warn');
      r.missing.forEach(m => logLine(`  ✗  [${m.importance}]  ${m.date || '?'}  ${m.event}`));
    }
    if (r._appended > 0) {
      logLine('');
      logLine(`${r._appended} new movement(s) appended to ${filename}`, 'ok');
    }
  });

  es.addEventListener('error', e => {
    try { logLine(`Wiki check error: ${JSON.parse(e.data).message}`, 'error'); } catch { logLine('Wiki check connection lost', 'error'); }
    es.close();
    btn.textContent = 'Check';
    btn.disabled    = false;
  });

  es.addEventListener('done', () => {
    es.close();
    btn.textContent = 'Check';
    btn.disabled    = false;
    logLine('─────────────────────────────────────────────────────', 'ok');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── Review mode ───────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

const REVIEW_COLORS = { pending: '#f5a623', approved: '#3dba6a', deleted: '#e05252' };
const REVIEW = { entries: [], filename: null, meta: {} };
let _editIdx = null;

// ── Helpers: per-entry marker management ──────────────────────────────────────

/** Create a fresh circleMarker and attach it. Returns the marker, or null. */
function _placeMarker(i) {
  const entry = REVIEW.entries[i];
  const c = entry.coordinates;
  if (!c || !Number.isFinite(c.lat) || !Number.isFinite(c.lng)) return null;
  const color = REVIEW_COLORS[entry._status] || REVIEW_COLORS.pending;
  const radius = STATE.map ? _reviewMarkerRadius() : 5;
  const m = L.circleMarker([c.lat, c.lng], {
    radius, color, fillColor: color, fillOpacity: 0.85, weight: 2
  });
  // Lazy popup — always rebuilt fresh so it reflects current status
  m.bindPopup(() => buildReviewPopup(i));
  m.addTo(STATE.markerLayer);
  entry._marker = m;
  return m;
}

/** Update only the color of an existing marker (no remove/recreate). */
function updateMarkerStyle(i) {
  const entry = REVIEW.entries[i];
  if (!entry._marker) return;
  const color = REVIEW_COLORS[entry._status] || REVIEW_COLORS.pending;
  entry._marker.setStyle({ color, fillColor: color });
}

/** Remove existing marker and create a new one (call only when coords change). */
function replaceMarker(i) {
  const entry = REVIEW.entries[i];
  if (entry._marker) { STATE.markerLayer.removeLayer(entry._marker); entry._marker = null; }
  _placeMarker(i);
}

// Adapt review marker radius on zoom so they don't stay visually large when zoomed out
function _reviewMarkerRadius() {
  const z = STATE.map.getZoom();
  return z >= 12 ? 5 : z >= 9 ? 5 : z >= 6 ? 4 : 3;
}
STATE.map.on('zoomend', () => {
  const r = _reviewMarkerRadius();
  REVIEW.entries.forEach(e => { if (e._marker) e._marker.setRadius(r); });
});

// ── Review bar controls ────────────────────────────────────────────────────────

const reviewToggleBtn = document.getElementById('review-toggle-btn');
const reviewBar       = document.getElementById('review-bar');

reviewToggleBtn.addEventListener('click', () => {
  const open = reviewBar.classList.toggle('open');
  reviewToggleBtn.classList.toggle('active', open);
  if (open) loadReviewFileList();
});

async function loadReviewFileList(autoSelect = null) {
  const sel = document.getElementById('review-file-select');
  try {
    const { files } = await fetch('/api/extractor/list-files').then(r => r.json());
    const prev = autoSelect || sel.value;
    sel.innerHTML = '<option value="">— select file —</option>';
    files.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f; opt.textContent = f;
      if (f === prev) opt.selected = true;
      sel.appendChild(opt);
    });
  } catch { /* ignore */ }
  document.getElementById('review-load-btn').disabled = !sel.value;
}

document.getElementById('review-refresh-btn').addEventListener('click', () => loadReviewFileList());
document.getElementById('review-file-select').addEventListener('change', e => {
  document.getElementById('review-load-btn').disabled = !e.target.value;
});
document.getElementById('review-load-btn').addEventListener('click', async () => {
  const fn = document.getElementById('review-file-select').value;
  if (fn) await loadForReview(fn);
});

async function loadForReview(filename) {
  const progress = document.getElementById('review-progress');
  const loadBtn  = document.getElementById('review-load-btn');
  progress.textContent = 'Loading…';
  loadBtn.disabled = true;
  try {
    // Cache-bust so we always get the latest saved version, not a stale browser cache
    const data = await fetch(`/assets/brigades/model_test/${encodeURIComponent(filename)}?_=${Date.now()}`).then(r => r.json());
    if (!Array.isArray(data.movements)) throw new Error('No movements array in file');
    REVIEW.filename = filename;
    REVIEW.meta     = { brigade_name: data.brigade_name || '', brigade_id: data.brigade_id || '', notes: data.notes || '' };
    REVIEW.entries  = data.movements.map((m, i) => ({ ...m, _idx: i, _status: 'pending', _marker: null }));
    renderReviewState();
    updateReviewProgress();
    logLine(`Loaded "${filename}" — ${REVIEW.entries.length} entries`, 'ok');
    // Probe: send '..' which MUST fail filename validation → confirms route is alive
    fetch('/api/extractor/save-file', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: '..', movements: [] })
    }).then(r => r.json()).then(d => {
      if (d.error === 'Invalid filename') logLine('Save route: online ✓', 'ok');
      else logLine('⚠ Unexpected probe response — save may not work', 'warn');
    }).catch(() => logLine('⚠ Save route not responding — restart the server!', 'warn'));
  } catch (err) {
    progress.textContent = `Error: ${err.message}`;
    logLine(`Failed to load file: ${err.message}`, 'error');
  } finally {
    loadBtn.disabled = false;
  }
}

function renderReviewState() {
  STATE.markerLayer.clearLayers();
  STATE.routeLayer.clearLayers();
  tbody.innerHTML = '';
  document.body.classList.add('review-active');

  REVIEW.entries.forEach((_, i) => {
    _placeMarker(i);
    _appendReviewRow(i);
  });

  drawRoute(REVIEW.entries.filter(e => e._status !== 'deleted'));
  fitMapToMovements(REVIEW.entries);

  document.getElementById('results-pane').style.display = 'flex';
  document.getElementById('export-db-btn').style.display = '';
  document.getElementById('save-review-btn').style.display = '';
  document.getElementById('results-label').textContent = `Movements (${REVIEW.entries.length})`;
  document.getElementById('stat-file').textContent = REVIEW.filename;

  const placed = REVIEW.entries.filter(e => e.coordinates && Number.isFinite(e.coordinates.lat)).length;
  updateLegend(REVIEW.meta.brigade_name, placed, REVIEW.entries.length);
  setStatus('idle', `Review — ${REVIEW.entries.length} entries`);
}

// ── Row helpers ────────────────────────────────────────────────────────────────

function _rowHTML(i) {
  const e = REVIEW.entries[i];
  const hasCoords = e.coordinates && Number.isFinite(e.coordinates?.lat) && Number.isFinite(e.coordinates?.lng);
  const coordStr  = hasCoords
    ? `${e.coordinates.lat.toFixed(3)}, ${e.coordinates.lng.toFixed(3)}` : '—';
  const isOk  = e._status === 'approved';
  const isDel = e._status === 'deleted';
  return `<td style="color:var(--text-dim)">${i + 1}</td>` +
    `<td class="date-cell">${escHtml(e.date || '?')}</td>` +
    `<td>${escHtml(e.place || '?')}</td>` +
    `<td>${escHtml((e.operation || '').substring(0, 50))}</td>` +
    `<td style="color:var(--text-dim)">${escHtml(e.division || '—')}</td>` +
    `<td class="coords-cell">${escHtml(coordStr)}</td>` +
    `<td class="${hasCoords ? 'placed' : 'unplaced'}">${hasCoords ? '✓' : '✗'}</td>` +
    `<td class="actions-col" style="white-space:nowrap;padding:2px 6px">` +
      `<button class="review-btn${isOk  ? ' active-approve' : ''}" onclick="setEntryStatus(${i},'approved')" title="Approve">✓</button>` +
      `<button class="review-btn${isDel ? ' active-delete'  : ''}" onclick="setEntryStatus(${i},'deleted')"  title="Delete">✗</button>` +
      `<button class="review-btn" onclick="openEditModal(${i})" title="Edit">✎</button>` +
    `</td>`;
}

function _rowClass(i) {
  const s = REVIEW.entries[i]._status;
  return s === 'approved' ? 'row-ok' : s === 'deleted' ? 'row-deleted' : '';
}

function _appendReviewRow(i) {
  const tr = document.createElement('tr');
  tr.setAttribute('data-review-idx', i);
  tr.className   = _rowClass(i);
  tr.innerHTML   = _rowHTML(i);
  tbody.appendChild(tr);
}

function _refreshReviewRow(i) {
  const old = tbody.querySelector(`[data-review-idx="${i}"]`);
  if (!old) return;
  const tr = document.createElement('tr');
  tr.setAttribute('data-review-idx', i);
  tr.className = _rowClass(i);
  tr.innerHTML = _rowHTML(i);
  old.replaceWith(tr);
}

// ── Entry status + progress ────────────────────────────────────────────────────

function setEntryStatus(i, status) {
  const entry = REVIEW.entries[i];
  entry._status = entry._status === status ? 'pending' : status;
  // Only update color — don't remove/recreate the marker
  updateMarkerStyle(i);
  _refreshReviewRow(i);
  updateReviewProgress();
  drawRoute(REVIEW.entries.filter(e => e._status !== 'deleted'));
}

function updateReviewProgress() {
  const total    = REVIEW.entries.length;
  const approved = REVIEW.entries.filter(e => e._status === 'approved').length;
  const deleted  = REVIEW.entries.filter(e => e._status === 'deleted').length;
  const pending  = total - approved - deleted;
  document.getElementById('review-progress').textContent =
    `${total} entries · ${approved} approved · ${deleted} deleted · ${pending} pending`;
}

// ── Popup ──────────────────────────────────────────────────────────────────────

function buildReviewPopup(i) {
  const e = REVIEW.entries[i];
  const c = e.coordinates;
  const coords = (c && Number.isFinite(c.lat) && Number.isFinite(c.lng))
    ? `${c.lat.toFixed(4)}, ${c.lng.toFixed(4)}` : 'n/a';
  const isOk  = e._status === 'approved';
  const isDel = e._status === 'deleted';
  return `<div style="font-family:Calibri,Arial,sans-serif;min-width:200px;max-width:320px;">
    <strong style="font-size:1.05em">${escHtml(e.place || '?')}</strong>
    <div style="color:#666;font-size:.9em;margin:2px 0">${escHtml(e.date || '?')}</div>
    <div style="margin:4px 0 2px"><em>${escHtml(e.operation || '')}</em></div>
    ${e.division ? `<div style="font-size:.88em;color:#555">Division: ${escHtml(e.division)}</div>` : ''}
    ${e.notes    ? `<div style="font-size:.85em;margin-top:5px;color:#333">${escHtml(e.notes.substring(0, 260))}${e.notes.length > 260 ? '…' : ''}</div>` : ''}
    <div style="font-size:.75em;color:#aaa;margin-top:6px">📍 ${coords}</div>
    <div style="margin-top:10px;display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap;">
      <button onclick="setEntryStatus(${i},'approved')"
        style="padding:3px 10px;border-radius:4px;cursor:pointer;font-size:.85em;border:1px solid ${isOk ? '#3dba6a' : '#666'};background:${isOk ? '#1e5c34' : 'none'};color:${isOk ? '#3dba6a' : '#ccc'}">
        ${isOk ? '✓ Approved' : '✓ Approve'}
      </button>
      <button onclick="setEntryStatus(${i},'deleted')"
        style="padding:3px 10px;border-radius:4px;cursor:pointer;font-size:.85em;border:1px solid ${isDel ? '#e05252' : '#666'};background:${isDel ? '#5c1f1f' : 'none'};color:${isDel ? '#e05252' : '#ccc'}">
        ${isDel ? '✗ Deleted' : '✗ Delete'}
      </button>
      <button onclick="openEditModal(${i})"
        style="padding:3px 10px;border-radius:4px;cursor:pointer;font-size:.85em;border:1px solid #666;background:none;color:#ccc">
        ✎ Edit
      </button>
    </div>
  </div>`;
}

// ── Edit modal ─────────────────────────────────────────────────────────────────

function openEditModal(i) {
  _editIdx = i;
  const e = REVIEW.entries[i];
  document.getElementById('edit-date').value      = e.date              || '';
  document.getElementById('edit-place').value     = e.place             || '';
  document.getElementById('edit-lat').value       = e.coordinates?.lat  ?? '';
  document.getElementById('edit-lng').value       = e.coordinates?.lng  ?? '';
  document.getElementById('edit-operation').value = e.operation         || '';
  document.getElementById('edit-division').value  = e.division          || '';
  document.getElementById('edit-notes').value     = e.notes             || '';
  document.getElementById('edit-modal-idx').textContent = `#${i + 1} of ${REVIEW.entries.length}`;
  document.getElementById('edit-prev-btn').disabled = (i === 0);
  document.getElementById('edit-next-btn').disabled = (i === REVIEW.entries.length - 1);
  document.getElementById('edit-modal').style.display = 'flex';
}

/** Apply current modal field values to REVIEW.entries[_editIdx] and update map/table.
 *  Returns the index that was edited, or null on failure. */
function _applyModalEdits() {
  if (_editIdx === null) return null;
  const i = _editIdx;
  const e = REVIEW.entries[i];
  if (!e) return null;

  const oldLat = e.coordinates?.lat;
  const oldLng = e.coordinates?.lng;

  const dateVal = document.getElementById('edit-date').value;
  const placVal = document.getElementById('edit-place').value;
  if (dateVal) e.date = dateVal;
  if (placVal) e.place = placVal;
  e.operation = document.getElementById('edit-operation').value;
  e.division  = document.getElementById('edit-division').value;
  e.notes     = document.getElementById('edit-notes').value;

  const lat = parseFloat(document.getElementById('edit-lat').value);
  const lng = parseFloat(document.getElementById('edit-lng').value);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    e.coordinates = { lat, lng };
  }

  const coordsChanged = (e.coordinates?.lat !== oldLat) || (e.coordinates?.lng !== oldLng);
  if (coordsChanged) { replaceMarker(i); } else { updateMarkerStyle(i); }
  _refreshReviewRow(i);
  drawRoute(REVIEW.entries.filter(e2 => e2._status !== 'deleted'));
  return i;
}

// Expose to Leaflet popup onclick
window.setEntryStatus = setEntryStatus;
window.openEditModal  = openEditModal;

document.getElementById('edit-cancel-btn').addEventListener('click', () => {
  document.getElementById('edit-modal').style.display = 'none';
  _editIdx = null;
});

document.getElementById('edit-delete-btn').addEventListener('click', () => {
  if (_editIdx === null) return;
  setEntryStatus(_editIdx, 'deleted');
  document.getElementById('edit-modal').style.display = 'none';
  _editIdx = null;
});

document.getElementById('edit-save-btn').addEventListener('click', () => {
  if (_editIdx === null) return;
  try { _applyModalEdits(); } catch (err) {
    console.error('[edit-save]', err);
    logLine(`Edit error: ${err.message}`, 'error');
  }
  document.getElementById('edit-modal').style.display = 'none';
  _editIdx = null;
  saveReviewToDisk();
});

document.getElementById('edit-prev-btn').addEventListener('click', () => _navigateModal(-1));
document.getElementById('edit-next-btn').addEventListener('click', () => _navigateModal(+1));

function _navigateModal(delta) {
  if (_editIdx === null) return;
  try { _applyModalEdits(); } catch (err) {
    console.error('[edit-nav]', err);
    logLine(`Edit error: ${err.message}`, 'error');
  }
  const next = _editIdx + delta;
  if (next < 0 || next >= REVIEW.entries.length) return;
  saveReviewToDisk(true); // silent save before moving on
  openEditModal(next);
}

// Close on backdrop click
document.getElementById('edit-modal').addEventListener('click', ev => {
  if (ev.target === ev.currentTarget) {
    ev.currentTarget.style.display = 'none';
    _editIdx = null;
  }
});

// ── Save review to original file ──────────────────────────────────────────────

async function saveReviewToDisk(silent = false) {
  if (!REVIEW.filename) { console.warn('[save] REVIEW.filename is null — nothing to save'); return; }
  const btn = document.getElementById('save-review-btn');
  btn.textContent = '💾 Saving…';
  btn.disabled = true;

  // Include ALL entries (pending + approved); exclude only deleted
  const movements = REVIEW.entries
    .filter(e => e._status !== 'deleted')
    .map(({ _idx, _status, _marker, ...rest }) => rest);

  console.log(`[save] Saving ${movements.length} movements to ${REVIEW.filename}`);

  try {
    const resp = await fetch('/api/extractor/save-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: REVIEW.filename, movements })
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${data.error || resp.statusText}`);
    console.log(`[save] OK — ${data.saved} entries saved`);
    if (!silent) logLine(`✓ Saved ${data.saved} entries to ${REVIEW.filename}`, 'ok');
    btn.textContent = '✓ Saved';
    setTimeout(() => { btn.textContent = '💾 Save'; }, 2000);
  } catch (err) {
    console.error('[save] Failed:', err);
    // Fallback: offer browser download so no work is lost
    const blob = new Blob([JSON.stringify({ ...REVIEW.meta, movements }, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob), download: REVIEW.filename
    });
    a.click(); URL.revokeObjectURL(a.href);
    logLine(`⚠ Server save failed: ${err.message}`, 'error');
    logLine(`  → File downloaded as fallback. Open the browser console (F12) for details.`, 'error');
    btn.textContent = '⚠ Downloaded';
    setTimeout(() => { btn.textContent = '💾 Save'; }, 3000);
  } finally {
    btn.disabled = false;
  }
}

document.getElementById('save-review-btn').addEventListener('click', saveReviewToDisk);

// ── Export for DB ──────────────────────────────────────────────────────────────

document.getElementById('export-db-btn').addEventListener('click', () => {
  const cleaned = REVIEW.entries
    .filter(e => e._status !== 'deleted')
    .map(({ _idx, _status, _marker, ...rest }) => rest);
  const blob = new Blob([JSON.stringify({ ...REVIEW.meta, movements: cleaned }, null, 2)], { type: 'application/json' });
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: (REVIEW.filename || 'export').replace(/\.json$/i, '') + '_reviewed.json'
  });
  a.click(); URL.revokeObjectURL(a.href);
  logLine(`Exported ${cleaned.length} entries (${REVIEW.entries.length - cleaned.length} deleted)`, 'ok');
});

// ── Operations autocomplete ───────────────────────────────────────────────────

let _operations = null;
let _opFocusIdx = -1;
let _opMatches  = [];

async function loadOperations() {
  if (_operations) return _operations;
  try { _operations = await fetch('/assets/battles/operations.json').then(r => r.json()); }
  catch { _operations = []; }
  return _operations;
}

document.getElementById('edit-operation').addEventListener('focus', loadOperations, { once: true });

document.getElementById('edit-operation').addEventListener('input', async () => {
  const input    = document.getElementById('edit-operation');
  const query    = input.value.trim().toLowerCase();
  const dropdown = document.getElementById('op-dropdown');

  if (!query) { dropdown.style.display = 'none'; _opMatches = []; return; }

  const ops  = await loadOperations();
  _opMatches = ops.filter(o => o.name.toLowerCase().includes(query)).slice(0, 10);
  _opFocusIdx = -1;
  if (!_opMatches.length) { dropdown.style.display = 'none'; return; }

  dropdown.innerHTML = _opMatches.map((o, idx) => {
    const meta = [
      o.start ? o.start + (o.end && o.end !== o.start ? ' – ' + o.end : '') : null,
      o.region || null
    ].filter(Boolean).join('  ·  ');
    return `<div class="op-item" data-idx="${idx}">
      <div class="op-item-name">${escHtml(o.name)}</div>
      ${meta ? `<div class="op-item-meta">${escHtml(meta)}</div>` : ''}
    </div>`;
  }).join('');
  dropdown.style.display = '';

  dropdown.querySelectorAll('.op-item').forEach(el => {
    el.addEventListener('mousedown', ev => {
      ev.preventDefault();
      input.value = _opMatches[+el.dataset.idx].name;
      dropdown.style.display = 'none';
    });
  });
});

document.getElementById('edit-operation').addEventListener('keydown', e => {
  const dropdown = document.getElementById('op-dropdown');
  if (dropdown.style.display === 'none') return;
  const items = dropdown.querySelectorAll('.op-item');
  if (!items.length) return;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    _opFocusIdx = Math.min(_opFocusIdx + 1, items.length - 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    _opFocusIdx = Math.max(_opFocusIdx - 1, 0);
  } else if (e.key === 'Enter' && _opFocusIdx >= 0) {
    e.preventDefault();
    document.getElementById('edit-operation').value = _opMatches[_opFocusIdx].name;
    dropdown.style.display = 'none';
    return;
  } else if (e.key === 'Escape') {
    dropdown.style.display = 'none'; _opFocusIdx = -1; return;
  }
  items.forEach((el, i) => el.classList.toggle('focused', i === _opFocusIdx));
  if (_opFocusIdx >= 0) items[_opFocusIdx].scrollIntoView({ block: 'nearest' });
});

document.getElementById('edit-operation').addEventListener('blur', () => {
  setTimeout(() => { document.getElementById('op-dropdown').style.display = 'none'; }, 150);
});
