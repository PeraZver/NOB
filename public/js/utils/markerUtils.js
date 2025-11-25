/**
 * Create a marker with label
 * @param {Object} item - Military unit data
 * @param {Object} icon - Leaflet icon object
 * @param {Function} onClickHandler - Click handler function
 * @returns {Object} Leaflet marker
 */
export function createMarker(item, icon, onClickHandler) {
    const [lng, lat] = item.location.replace('POINT(', '').replace(')', '').split(' ');
    const marker = L.marker([lat, lng], { icon: icon || L.Icon.Default });

    // Add label next to the marker
    marker.bindTooltip(item.name || 'Unknown', {
        permanent: true,
        direction: 'right',
        className: 'marker-label'
    });

    if (onClickHandler) {
        marker.on('click', () => onClickHandler(marker, item));
    }

    return marker;
}
