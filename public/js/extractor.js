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
    if (!item?.coordinates || !isFinite(item.coordinates.lat) || !isFinite(item.coordinates.lng)) return;
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
    .filter(m => m?.coordinates && isFinite(m.coordinates.lat) && isFinite(m.coordinates.lng))
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
    .filter(m => m?.coordinates && isFinite(m.coordinates.lat) && isFinite(m.coordinates.lng))
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
    const hasCoords = item?.coordinates && isFinite(item.coordinates.lat);
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
      `<td class="${hasCoords ? 'placed' : 'unplaced'}">${hasCoords ? '✓' : '✗'}</td>`;
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
  document.getElementById('stat-file').textContent        = '';
  document.getElementById('wiki-check-btn').disabled      = true;
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
      m => m?.coordinates && isFinite(m.coordinates.lat) && isFinite(m.coordinates.lng)
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
