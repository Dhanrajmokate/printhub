import { Shop } from '../types/index.js';
import { api } from '../services/api.js';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface RegionPreset {
  id: string;
  name: string;
  category: 'METRO' | 'CITY' | 'CAMPUS' | 'HOSTEL';
  state?: string;
  coords: Coordinates;
  defaultZoom: number;
}

// Backwards-compatibility alias
export type LandmarkPreset = RegionPreset;

export interface ShopWithDistance extends Shop {
  distanceKm?: number;
  walkTimeMinutes?: number;
  travelTimeText?: string;
}

export interface GeocodeResult {
  placeId: string | number;
  displayName: string;
  name: string;
  coords: Coordinates;
  type?: string;
}

// Commercial Metro, City & Educational Hub Presets across India & Worldwide
export const COMMERCIAL_REGIONS: RegionPreset[] = [
  {
    id: 'all-india',
    name: '🇮🇳 Pan-India (All Registered Shops)',
    category: 'METRO',
    state: 'India',
    coords: { lat: 20.5937, lng: 78.9629 },
    defaultZoom: 5
  },
  {
    id: 'mumbai',
    name: '🏙️ Mumbai MMR & Suburbs',
    category: 'METRO',
    state: 'Maharashtra',
    coords: { lat: 19.0760, lng: 72.8777 },
    defaultZoom: 12
  },
  {
    id: 'pune',
    name: '🎓 Pune & Pimpri-Chinchwad',
    category: 'METRO',
    state: 'Maharashtra',
    coords: { lat: 18.5204, lng: 73.8567 },
    defaultZoom: 12
  },
  {
    id: 'delhi-ncr',
    name: '🏛️ Delhi NCR & Gurgaon/Noida',
    category: 'METRO',
    state: 'Delhi',
    coords: { lat: 28.6139, lng: 77.2090 },
    defaultZoom: 11
  },
  {
    id: 'bengaluru',
    name: '💻 Bengaluru (Bangalore Tech Corridor)',
    category: 'METRO',
    state: 'Karnataka',
    coords: { lat: 12.9716, lng: 77.5946 },
    defaultZoom: 12
  },
  {
    id: 'hyderabad',
    name: '💎 Hyderabad (HITEC City & Secunderabad)',
    category: 'METRO',
    state: 'Telangana',
    coords: { lat: 17.3850, lng: 78.4867 },
    defaultZoom: 12
  },
  {
    id: 'chh-sambhajinagar',
    name: '🏰 Chh. Sambhajinagar (Aurangabad Central)',
    category: 'CITY',
    state: 'Maharashtra',
    coords: { lat: 19.8762, lng: 75.3433 },
    defaultZoom: 13
  },
  {
    id: 'washim',
    name: '📍 Washim / Vidarbha Region',
    category: 'CITY',
    state: 'Maharashtra',
    coords: { lat: 20.1112, lng: 77.1352 },
    defaultZoom: 13
  },
  {
    id: 'chennai',
    name: '🌊 Chennai & OMR Tech Corridor',
    category: 'METRO',
    state: 'Tamil Nadu',
    coords: { lat: 13.0827, lng: 80.2707 },
    defaultZoom: 12
  },
  {
    id: 'kolkata',
    name: '🌉 Kolkata & Salt Lake',
    category: 'METRO',
    state: 'West Bengal',
    coords: { lat: 22.5726, lng: 88.3639 },
    defaultZoom: 12
  },
  {
    id: 'ahmedabad',
    name: '🏢 Ahmedabad & Gandhinagar',
    category: 'METRO',
    state: 'Gujarat',
    coords: { lat: 23.0225, lng: 72.5714 },
    defaultZoom: 12
  }
];

// Preserved for backwards compatibility with any remaining legacy imports
export const CAMPUS_LANDMARKS: LandmarkPreset[] = COMMERCIAL_REGIONS;

export const DEFAULT_USER_LOCATION: Coordinates = { lat: 19.8762, lng: 75.3433 };

/**
 * Calculates straight-line distance in kilometers using the Haversine formula.
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100; // rounded to 2 decimals
}

/**
 * Human-readable distance formatting
 */
export function formatDistance(distanceKm?: number): string {
  if (distanceKm === undefined || isNaN(distanceKm)) return 'Distance unavailable';
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters} m away`;
  }
  return `${distanceKm.toFixed(1)} km away`;
}

/**
 * Estimated travel time (walking if <= 2.5 km, driving/transit if > 2.5 km)
 */
export function formatTravelTime(distanceKm?: number): string {
  if (distanceKm === undefined || isNaN(distanceKm)) return '';
  if (distanceKm <= 2.5) {
    const mins = Math.max(1, Math.round(distanceKm * 12.5)); // ~4.8 km/h walking
    return `${mins} min walk`;
  }
  const driveMins = Math.max(3, Math.round(distanceKm * 2.2)); // ~27 km/h city driving
  if (driveMins >= 60) {
    const hrs = (driveMins / 60).toFixed(1);
    return `~${hrs} hr drive`;
  }
  return `${driveMins} min drive`;
}

// Backwards compatibility alias
export const formatWalkTime = formatTravelTime;

/**
 * Worldwide & Pan-India location search using OpenStreetMap Nominatim with backend proxy and instant local preset matching.
 */
export async function searchLocationsWorldwide(query: string): Promise<GeocodeResult[]> {
  const cleanQ = (query || '').trim().toLowerCase();
  if (cleanQ.length < 2) return [];

  const matchedPresets: GeocodeResult[] = [];

  // 1. Instant local matching against our curated Indian hubs
  for (const reg of COMMERCIAL_REGIONS) {
    if (
      reg.id !== 'all-india' &&
      (reg.name.toLowerCase().includes(cleanQ) || (reg.state && reg.state.toLowerCase().includes(cleanQ)))
    ) {
      matchedPresets.push({
        placeId: `preset-${reg.id}`,
        displayName: `${reg.name}, ${reg.state || 'India'}`,
        name: reg.name,
        coords: reg.coords,
        type: 'region_preset'
      });
    }
  }

  // 2. Query backend geocoding proxy
  try {
    const res = await api.get('/shops/geocode', { params: { q: query.trim() } });
    if (res.data?.success && Array.isArray(res.data?.results)) {
      const serverResults: GeocodeResult[] = res.data.results;
      // Merge unique results
      const combined = [...matchedPresets];
      for (const item of serverResults) {
        if (!combined.some((c) => Math.abs(c.coords.lat - item.coords.lat) < 0.01 && Math.abs(c.coords.lng - item.coords.lng) < 0.01)) {
          combined.push(item);
        }
      }
      return combined.slice(0, 6);
    }
  } catch (err) {
    // If backend proxy is unreachable, fallback to direct browser fetch
    try {
      const directRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query.trim())}&addressdetails=1&limit=6`
      );
      if (directRes.ok) {
        const directData = await directRes.json();
        if (Array.isArray(directData)) {
          const directResults: GeocodeResult[] = directData.map((d: any) => ({
            placeId: d.place_id,
            displayName: d.display_name,
            name: d.name || d.display_name.split(',')[0],
            coords: { lat: parseFloat(d.lat), lng: parseFloat(d.lon) },
            type: d.type
          }));
          return [...matchedPresets, ...directResults].slice(0, 6);
        }
      }
    } catch {
      // Ignored fallback
    }
  }

  return matchedPresets;
}

/**
 * Reverse geocodes coordinates to a human-readable city/locality name
 */
export async function reverseGeocodeCoordinates(coords: Coordinates): Promise<string> {
  // Check if near one of our known presets (< 15 km)
  for (const reg of COMMERCIAL_REGIONS) {
    if (reg.id !== 'all-india') {
      const dist = calculateDistanceKm(coords.lat, coords.lng, reg.coords.lat, reg.coords.lng);
      if (dist < 15) {
        return reg.name.replace(/^[^\w\s]+\s*/, ''); // strip leading emoji
      }
    }
  }

  try {
    const res = await api.get('/shops/reverse-geocode', {
      params: { lat: coords.lat, lng: coords.lng }
    });
    if (res.data?.success && res.data?.address) {
      return res.data.address;
    }
  } catch (err) {
    // Fallback direct
    try {
      const direct = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}&zoom=14`
      );
      if (direct.ok) {
        const d = await direct.json();
        if (d?.display_name) return d.display_name.split(',').slice(0, 3).join(',');
      }
    } catch {
      // fallback
    }
  }

  return `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
}

/**
 * Filters and sorts shops by proximity to the user's coordinates.
 */
export function filterAndSortShopsByProximity(
  shops: Shop[],
  userCoords: Coordinates | null,
  radiusKm: number | 'ALL'
): ShopWithDistance[] {
  const shopsWithDist: ShopWithDistance[] = shops.map((shop) => {
    const sLat = shop.latitude ?? 19.8762;
    const sLng = shop.longitude ?? 75.3433;

    if (!userCoords) {
      return { ...shop, latitude: sLat, longitude: sLng };
    }

    const dist = calculateDistanceKm(userCoords.lat, userCoords.lng, sLat, sLng);
    const walkMins = Math.max(1, Math.round(dist * 12.5));
    const travelText = formatTravelTime(dist);

    return {
      ...shop,
      latitude: sLat,
      longitude: sLng,
      distanceKm: dist,
      walkTimeMinutes: walkMins,
      travelTimeText: travelText
    };
  });

  // If user location is active, sort nearest shops first
  if (userCoords) {
    shopsWithDist.sort((a, b) => (a.distanceKm ?? 999999) - (b.distanceKm ?? 999999));
  }

  // Filter by radius if a specific radius is chosen
  if (radiusKm !== 'ALL' && userCoords) {
    return shopsWithDist.filter((s) => (s.distanceKm ?? 0) <= radiusKm);
  }

  return shopsWithDist;
}

/**
 * Returns the single nearest shop from user coordinates
 */
export function getNearestShop(shops: Shop[], userCoords: Coordinates | null): ShopWithDistance | null {
  if (!shops.length || !userCoords) return null;
  const sorted = filterAndSortShopsByProximity(shops, userCoords, 'ALL');
  return sorted[0] || null;
}
