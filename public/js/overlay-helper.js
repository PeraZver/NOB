import { MAP_CONFIG, OCCUPIED_TERRITORY_CONFIG } from './config.js';

const STORAGE_KEY = 'nob.overlay.presets.v1';
const EPS = 0.000001;

const map = L.map('map', {
    minZoom: MAP_CONFIG.minZoom,
    maxBounds: MAP_CONFIG.maxBounds,
    maxBoundsViscosity: MAP_CONFIG.maxBoundsViscosity
}).setView(MAP_CONFIG.defaultCenter, MAP_CONFIG.defaultZoom);

L.tileLayer(MAP_CONFIG.tileLayerUrl, {
    attribution: MAP_CONFIG.tileLayerAttribution
}).addTo(map);

const els = {
    imageFile: document.getElementById('imageFile'),
    imageUrl: document.getElementById('imageUrl'),
    loadImageBtn: document.getElementById('loadImageBtn'),
    opacityRange: document.getElementById('opacityRange'),
    opacityValue: document.getElementById('opacityValue'),
    contrastRange: document.getElementById('contrastRange'),
    contrastValue: document.getElementById('contrastValue'),
    zIndexInput: document.getElementById('zIndexInput'),
    fitMapBtn: document.getElementById('fitMapBtn'),
    resetBoundsBtn: document.getElementById('resetBoundsBtn'),
    clearOverlayBtn: document.getElementById('clearOverlayBtn'),
    presetName: document.getElementById('presetName'),
    savePresetBtn: document.getElementById('savePresetBtn'),
    deletePresetBtn: document.getElementById('deletePresetBtn'),
    presetSelect: document.getElementById('presetSelect'),
    loadPresetBtn: document.getElementById('loadPresetBtn'),
    boundSouth: document.getElementById('boundSouth'),
    boundWest: document.getElementById('boundWest'),
    boundNorth: document.getElementById('boundNorth'),
    boundEast: document.getElementById('boundEast'),
    configSnippet: document.getElementById('configSnippet'),
    copySnippetBtn: document.getElementById('copySnippetBtn'),
    downloadPresetsBtn: document.getElementById('downloadPresetsBtn'),
    statusText: document.getElementById('statusText')
};

const state = {
    overlay: null,
    handles: {},
    currentBounds: null,
    currentImageId: null,
    currentImageSource: null,
    currentImageUrlForConfig: OCCUPIED_TERRITORY_CONFIG.imageUrl,
    lastObjectUrl: null,
    centerDragAnchor: null,
    autoSaveTimer: null,
    overlayDragActive: false,
    overlayDragLastLatLng: null,
    overlayElement: null
};

const presets = readPresets();
refreshPresetSelect();
hydrateFromTerritoryConfig();

bindEvents();

function bindEvents() {
    els.loadImageBtn.addEventListener('click', onLoadImage);
    els.opacityRange.addEventListener('input', onOpacityChange);
    els.contrastRange.addEventListener('input', onContrastChange);
    els.zIndexInput.addEventListener('change', onZIndexChange);
    els.fitMapBtn.addEventListener('click', fitOverlayToMap);
    els.resetBoundsBtn.addEventListener('click', resetBounds);
    els.clearOverlayBtn.addEventListener('click', clearOverlay);
    els.savePresetBtn.addEventListener('click', saveCurrentPreset);
    els.deletePresetBtn.addEventListener('click', deleteCurrentPreset);
    els.loadPresetBtn.addEventListener('click', loadSelectedPreset);
    els.copySnippetBtn.addEventListener('click', copySnippet);
    els.downloadPresetsBtn.addEventListener('click', downloadPresetsJson);
}

function hydrateFromTerritoryConfig() {
    const territoryPresetId = `url:${OCCUPIED_TERRITORY_CONFIG.imageUrl}`;

    if (!presets[territoryPresetId]) {
        presets[territoryPresetId] = {
            id: territoryPresetId,
            name: 'Occupied Territory (from config)',
            imageId: territoryPresetId,
            imageUrlForConfig: OCCUPIED_TERRITORY_CONFIG.imageUrl,
            imageSource: OCCUPIED_TERRITORY_CONFIG.imageUrl,
            imageBounds: OCCUPIED_TERRITORY_CONFIG.imageBounds,
            opacity: OCCUPIED_TERRITORY_CONFIG.opacity,
            contrast: 1,
            zIndex: OCCUPIED_TERRITORY_CONFIG.zIndex,
            updatedAt: new Date().toISOString()
        };
        persistPresets();
        refreshPresetSelect();
    }

    renderSnippet(
        OCCUPIED_TERRITORY_CONFIG.imageUrl,
        OCCUPIED_TERRITORY_CONFIG.imageBounds,
        OCCUPIED_TERRITORY_CONFIG.opacity,
        OCCUPIED_TERRITORY_CONFIG.zIndex
    );
}

function onLoadImage() {
    const file = els.imageFile.files && els.imageFile.files[0];
    const urlValue = (els.imageUrl.value || '').trim();

    if (!file && !urlValue) {
        setStatus('Pick a file or enter an image URL.', true);
        return;
    }

    if (file && state.lastObjectUrl) {
        URL.revokeObjectURL(state.lastObjectUrl);
        state.lastObjectUrl = null;
    }

    let sourceUrl = '';
    let imageId = '';
    let configImageUrl = '';

    if (file) {
        state.lastObjectUrl = URL.createObjectURL(file);
        sourceUrl = state.lastObjectUrl;
        imageId = `file:${file.name}`;
        configImageUrl = `../img/${file.name}`;
    } else {
        sourceUrl = urlValue;
        imageId = `url:${urlValue}`;
        configImageUrl = urlValue;
    }

    state.currentImageId = imageId;
    state.currentImageSource = sourceUrl;
    state.currentImageUrlForConfig = configImageUrl;

    const preset = presets[imageId];
    const bounds = preset?.imageBounds || getDefaultOverlayBounds();
    const opacity = preset?.opacity ?? Number(els.opacityRange.value);
    const contrast = preset?.contrast ?? Number(els.contrastRange.value);
    const zIndex = preset?.zIndex ?? Number(els.zIndexInput.value);

    els.opacityRange.value = String(opacity);
    els.opacityValue.textContent = Number(opacity).toFixed(2);
    els.contrastRange.value = String(contrast);
    els.contrastValue.textContent = `${Number(contrast).toFixed(2)}x`;
    els.zIndexInput.value = String(zIndex);

    drawOverlay(sourceUrl, bounds, opacity, contrast, zIndex);
    applyCurrentBounds(bounds);
    map.fitBounds(bounds, { padding: [30, 30] });

    const presetMsg = preset ? `Loaded saved bounds for ${imageId}.` : `No saved bounds found for ${imageId}.`;
    setStatus(`${presetMsg} Drag corners to align the image.`);
}

function drawOverlay(url, bounds, opacity, contrast, zIndex) {
    clearOverlay(false);

    els.contrastRange.value = String(contrast);
    els.contrastValue.textContent = `${Number(contrast).toFixed(2)}x`;

    state.overlay = L.imageOverlay(url, bounds, {
        opacity,
        interactive: true,
        zIndex
    }).addTo(map);

    bindOverlayDragHandlers();
    applyOverlayVisuals();

    state.overlay.on('load', () => {
        bindOverlayDragHandlers();
        applyOverlayVisuals();
    });

    state.currentBounds = normalizeBounds(bounds);
    buildHandles(state.currentBounds);
    updateAllOutputs();
}

function buildHandles(bounds) {
    removeHandles();

    const corners = getCorners(bounds);
    const cornerIcon = L.divIcon({ className: 'handle-icon' });
    const sideIcon = L.divIcon({ className: 'handle-icon side' });
    const centerIcon = L.divIcon({ className: 'handle-icon center' });
    const sides = getSideMidpoints(bounds);

    state.handles.nw = L.marker(corners.nw, { draggable: true, icon: cornerIcon }).addTo(map);
    state.handles.ne = L.marker(corners.ne, { draggable: true, icon: cornerIcon }).addTo(map);
    state.handles.se = L.marker(corners.se, { draggable: true, icon: cornerIcon }).addTo(map);
    state.handles.sw = L.marker(corners.sw, { draggable: true, icon: cornerIcon }).addTo(map);
    state.handles.n = L.marker(sides.n, { draggable: true, icon: sideIcon }).addTo(map);
    state.handles.e = L.marker(sides.e, { draggable: true, icon: sideIcon }).addTo(map);
    state.handles.s = L.marker(sides.s, { draggable: true, icon: sideIcon }).addTo(map);
    state.handles.w = L.marker(sides.w, { draggable: true, icon: sideIcon }).addTo(map);
    state.handles.center = L.marker(getCenter(bounds), { draggable: true, icon: centerIcon }).addTo(map);

    state.handles.nw.on('drag', (e) => scaleFromCorner('nw', e.latlng));
    state.handles.ne.on('drag', (e) => scaleFromCorner('ne', e.latlng));
    state.handles.se.on('drag', (e) => scaleFromCorner('se', e.latlng));
    state.handles.sw.on('drag', (e) => scaleFromCorner('sw', e.latlng));
    state.handles.n.on('drag', (e) => stretchFromSide('n', e.latlng));
    state.handles.e.on('drag', (e) => stretchFromSide('e', e.latlng));
    state.handles.s.on('drag', (e) => stretchFromSide('s', e.latlng));
    state.handles.w.on('drag', (e) => stretchFromSide('w', e.latlng));

    state.handles.center.on('dragstart', () => {
        state.centerDragAnchor = state.handles.center.getLatLng();
    });

    state.handles.center.on('drag', (e) => {
        const nextCenter = e.latlng;
        if (!state.centerDragAnchor || !state.currentBounds) {
            state.centerDragAnchor = nextCenter;
            return;
        }

        const dLat = nextCenter.lat - state.centerDragAnchor.lat;
        const dLng = nextCenter.lng - state.centerDragAnchor.lng;

        const shifted = [
            [state.currentBounds[0][0] + dLat, state.currentBounds[0][1] + dLng],
            [state.currentBounds[1][0] + dLat, state.currentBounds[1][1] + dLng]
        ];

        state.centerDragAnchor = nextCenter;
        applyCurrentBounds(shifted);
    });

    state.handles.center.on('dragend', () => {
        state.centerDragAnchor = null;
        scheduleAutoSave();
    });

    ['nw', 'ne', 'se', 'sw', 'n', 'e', 's', 'w'].forEach((k) => {
        state.handles[k].on('dragend', scheduleAutoSave);
    });
}

function scaleFromCorner(corner, latlng) {
    if (!state.currentBounds) {
        return;
    }

    const center = getCenter(state.currentBounds);
    const corners = getCorners(state.currentBounds);
    const originalCorner = corners[corner];

    const baseDx = originalCorner.lng - center.lng;
    const baseDy = originalCorner.lat - center.lat;
    const dragDx = latlng.lng - center.lng;
    const dragDy = latlng.lat - center.lat;

    const baseDist = Math.hypot(baseDx, baseDy);
    const dragDist = Math.hypot(dragDx, dragDy);

    if (baseDist < EPS) {
        return;
    }

    const scale = Math.max(dragDist / baseDist, 0.05);
    const halfHeight = Math.max(((state.currentBounds[1][0] - state.currentBounds[0][0]) / 2) * scale, EPS);
    const halfWidth = Math.max(((state.currentBounds[1][1] - state.currentBounds[0][1]) / 2) * scale, EPS);

    applyCurrentBounds([
        [center.lat - halfHeight, center.lng - halfWidth],
        [center.lat + halfHeight, center.lng + halfWidth]
    ]);
}

function stretchFromSide(side, latlng) {
    if (!state.currentBounds) {
        return;
    }

    const south = state.currentBounds[0][0];
    const west = state.currentBounds[0][1];
    const north = state.currentBounds[1][0];
    const east = state.currentBounds[1][1];

    let nextSouth = south;
    let nextWest = west;
    let nextNorth = north;
    let nextEast = east;

    if (side === 'n') {
        nextNorth = latlng.lat;
    } else if (side === 'e') {
        nextEast = latlng.lng;
    } else if (side === 's') {
        nextSouth = latlng.lat;
    } else if (side === 'w') {
        nextWest = latlng.lng;
    }

    if (Math.abs(nextNorth - nextSouth) < EPS) {
        nextNorth += EPS;
    }
    if (Math.abs(nextEast - nextWest) < EPS) {
        nextEast += EPS;
    }

    applyCurrentBounds([
        [Math.min(nextSouth, nextNorth), Math.min(nextWest, nextEast)],
        [Math.max(nextSouth, nextNorth), Math.max(nextWest, nextEast)]
    ]);
}

function applyCurrentBounds(bounds) {
    const normalized = normalizeBounds(bounds);
    state.currentBounds = normalized;

    if (state.overlay) {
        state.overlay.setBounds(normalized);
    }

    syncHandles(normalized);
    updateAllOutputs();
}

function syncHandles(bounds) {
    if (!state.handles.nw) {
        return;
    }

    const corners = getCorners(bounds);
    const sides = getSideMidpoints(bounds);
    state.handles.nw.setLatLng(corners.nw);
    state.handles.ne.setLatLng(corners.ne);
    state.handles.se.setLatLng(corners.se);
    state.handles.sw.setLatLng(corners.sw);
    state.handles.n.setLatLng(sides.n);
    state.handles.e.setLatLng(sides.e);
    state.handles.s.setLatLng(sides.s);
    state.handles.w.setLatLng(sides.w);
    state.handles.center.setLatLng(getCenter(bounds));
}

function onOpacityChange() {
    const opacity = Number(els.opacityRange.value);
    els.opacityValue.textContent = opacity.toFixed(2);

    if (state.overlay) {
        applyOverlayVisuals();
        updateAllOutputs();
        scheduleAutoSave();
    }
}

function onContrastChange() {
    const contrast = Number(els.contrastRange.value);
    els.contrastValue.textContent = `${contrast.toFixed(2)}x`;

    if (state.overlay) {
        applyOverlayVisuals();
        scheduleAutoSave();
    }
}

function onZIndexChange() {
    if (state.overlay) {
        applyOverlayVisuals();
        updateAllOutputs();
        scheduleAutoSave();
    }
}

function fitOverlayToMap() {
    if (!state.currentBounds) {
        setStatus('Load an image first.', true);
        return;
    }

    map.fitBounds(state.currentBounds, { padding: [30, 30] });
}

function resetBounds() {
    if (!state.overlay) {
        setStatus('Load an image first.', true);
        return;
    }

    const bounds = getDefaultOverlayBounds();
    applyCurrentBounds(bounds);
    map.fitBounds(bounds, { padding: [30, 30] });
    scheduleAutoSave();
    setStatus('Overlay bounds reset to map-centered defaults.');
}

function clearOverlay(showMessage = true) {
    if (state.overlayDragActive) {
        endOverlayDrag();
    }
    unbindOverlayDragHandlers();

    if (state.overlay) {
        map.removeLayer(state.overlay);
        state.overlay = null;
    }

    removeHandles();

    state.currentBounds = null;
    updateBoundsDisplay(null);
    els.configSnippet.value = '';

    if (showMessage) {
        setStatus('Overlay cleared.');
    }
}

function removeHandles() {
    Object.values(state.handles).forEach((marker) => {
        if (marker) {
            map.removeLayer(marker);
        }
    });
    state.handles = {};
}

function saveCurrentPreset() {
    if (!state.overlay || !state.currentBounds || !state.currentImageId) {
        setStatus('Load an image before saving a preset.', true);
        return;
    }

    const name = (els.presetName.value || '').trim();
    presets[state.currentImageId] = {
        id: state.currentImageId,
        imageId: state.currentImageId,
        imageSource: state.currentImageSource,
        imageUrlForConfig: state.currentImageUrlForConfig,
        imageBounds: state.currentBounds,
        opacity: Number(els.opacityRange.value),
        contrast: Number(els.contrastRange.value),
        zIndex: Number(els.zIndexInput.value),
        name: name || state.currentImageId,
        updatedAt: new Date().toISOString()
    };

    persistPresets();
    refreshPresetSelect(state.currentImageId);
    setStatus(`Preset saved for ${state.currentImageId}.`);
}

function deleteCurrentPreset() {
    const selectedId = els.presetSelect.value || state.currentImageId;
    if (!selectedId || !presets[selectedId]) {
        setStatus('Select a preset to delete.', true);
        return;
    }

    delete presets[selectedId];
    persistPresets();
    refreshPresetSelect();

    if (selectedId === state.currentImageId) {
        setStatus(`Preset deleted for ${selectedId}. Current overlay remains visible.`);
    } else {
        setStatus(`Preset deleted for ${selectedId}.`);
    }
}

function loadSelectedPreset() {
    const selectedId = els.presetSelect.value;
    if (!selectedId) {
        setStatus('Choose a preset first.', true);
        return;
    }

    const preset = presets[selectedId];
    if (!preset) {
        setStatus('Preset not found.', true);
        return;
    }

    state.currentImageId = preset.imageId;
    state.currentImageSource = preset.imageSource;
    state.currentImageUrlForConfig = preset.imageUrlForConfig || preset.imageSource;

    els.presetName.value = preset.name || '';
    els.opacityRange.value = String(preset.opacity ?? 0.7);
    els.opacityValue.textContent = Number(els.opacityRange.value).toFixed(2);
    els.contrastRange.value = String(preset.contrast ?? 1);
    els.contrastValue.textContent = `${Number(els.contrastRange.value).toFixed(2)}x`;
    els.zIndexInput.value = String(preset.zIndex ?? 10);

    // Browser security does not allow restoring local file blobs after refresh.
    // In that case, we still load bounds/snippet but user must reselect the file.
    if (preset.imageSource && !String(preset.imageSource).startsWith('file:') && !String(preset.imageSource).startsWith('blob:')) {
        drawOverlay(
            preset.imageSource,
            preset.imageBounds,
            Number(els.opacityRange.value),
            Number(els.contrastRange.value),
            Number(els.zIndexInput.value)
        );
        map.fitBounds(preset.imageBounds, { padding: [30, 30] });
        setStatus(`Preset ${selectedId} loaded.`);
        return;
    }

    if (state.overlay) {
        applyCurrentBounds(preset.imageBounds);
    } else {
        state.currentBounds = normalizeBounds(preset.imageBounds);
        updateAllOutputs();
    }

    setStatus('Bounds loaded. Re-select the local image file to render the overlay again.');
}

function updateAllOutputs() {
    if (!state.currentBounds) {
        updateBoundsDisplay(null);
        els.configSnippet.value = '';
        return;
    }

    updateBoundsDisplay(state.currentBounds);

    const imageUrl = state.currentImageUrlForConfig || OCCUPIED_TERRITORY_CONFIG.imageUrl;
    const opacity = Number(els.opacityRange.value);
    const zIndex = Number(els.zIndexInput.value);

    renderSnippet(imageUrl, state.currentBounds, opacity, zIndex);
}

function updateBoundsDisplay(bounds) {
    if (!bounds) {
        els.boundSouth.textContent = '-';
        els.boundWest.textContent = '-';
        els.boundNorth.textContent = '-';
        els.boundEast.textContent = '-';
        return;
    }

    const south = bounds[0][0];
    const west = bounds[0][1];
    const north = bounds[1][0];
    const east = bounds[1][1];

    els.boundSouth.textContent = south.toFixed(6);
    els.boundWest.textContent = west.toFixed(6);
    els.boundNorth.textContent = north.toFixed(6);
    els.boundEast.textContent = east.toFixed(6);
}

function renderSnippet(imageUrl, bounds, opacity, zIndex) {
    const south = Number(bounds[0][0].toFixed(6));
    const west = Number(bounds[0][1].toFixed(6));
    const north = Number(bounds[1][0].toFixed(6));
    const east = Number(bounds[1][1].toFixed(6));

    const safeImageUrl = String(imageUrl).replace(/'/g, "\\'");

    els.configSnippet.value = [
        'export const OCCUPIED_TERRITORY_CONFIG = {',
        `    imageUrl: '${safeImageUrl}',`,
        `    imageBounds: [[${south}, ${west}], [${north}, ${east}]],`,
        `    opacity: ${Number(opacity).toFixed(2)},`,
        `    zIndex: ${Number(zIndex)}`,
        '};'
    ].join('\n');
}

function copySnippet() {
    if (!els.configSnippet.value) {
        setStatus('No snippet to copy yet.', true);
        return;
    }

    navigator.clipboard.writeText(els.configSnippet.value)
        .then(() => setStatus('Snippet copied to clipboard.'))
        .catch(() => setStatus('Copy failed. You can still copy from the text box.', true));
}

function downloadPresetsJson() {
    const payload = JSON.stringify(presets, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'overlay-presets.json';
    a.click();

    URL.revokeObjectURL(url);
    setStatus('Presets JSON downloaded.');
}

function readPresets() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return {};
        }

        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') {
            return {};
        }

        return parsed;
    } catch (error) {
        console.warn('Failed to read overlay presets:', error);
        return {};
    }
}

function persistPresets() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

function refreshPresetSelect(selectedId = '') {
    const ids = Object.keys(presets).sort((a, b) => {
        const aTs = presets[a]?.updatedAt || '';
        const bTs = presets[b]?.updatedAt || '';
        return bTs.localeCompare(aTs);
    });

    els.presetSelect.innerHTML = '';

    if (ids.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No presets yet';
        els.presetSelect.append(option);
        return;
    }

    ids.forEach((id) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = presets[id].name || id;
        els.presetSelect.append(option);
    });

    if (selectedId && presets[selectedId]) {
        els.presetSelect.value = selectedId;
    }
}

function scheduleAutoSave() {
    if (!state.currentImageId || !state.currentBounds) {
        return;
    }

    window.clearTimeout(state.autoSaveTimer);
    state.autoSaveTimer = window.setTimeout(() => {
        const existingName = presets[state.currentImageId]?.name || state.currentImageId;
        presets[state.currentImageId] = {
            id: state.currentImageId,
            imageId: state.currentImageId,
            imageSource: state.currentImageSource,
            imageUrlForConfig: state.currentImageUrlForConfig,
            imageBounds: state.currentBounds,
            opacity: Number(els.opacityRange.value),
            contrast: Number(els.contrastRange.value),
            zIndex: Number(els.zIndexInput.value),
            name: existingName,
            updatedAt: new Date().toISOString()
        };

        persistPresets();
        refreshPresetSelect(state.currentImageId);
    }, 300);
}

function getDefaultOverlayBounds() {
    const viewport = map.getBounds();
    const south = viewport.getSouth();
    const west = viewport.getWest();
    const north = viewport.getNorth();
    const east = viewport.getEast();

    const latPad = (north - south) * 0.2;
    const lngPad = (east - west) * 0.2;

    return [
        [south + latPad, west + lngPad],
        [north - latPad, east - lngPad]
    ];
}

function normalizeBounds(bounds) {
    const south = Math.min(bounds[0][0], bounds[1][0]);
    const north = Math.max(bounds[0][0], bounds[1][0]);
    const west = Math.min(bounds[0][1], bounds[1][1]);
    const east = Math.max(bounds[0][1], bounds[1][1]);

    return [
        [south, west],
        [north, east]
    ];
}

function getCorners(bounds) {
    const south = bounds[0][0];
    const west = bounds[0][1];
    const north = bounds[1][0];
    const east = bounds[1][1];

    return {
        nw: L.latLng(north, west),
        ne: L.latLng(north, east),
        se: L.latLng(south, east),
        sw: L.latLng(south, west)
    };
}

function getSideMidpoints(bounds) {
    const south = bounds[0][0];
    const west = bounds[0][1];
    const north = bounds[1][0];
    const east = bounds[1][1];
    const midLat = (north + south) / 2;
    const midLng = (east + west) / 2;

    return {
        n: L.latLng(north, midLng),
        e: L.latLng(midLat, east),
        s: L.latLng(south, midLng),
        w: L.latLng(midLat, west)
    };
}

function getCenter(bounds) {
    return L.latLng(
        (bounds[0][0] + bounds[1][0]) / 2,
        (bounds[0][1] + bounds[1][1]) / 2
    );
}

function setStatus(message, isError = false) {
    els.statusText.textContent = message;
    els.statusText.style.color = isError ? '#a22626' : '#9a3412';
}

function applyOverlayVisuals() {
    if (!state.overlay) {
        return;
    }

    const opacity = Number(els.opacityRange.value);
    const contrast = Number(els.contrastRange.value);
    const zIndex = Number(els.zIndexInput.value);

    state.overlay.setOpacity(opacity);
    state.overlay.setZIndex(zIndex);

    const imageEl = state.overlay.getElement();
    if (imageEl) {
        imageEl.style.filter = `contrast(${contrast.toFixed(2)})`;
    }
}

function bindOverlayDragHandlers() {
    if (!state.overlay) {
        return;
    }

    const imageEl = state.overlay.getElement();
    if (!imageEl) {
        return;
    }

    unbindOverlayDragHandlers();

    imageEl.classList.add('overlay-draggable');
    imageEl.addEventListener('mousedown', beginOverlayDrag);
    state.overlayElement = imageEl;
}

function unbindOverlayDragHandlers() {
    if (state.overlayElement) {
        state.overlayElement.classList.remove('overlay-draggable');
        state.overlayElement.classList.remove('dragging');
        state.overlayElement.removeEventListener('mousedown', beginOverlayDrag);
        state.overlayElement = null;
    }

    map.off('mousemove', onOverlayDragMove);
    document.removeEventListener('mouseup', endOverlayDrag);
}

function beginOverlayDrag(event) {
    if (!state.currentBounds || !state.overlay) {
        return;
    }

    if (event.button !== 0) {
        return;
    }

    event.preventDefault();
    event.stopPropagation();

    state.overlayDragActive = true;
    state.overlayDragLastLatLng = map.mouseEventToLatLng(event);

    if (state.overlayElement) {
        state.overlayElement.classList.add('dragging');
    }

    map.dragging.disable();
    map.on('mousemove', onOverlayDragMove);
    document.addEventListener('mouseup', endOverlayDrag);
}

function onOverlayDragMove(event) {
    if (!state.overlayDragActive || !state.currentBounds || !state.overlayDragLastLatLng) {
        return;
    }

    const next = event.latlng;
    const dLat = next.lat - state.overlayDragLastLatLng.lat;
    const dLng = next.lng - state.overlayDragLastLatLng.lng;
    state.overlayDragLastLatLng = next;

    const shifted = [
        [state.currentBounds[0][0] + dLat, state.currentBounds[0][1] + dLng],
        [state.currentBounds[1][0] + dLat, state.currentBounds[1][1] + dLng]
    ];

    applyCurrentBounds(shifted);
}

function endOverlayDrag() {
    if (!state.overlayDragActive) {
        return;
    }

    state.overlayDragActive = false;
    state.overlayDragLastLatLng = null;
    map.off('mousemove', onOverlayDragMove);
    document.removeEventListener('mouseup', endOverlayDrag);

    if (map.dragging) {
        map.dragging.enable();
    }

    if (state.overlayElement) {
        state.overlayElement.classList.remove('dragging');
    }

    scheduleAutoSave();
}
