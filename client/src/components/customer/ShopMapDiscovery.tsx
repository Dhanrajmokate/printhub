import React, { useState, useEffect, useRef } from 'react';
import {
  Store,
  MapPin,
  Compass,
  Navigation,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Star,
  Search,
  X,
  Loader2,
  Globe,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { Shop } from '../../types/index.js';
import { api } from '../../services/api.js';
import {
  Coordinates,
  COMMERCIAL_REGIONS,
  DEFAULT_USER_LOCATION,
  filterAndSortShopsByProximity,
  formatDistance,
  formatTravelTime,
  ShopWithDistance,
  searchLocationsWorldwide,
  reverseGeocodeCoordinates,
  GeocodeResult,
  getNearestShop
} from '../../utils/geo.js';
import { ShopMapView } from './ShopMapView.js';
import { SkeletonShimmer } from '../common/SkeletonShimmer.js';

interface ShopMapDiscoveryProps {
  selectedShop: Shop | null;
  onSelectShop: (shop: Shop) => void;
  onProceedToOrder?: () => void;
}

export const ShopMapDiscovery: React.FC<ShopMapDiscoveryProps> = ({
  selectedShop,
  onSelectShop,
  onProceedToOrder
}) => {
  const [shops, setShops] = useState<Shop[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Default to 50 km or 'ALL' so shops are never accidentally hidden on initial load
  const [radiusKm, setRadiusKm] = useState<number | 'ALL'>('ALL');
  const [userCoords, setUserCoords] = useState<Coordinates | null>(DEFAULT_USER_LOCATION);
  const [locationLabel, setLocationLabel] = useState<string>('Pan-India (All Shops)');
  const [selectedRegionId, setSelectedRegionId] = useState<string>('all-india');

  // Location Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // GPS State
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  useEffect(() => {
    fetchShops();
  }, []);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced Location Search
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearchingLocation(false);
      return;
    }

    setIsSearchingLocation(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchLocationsWorldwide(searchQuery);
        setSearchResults(results);
        setIsSearchOpen(true);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsSearchingLocation(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchShops = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/shops');
      if (res.data?.success && Array.isArray(res.data?.shops)) {
        setShops(res.data.shops);
        if (!selectedShop && res.data.shops.length > 0) {
          onSelectShop(res.data.shops[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch shops:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // High-accuracy live GPS detection
  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser or device.');
      return;
    }

    setIsDetectingGps(true);
    setGpsError(null);

    const onPosSuccess = async (pos: GeolocationPosition) => {
      const coords: Coordinates = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      };
      setUserCoords(coords);
      setSelectedRegionId('custom-gps');
      setIsDetectingGps(false);

      // Reverse geocode to get city/locality name
      try {
        const rev = await reverseGeocodeCoordinates(coords);
        setLocationLabel(`📍 ${rev}`);
      } catch {
        setLocationLabel(`📍 GPS (${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)})`);
      }

      // If shops are close (< 15km), set 15km; otherwise default to 'ALL'
      const nearest = getNearestShop(shops, coords);
      if (nearest?.distanceKm !== undefined && nearest.distanceKm <= 15) {
        setRadiusKm(15);
      } else {
        setRadiusKm('ALL');
      }
    };

    const onPosError = (err: GeolocationPositionError) => {
      // Fallback to low-accuracy / network if high-accuracy times out
      if (err.code === 3) {
        navigator.geolocation.getCurrentPosition(
          onPosSuccess,
          (err2) => {
            setGpsError('Could not acquire GPS fix. You can search your city above.');
            setIsDetectingGps(false);
          },
          { timeout: 8000, enableHighAccuracy: false }
        );
        return;
      }
      setGpsError(err.message || 'Location permission denied. Please search your city.');
      setIsDetectingGps(false);
    };

    navigator.geolocation.getCurrentPosition(onPosSuccess, onPosError, {
      timeout: 10000,
      enableHighAccuracy: true
    });
  };

  // Region Preset Jump
  const handleSelectRegionPreset = (regionId: string) => {
    setSelectedRegionId(regionId);
    setGpsError(null);
    setIsSearchOpen(false);
    setSearchQuery('');

    if (regionId === 'all-india') {
      setUserCoords({ lat: 20.5937, lng: 78.9629 });
      setLocationLabel('Pan-India (All Shops)');
      setRadiusKm('ALL');
      return;
    }

    const match = COMMERCIAL_REGIONS.find((r) => r.id === regionId);
    if (match) {
      setUserCoords(match.coords);
      setLocationLabel(match.name.replace(/^[^\w\s]+\s*/, ''));
      // Check if any shop is within 50km
      const nearest = getNearestShop(shops, match.coords);
      if (nearest?.distanceKm !== undefined && nearest.distanceKm <= 25) {
        setRadiusKm(25);
      } else {
        setRadiusKm('ALL');
      }
    }
  };

  // Select Geocoded Search Result
  const handleSelectSearchResult = (result: GeocodeResult) => {
    setUserCoords(result.coords);
    setLocationLabel(result.name);
    setSelectedRegionId('searched-location');
    setSearchQuery('');
    setIsSearchOpen(false);
    setGpsError(null);

    // If nearest shop is within 25km, narrow down; else show All with nearest highlighted
    const nearest = getNearestShop(shops, result.coords);
    if (nearest?.distanceKm !== undefined && nearest.distanceKm <= 25) {
      setRadiusKm(25);
    } else {
      setRadiusKm('ALL');
    }
  };

  // Proximity sorting and filtering
  const proximityShops: ShopWithDistance[] = filterAndSortShopsByProximity(
    shops,
    userCoords,
    radiusKm
  );

  const nearestShop = getNearestShop(shops, userCoords);
  const selectedShopWithDistance =
    proximityShops.find((s) => s.id === selectedShop?.id) ||
    (selectedShop ? (filterAndSortShopsByProximity([selectedShop], userCoords, 'ALL')[0] as ShopWithDistance) : null);

  if (isLoading) {
    return (
      <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
        <SkeletonShimmer variant="card" count={2} />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in">
      {/* Map Section Header & Controls */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        {/* Header Title & Current Region */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-sm shadow-sm">
                🗺️
              </span>
              <span>Find Print Shops (Pan-India & Worldwide Locator)</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Locate verified digital print hubs across India & worldwide with live distance and rates
            </p>
          </div>

          {/* Active Location Indicator */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 text-xs font-bold text-indigo-900 dark:text-indigo-200 self-start md:self-auto max-w-full truncate">
            <MapPin className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="truncate">{locationLabel}</span>
          </div>
        </div>

        {/* Universal Search Bar & GPS Button */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          {/* Live Search Input */}
          <div ref={searchContainerRef} className="relative flex-1 w-full">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (searchResults.length > 0) setIsSearchOpen(true);
                }}
                placeholder="Search any city, locality, postal pin code, or area worldwide..."
                className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs sm:text-sm focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setIsSearchOpen(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Live Search Autocomplete Dropdown */}
            {isSearchOpen && (searchResults.length > 0 || isSearchingLocation) && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl z-50 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in slide-in-from-top-1">
                {isSearchingLocation && (
                  <div className="p-3 text-xs text-slate-500 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    <span>Searching locations worldwide...</span>
                  </div>
                )}
                {searchResults.map((item, idx) => (
                  <div
                    key={`${item.placeId}-${idx}`}
                    onClick={() => handleSelectSearchResult(item)}
                    className="p-3 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/40 cursor-pointer transition-colors flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 dark:text-white truncate">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {item.displayName}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* GPS 1-Click Button */}
          <button
            type="button"
            onClick={handleDetectGps}
            disabled={isDetectingGps}
            className={`w-full sm:w-auto px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 shrink-0 ${
              isDetectingGps
                ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 cursor-wait'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 active:scale-95'
            }`}
            title="Auto-detect GPS location"
          >
            <Navigation className={`w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 ${isDetectingGps ? 'animate-spin' : ''}`} />
            <span>{isDetectingGps ? 'Locking GPS Fix...' : 'My Device GPS'}</span>
          </button>
        </div>

        {/* Quick Regional Presets & Radius Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
          {/* Quick Indian Metro / Regional Presets */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            <span className="text-[11px] font-bold text-slate-400 shrink-0 mr-1 flex items-center gap-1">
              <Globe className="w-3 h-3" /> Quick Hubs:
            </span>
            {COMMERCIAL_REGIONS.slice(0, 7).map((region) => {
              const isActive = selectedRegionId === region.id;
              return (
                <button
                  key={region.id}
                  type="button"
                  onClick={() => handleSelectRegionPreset(region.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap text-xs ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {region.name.split(' ')[0]} {region.name.split(' ')[1]}
                </button>
              );
            })}
          </div>

          {/* Radius Filter Pills */}
          <div className="flex items-center gap-1 self-start lg:self-auto shrink-0 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] font-extrabold text-slate-400 px-2 uppercase">Radius:</span>
            {([2, 5, 15, 50, 'ALL'] as const).map((r) => {
              const isActive = radiusKm === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRadiusKm(r)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {r === 'ALL' ? 'Pan-India / All' : `${r}km`}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {gpsError && (
        <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-medium px-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{gpsError}</span>
        </div>
      )}

      {/* Proximity Warning / 1-Click Expand Banner if 0 shops in tight radius */}
      {proximityShops.length === 0 && radiusKm !== 'ALL' && (
        <div className="p-4 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <div className="font-bold">No print shops within {radiusKm} km of {locationLabel}</div>
              {nearestShop && nearestShop.distanceKm !== undefined && (
                <div className="text-amber-700 dark:text-amber-300 text-[11px] mt-0.5">
                  Nearest verified shop is <strong>{nearestShop.name}</strong> ({formatDistance(nearestShop.distanceKm)} away)
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setRadiusKm(50)}
              className="px-3 py-1.5 rounded-xl bg-amber-200 hover:bg-amber-300 dark:bg-amber-900 dark:hover:bg-amber-800 text-amber-950 dark:text-amber-100 font-bold transition-colors"
            >
              Expand to 50 km
            </button>
            <button
              type="button"
              onClick={() => setRadiusKm('ALL')}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors shadow-sm"
            >
              Show All India Shops
            </button>
          </div>
        </div>
      )}

      {/* The Leaflet Map Component */}
      <ShopMapView
        shops={proximityShops.length > 0 ? proximityShops : shops}
        selectedShop={selectedShopWithDistance}
        onSelectShop={onSelectShop}
        userCoords={userCoords}
        radiusKm={radiusKm}
      />

      {/* Selected Shop Action Card */}
      {selectedShopWithDistance && (
        <div className="p-5 rounded-3xl bg-indigo-50/90 dark:bg-indigo-950/40 border-2 border-indigo-200 dark:border-indigo-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                {selectedShopWithDistance.name}
              </h3>
              {selectedShopWithDistance.distanceKm !== undefined && (
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
                  📍 {formatDistance(selectedShopWithDistance.distanceKm)} ({formatTravelTime(selectedShopWithDistance.distanceKm)})
                </span>
              )}
              <span className="flex items-center gap-1 text-amber-500 font-bold text-xs">
                <Star className="w-3 h-3 fill-amber-400" />
                <span>4.9</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{selectedShopWithDistance.address}</span>
              <span>•</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                B&W: ₹{selectedShopWithDistance.rates?.bwSingleRate ?? selectedShopWithDistance.bwSingleRate ?? 2}/page
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-3.5 py-2 rounded-2xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>Selected for Print</span>
            </span>

            {onProceedToOrder && (
              <button
                type="button"
                onClick={onProceedToOrder}
                className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all flex items-center gap-1.5"
              >
                <span>Print with this Shop</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Aliases for backwards compatibility
export const CampusMapDiscovery = ShopMapDiscovery;
