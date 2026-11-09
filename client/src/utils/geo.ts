import { Shop } from '../types/index.js';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface LandmarkPreset {
  id: string;
  name: string;
  category: 'CAMPUS' | 'HOSTEL' | 'CITY';
  coords: Coordinates;
}

export interface ShopWithDistance extends Shop {
  distanceKm?: number;
  walkTimeMinutes?: number;
}

// Campus & City Landmark Presets for instant proximity testing
export const CAMPUS_LANDMARKS: LandmarkPreset[] = [
  {
    id: 'mit-main',
    name: '🏫 MIT Main Campus Center',
    category: 'CAMPUS',
    coords: { lat: 19.8762, lng: 75.3433 }
  },
  {
    id: 'mit-library',
    name: '📚 Central Library & Reading Hall',
    category: 'CAMPUS',
    coords: { lat: 19.8788, lng: 75.3455 }
  },
  {
    id: 'mit-hostel',
    name: '🏠 Student Hostels & South Gate',
    category: 'HOSTEL',
    coords: { lat: 19.8735, lng: 75.3410 }
  },
  {
    id: 'north-gate',
    name: '🚪 North Campus Gate (Arcade)',
    category: 'CAMPUS',
    coords: { lat: 19.8820, lng: 75.3480 }
  },
  {
    id: 'station-rd',
    name: '🚆 Railway Station Junction',
    category: 'CITY',
    coords: { lat: 19.8940, lng: 75.3580 }
  }
];

export const DEFAULT_USER_LOCATION: Coordinates = CAMPUS_LANDMARKS[0].coords;

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
 * Estimated walking time at average ~4.8 km/h walking pace
 */
export function formatWalkTime(distanceKm?: number): string {
  if (distanceKm === undefined || isNaN(distanceKm)) return '';
  const mins = Math.max(1, Math.round(distanceKm * 12.5));
  return `${mins} min walk`;
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

    return {
      ...shop,
      latitude: sLat,
      longitude: sLng,
      distanceKm: dist,
      walkTimeMinutes: walkMins
    };
  });

  // Filter by radius if a specific radius is chosen
  let filtered = shopsWithDist;
  if (radiusKm !== 'ALL' && userCoords) {
    filtered = shopsWithDist.filter((s) => (s.distanceKm ?? 0) <= radiusKm);
  }

  // If user location is active, sort nearest shops first
  if (userCoords) {
    filtered.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
  }

  return filtered;
}
