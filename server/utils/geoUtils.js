export function getGridId(lat, lng) {
    const gridLat = lat.toFixed(3);
    const gridLng = lng.toFixed(3);
    return `grid_${gridLat}_${gridLng}`;
}
