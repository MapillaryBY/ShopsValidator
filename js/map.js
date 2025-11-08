let map = null;
let group = null;
let allmarkers = [];

export function initializeMap(dotNetHelper) {
    console.log("initializeMap function called");

    try {
        const mapElement = document.getElementById('map');
        if (!mapElement) {
            console.error('Map element not found!');
            return false;
        }

        console.log("Creating Leaflet map...");
        map = L.map('map').setView([53.9, 27.5], 7);

        console.log("Adding tile layer...");
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 30,
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
    clearMarkers(group);

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

    function getIcon(color) {
        return L.icon({
            iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34]
        });
    }
    // Создаем иконки разных цветов
    var blueIcon = getIcon('blue');

    var greenIcon = getIcon('green');
    var yellowIcon = getIcon('gold');
    var redIcon = getIcon('red');
    var greyIcon = getIcon('grey');

    group = L.markerClusterGroup({
        //  disableClusteringAtZoom: 12,
        spiderfyOnMaxZoom: true,
        spiderfyDistanceMultiplier: 2,
        zoomToBoundsOnClick: true,
        showCoverageOnHover: true,
        iconCreateFunction: cluster => {
            const markers = cluster.getAllChildMarkers();
            const counts = {};
            let hasZero = false;
            let hasOne = false;
            let hasTwo = false;
            let hasThree = false;
            for (let i = 0; i < markers.length; i++) {
                const kind = markers[i].options._diff_kind;
                counts[kind] ||= 0;
                ++counts[kind];
                if (kind === 0) hasZero += 1;
                if (kind === 1) hasOne += 1;
                if (kind === 2) hasTwo += 1;
                if (kind === 3) hasThree += 1;
            }
            let clusterColor;
            if (hasZero) {
                clusterColor = 'red';
            } else if (hasOne) {
                clusterColor = 'gold';
            } else if (hasTwo) {
                clusterColor = 'blue';
            }
            else {
                clusterColor = 'green';
            }
            return createClusterIcon(markers, hasZero, hasOne, hasTwo, hasThree);
        }
    });

    function createClusterIcon(markers, zeroCount, oneCount, twoCount, threeCount) {
        // Общее количество элементов
        const total = zeroCount + oneCount + twoCount + threeCount;

        // Если только один тип элементов - простой круг
        if (total === zeroCount || total === oneCount || total === twoCount || total === threeCount) {
            let color;
            if (total === zeroCount) color = 'red';
            else if (total === oneCount) color = 'gold';
            else if (total === twoCount) color = 'blue';
            else color = 'green';

            return L.divIcon({
                html: `<div class="diff-cluster" style="background-color: ${color}">${markers.length}</div>`,
                className: 'diff-cluster-wrapper',
                iconSize: [40, 40]
            });
        }

        // Рассчитываем пропорциональные углы
        let angles = {
            zero: (zeroCount / total) * 360,
            one: (oneCount / total) * 360,
            two: (twoCount / total) * 360,
            three: (threeCount / total) * 360,
        };

        // Проверяем минимальный угол и корректируем при необходимости
        const MIN_ANGLE = 15;
        let needsAdjustment = false;
        let adjustmentCount = 0;

        // Проверяем, какие углы меньше минимального
        const smallAngles = {
            zero: angles.zero < MIN_ANGLE && zeroCount > 0,
            one: angles.one < MIN_ANGLE && oneCount > 0,
            two: angles.two < MIN_ANGLE && twoCount > 0,
            three: angles.three < MIN_ANGLE && threeCount > 0,
        };

        // Считаем сколько углов нужно увеличить
        const smallAnglesCount = [smallAngles.zero, smallAngles.one, smallAngles.two, smallAngles.three].filter(Boolean).length;

        if (smallAnglesCount > 0) {
            // Вычисляем сколько градусов нужно взять у больших углов
            const totalNeeded = smallAnglesCount * MIN_ANGLE -
                (smallAngles.zero ? angles.zero : 0) -
                (smallAngles.one ? angles.one : 0) -
                (smallAngles.two ? angles.two : 0) -
                (smallAngles.three ? angles.three : 0);

            // Вычисляем сколько градусов можно взять у больших углов
            const largeAnglesTotal =
                (!smallAngles.zero && zeroCount > 0 ? angles.zero : 0) +
                (!smallAngles.one && oneCount > 0 ? angles.one : 0) +
                (!smallAngles.two && twoCount > 0 ? angles.two : 0) +
                (!smallAngles.three && threeCount > 0 ? angles.three : 0);

            // Коэффициент для уменьшения больших углов
            const ratio = (largeAnglesTotal - totalNeeded) / largeAnglesTotal;

            // Корректируем углы
            if (smallAngles.zero) angles.zero = MIN_ANGLE;
            if (smallAngles.one) angles.one = MIN_ANGLE;
            if (smallAngles.two) angles.two = MIN_ANGLE;
            if (smallAngles.three) angles.three = MIN_ANGLE;

            if (!smallAngles.zero && zeroCount > 0) angles.zero *= ratio;
            if (!smallAngles.one && oneCount > 0) angles.one *= ratio;
            if (!smallAngles.two && twoCount > 0) angles.two *= ratio;
            if (!smallAngles.three && threeCount > 0) angles.three *= ratio;
        }

        // Создаем сектора
        const parts = [];
        if (zeroCount > 0) parts.push({ color: 'red', angle: angles.zero });
        if (oneCount > 0) parts.push({ color: 'gold', angle: angles.one });
        if (twoCount > 0) parts.push({ color: 'blue', angle: angles.two });
        if (threeCount > 0) parts.push({ color: 'green', angle: angles.three });

        let rotation = -90; // Начинаем с верхней точки

        // Создаем SVG с секторами
        const svgParts = parts.map(part => {
            const startAngle = rotation;
            const endAngle = startAngle + part.angle;
            rotation = endAngle;

            // Создаем path для сектора
            const startRad = (startAngle * Math.PI) / 180;
            const endRad = (endAngle * Math.PI) / 180;

            const x1 = 20 + 18 * Math.cos(startRad);
            const y1 = 20 + 18 * Math.sin(startRad);
            const x2 = 20 + 18 * Math.cos(endRad);
            const y2 = 20 + 18 * Math.sin(endRad);

            const largeArcFlag = part.angle > 180 ? 1 : 0;

            return `<path d="M20,20 L${x1},${y1} A18,18 0 ${largeArcFlag},1 ${x2},${y2} Z" fill="${part.color}" />`;
        }).join('');

        const svgHtml = `
                        <svg width="40" height="40" viewBox="0 0 40 40">
                            ${svgParts}
                            <circle cx="20" cy="20" r="12" fill="white" />
                            <text x="20" y="20" font-size="14" font-weight="bold" fill="black" text-anchor="middle" dominant-baseline="middle">${markers.length}</text>
                        </svg>
                    `;

        return L.divIcon({
            html: svgHtml,
            className: 'diff-cluster-wrapper',
            iconSize: [40, 40]
        });
    }


    // Добавляем новые маркеры
    markersArray.forEach((data, index) => {
        try {
            const statusIcons = {
                3: greenIcon,
                2: blueIcon,
                1: yellowIcon
            };
            var markerIcon = data.osmId ? (statusIcons[data.detectStatus] || yellowIcon) : redIcon;

            var marker = L.marker([data.latitude, data.longitude],
                { icon: markerIcon, _diff_kind: data.detectStatus });

            if (data.popupContent) {
                marker.bindPopup(data.popupContent);
            }
            group.addLayer(marker);
            allmarkers.push(marker);
            //old
            /*  if (typeof data.latitude === 'undefined' || typeof data.longitude === 'undefined') {
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
              */
        } catch (error) {
            console.error(`Error creating marker ${index}:`, error, data);
        }
    });

    map.addLayer(group);
    var contextMenu = L.popup();

    map.on('contextmenu', function (e) {
        var lat = e.latlng.lat.toFixed(7);
        var lng = e.latlng.lng.toFixed(7);
        var zoom = map.getZoom();
        var osmUrl = `https://www.openstreetmap.org/#map=17/${lat}/${lng}`;
        var mapillaryUrl = `https://www.mapillary.com/app/?lat=${lat}&lng=${lng}&z=18`
        contextMenu
            .setLatLng(e.latlng)
            .setContent(`
                <div class="context-menu">
                            <a href="${osmUrl}" target="_blank">Открыть на OpenStreetMap</a><br/>
                            <a href="${mapillaryUrl}" target="_blank">Mapillary</a>
                        </div>
            `)
            .openOn(map);
    });

    // Функция для экранирования HTML
    function escapeHtml(text) {
        if (!text) return '';
        var map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.toString().replace(/[&<>"']/g, function (m) { return map[m]; });
    }

    if (group.length > 0) {
        // var group = new L.featureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.1));
    }
    map.on('zoomend', function () {
        if (map.getZoom() >= 12) {
            console.log('zoom ' + map.getZoom());
            group._disableClusteringAtZoom = 14;
            //group._updateClusters();
            group.refreshClusters();  // Перестраиваем кластеры
        }
    });


}

export function clearMarkers(group) {
    console.log("Clearing markers NEW, current count:", allmarkers.length);
    if (group) {
        group.clearLayers();
    }
    //allmarkers.forEach(marker => {
    //    try {
    //        if (map && marker) {
    //            group.clearLayers();
    //            //map.removeLayer(marker);
    //        }
    //    } catch (error) {
    //        console.error("Error removing marker:", error);
    //    }
    //});
    allmarkers = [];
}

export function disposeMap() {
    if (map) {
        map.remove();
        map = null;
    }
    markers = [];
    console.log("Map disposed");
}