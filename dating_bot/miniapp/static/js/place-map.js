/** Карта выбора места для создания события (Leaflet + OSM). */

export const TASHKENT = { lat: 41.311151, lng: 69.279737 };

export const PLACE_COORDS = {
  'Кофейня в центре': { lat: 41.3111, lng: 69.2797 },
  'Парк Ашхабад': { lat: 41.3378, lng: 69.3349 },
  Мирабад: { lat: 41.2976, lng: 69.2735 },
  Юнусабад: { lat: 41.3648, lng: 69.2865 },
  Чиланзар: { lat: 41.2855, lng: 69.2035 },
  Next: { lat: 41.3119, lng: 69.2795 },
  'Magic City': { lat: 41.3046, lng: 69.2468 },
  Бродвей: { lat: 41.3128, lng: 69.2782 },
  'Самарканд · Регистан': { lat: 39.6549, lng: 66.9756 }
};

let leafletPromise = null;

function loadStylesheet(href) {
  if ([...document.styleSheets].some(sheet => sheet.href?.includes('leaflet'))) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing && window.L) {
      resolve(window.L);
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error('Не удалось загрузить карту'));
    document.head.appendChild(script);
  });
}

export function ensureLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;
  loadStylesheet('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
  leafletPromise = loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js').then(L => {
    // Иначе иконки маркера ищут путь относительно страницы и ломаются.
    // eslint-disable-next-line no-underscore-dangle
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
    });
    return L;
  });
  return leafletPromise;
}

export function coordsForPlace(name) {
  return PLACE_COORDS[name] || null;
}

export function formatCoordLabel(lat, lng) {
  return `Точка на карте · ${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
}

export async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&accept-language=ru`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('geocode failed');
    const data = await response.json();
    const addr = data.address || {};
    const place =
      data.name
      || addr.amenity
      || addr.shop
      || addr.tourism
      || addr.building
      || addr.road
      || addr.suburb
      || addr.neighbourhood
      || addr.city_district
      || null;
    const line = [
      addr.road,
      addr.house_number,
      addr.suburb || addr.neighbourhood || addr.city_district,
      addr.city || addr.town || addr.village
    ].filter(Boolean).join(', ');
    return {
      place: place || formatCoordLabel(lat, lng),
      address: line || data.display_name || formatCoordLabel(lat, lng)
    };
  } catch {
    return {
      place: formatCoordLabel(lat, lng),
      address: formatCoordLabel(lat, lng)
    };
  }
}

/**
 * @returns {{ setView: Function, getCoords: Function, destroy: Function } | null}
 */
export async function mountPlaceMap(container, { lat, lng, onPick } = {}) {
  if (!container) return null;
  const L = await ensureLeaflet();
  const start = {
    lat: Number.isFinite(Number(lat)) ? Number(lat) : TASHKENT.lat,
    lng: Number.isFinite(Number(lng)) ? Number(lng) : TASHKENT.lng
  };

  const map = L.map(container, {
    zoomControl: false,
    attributionControl: false
  }).setView([start.lat, start.lng], 14);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OSM'
  }).addTo(map);

  L.control.zoom({ position: 'bottomright' }).addTo(map);
  L.control.attribution({ position: 'bottomleft', prefix: false })
    .addAttribution('© OpenStreetMap')
    .addTo(map);

  let marker = L.marker([start.lat, start.lng], { draggable: true }).addTo(map);
  let current = { ...start };

  const emit = async (next, source = 'map') => {
    current = { lat: next.lat, lng: next.lng };
    marker.setLatLng([current.lat, current.lng]);
    if (typeof onPick === 'function') await onPick(current, source);
  };

  marker.on('dragend', () => {
    const pos = marker.getLatLng();
    emit({ lat: pos.lat, lng: pos.lng }, 'drag');
  });

  map.on('click', event => {
    emit({ lat: event.latlng.lat, lng: event.latlng.lng }, 'click');
  });

  // Не даём жестам карты утянуть скролл sheet.
  L.DomEvent.disableScrollPropagation(container);
  L.DomEvent.disableClickPropagation(container);

  requestAnimationFrame(() => map.invalidateSize());
  setTimeout(() => map.invalidateSize(), 120);

  return {
    setView(next, zoom = 15) {
      if (!next) return;
      current = { lat: Number(next.lat), lng: Number(next.lng) };
      marker.setLatLng([current.lat, current.lng]);
      map.setView([current.lat, current.lng], zoom);
    },
    getCoords: () => ({ ...current }),
    destroy() {
      map.remove();
    }
  };
}
