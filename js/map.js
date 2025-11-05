let map = null;
let markers = [];

export function initializeMap(dotNetHelper) {
    console.log("initializeMap function called");

    try {
        const mapElement = document.getElementById('map');
        if (!mapElement) {
            console.error('Map element not found!');
            return false;
        }

        console.log("Creating Leaflet map...");
        map = L.map('map').setView([53.9, 27.5], 10);

        console.log("Adding tile layer...");
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        console.log("Leaflet map initialized successfully");
        return true;
    } catch (error) {
        console.error('Error initializing map:', error);
        return false;
    }
}

export function updateMarkers(markerData) {
    console.log("updateMarkers called, map state:", map);

    if (!map) {
        console.error('Map is not initialized!');
        return;
    }

    // Очищаем старые маркеры
    clearMarkers();

    // Проверяем данные
    if (!markerData) {
        console.warn('Marker data is null or undefined');
        return;
    }

    let markersArray = markerData;
    if (!Array.isArray(markerData)) {
        console.warn('Marker data is not an array, attempting to convert');
        markersArray = [markerData];
    }

    console.log(`Processing ${markersArray.length} markers`);

    // Добавляем новые маркеры
    markersArray.forEach((data, index) => {
        try {
            if (typeof data.latitude === 'undefined' || typeof data.longitude === 'undefined') {
                console.warn(`Marker ${index} missing coordinates:`, data);
                return;
            }

            const marker = L.circleMarker([data.latitude, data.longitude], {
                color: data.color || '#6c757d',
                fillColor: data.color || '#6c757d',
                fillOpacity: 0.7,
                radius: 8,
                weight: 2
            });

            if (data.popupContent) {
                marker.bindPopup(data.popupContent);
            }

            // Проверяем что карта существует перед добавлением
            if (map) {
                marker.addTo(map);
                markers.push(marker);
            } else {
                console.error('Cannot add marker - map is null');
            }
        } catch (error) {
            console.error(`Error creating marker ${index}:`, error, data);
        }
    });

    // Автоматически подгоняем карту под маркеры
    if (markers.length > 0 && map) {
        try {
            const group = L.featureGroup(markers);
            map.fitBounds(group.getBounds().pad(0.1));
            console.log("Map fitted to markers bounds");
        } catch (error) {
            console.error("Error fitting map to bounds:", error);
        }
    } else {
        console.log("No markers were created or map is not available");
    }
}

export function clearMarkers() {
    console.log("Clearing markers, current count:", markers.length);

    markers.forEach(marker => {
        try {
            if (map && marker) {
                map.removeLayer(marker);
            }
        } catch (error) {
            console.error("Error removing marker:", error);
        }
    });
    markers = [];
}

export function disposeMap() {
    if (map) {
        map.remove();
        map = null;
    }
    markers = [];
    console.log("Map disposed");
}