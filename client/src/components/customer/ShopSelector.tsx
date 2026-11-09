import React, { useState, useEffect } from 'react';
import { Store, MapPin, Phone, Star, CheckCircle, Printer, Sparkles, QrCode, Map, LayoutGrid, Navigation, Compass, AlertCircle } from 'lucide-react';
import { Shop } from '../../types/index.js';
import { api } from '../../services/api.js';
import { SkeletonShimmer } from '../common/SkeletonShimmer.js';
import { EmptyState } from '../common/EmptyState.js';
import {
  Coordinates,
  CAMPUS_LANDMARKS,
  DEFAULT_USER_LOCATION,
  filterAndSortShopsByProximity,
  formatDistance,
  formatWalkTime,
  ShopWithDistance
} from '../../utils/geo.js';
import { ShopMapView } from './ShopMapView.js';

interface ShopSelectorProps {
  selectedShop: Shop | null;
  onSelectShop: (shop: Shop) => void;
}

export const ShopSelector: React.FC<ShopSelectorProps> = ({ selectedShop, onSelectShop }) => {
  const [shops, setShops] = useState<Shop[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Map & Discovery State
  const [viewMode, setViewMode] = useState<'MAP' | 'GRID'>('MAP');
  const [radiusKm, setRadiusKm] = useState<number | 'ALL'>(2); // Default 2 km
  const [userCoords, setUserCoords] = useState<Coordinates | null>(DEFAULT_USER_LOCATION);
  const [selectedLandmarkId, setSelectedLandmarkId] = useState<string>('mit-main');
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  useEffect(() => {
    fetchShops();
  }, []);

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

  // Real-time GPS Detection
  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setIsDetectingGps(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: Coordinates = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };
        setUserCoords(coords);
        setSelectedLandmarkId('custom-gps');
        setIsDetectingGps(false);
      },
      (err) => {
        console.warn('GPS location error:', err.message);
        setGpsError('Could not acquire GPS. Using campus center preset.');
        setIsDetectingGps(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleLandmarkChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const landmarkId = e.target.value;
    setSelectedLandmarkId(landmarkId);
    setGpsError(null);

    const match = CAMPUS_LANDMARKS.find((l) => l.id === landmarkId);
    if (match) {
      setUserCoords(match.coords);
    }
  };

  // Filter and sort shops by proximity
  const proximityShops: ShopWithDistance[] = filterAndSortShopsByProximity(
    shops,
    userCoords,
    radiusKm
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SkeletonShimmer variant="card" count={2} />
      </div>
    );
  }

  if (shops.length === 0) {
    return (
      <EmptyState
        icon={Store}
        title="No Print Shops Available"
        description="No verified print shops are currently registered in this region."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Header & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Store className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Find & Choose Nearby Print Shop
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Interactive map discovery with distance calculation and live pickup rates
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('MAP')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'MAP'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            <span>Map View</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('GRID')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'GRID'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Card List</span>
          </button>
        </div>
      </div>

      {/* Geolocation Controls & Radius Filters Bar */}
      <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-3xl border border-slate-200/80 dark:border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* User Location Picker */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-1">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 shrink-0">
              <Compass className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Location:</span>
            </span>

            <select
              value={selectedLandmarkId}
              onChange={handleLandmarkChange}
              className="text-xs font-semibold py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-600 truncate max-w-full sm:max-w-xs shadow-sm"
            >
              {selectedLandmarkId === 'custom-gps' && (
                <option value="custom-gps">📍 Live Device GPS Location</option>
              )}
              {CAMPUS_LANDMARKS.map((landmark) => (
                <option key={landmark.id} value={landmark.id}>
                  {landmark.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleDetectGps}
              disabled={isDetectingGps}
              className="px-2.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
              title="Detect your live GPS coordinates"
            >
              <Navigation className={`w-3.5 h-3.5 ${isDetectingGps ? 'animate-spin' : ''}`} />
              <span>{isDetectingGps ? 'Locating...' : 'Use GPS'}</span>
            </button>
          </div>

          {/* Radius Filter Pills */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1">
              Radius:
            </span>
            {([1, 2, 5, 'ALL'] as const).map((r) => {
              const isActive = radiusKm === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRadiusKm(r)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/25'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                  }`}
                >
                  {r === 'ALL' ? 'All' : `${r} km`}
                </button>
              );
            })}
          </div>
        </div>

        {gpsError && (
          <div className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-medium">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{gpsError}</span>
          </div>
        )}
      </div>

      {/* Map View Rendering */}
      {viewMode === 'MAP' && (
        <div className="space-y-4">
          <ShopMapView
            shops={proximityShops}
            selectedShop={selectedShop as ShopWithDistance}
            onSelectShop={onSelectShop}
            userCoords={userCoords}
            radiusKm={radiusKm}
            onRecenterUser={() => {
              if (userCoords) {
                // Handled in ShopMapView
              }
            }}
          />

          {/* Proximity Quick-Select Carousel / Chips below the map */}
          {proximityShops.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] uppercase tracking-wider font-extrabold text-slate-400 block px-1">
                Nearby Shops in {radiusKm === 'ALL' ? 'All Areas' : `${radiusKm} km`} ({proximityShops.length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {proximityShops.map((shop, idx) => {
                  const isSelected = selectedShop?.id === shop.id;
                  return (
                    <div
                      key={shop.id}
                      onClick={() => onSelectShop(shop)}
                      className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/50 shadow-md shadow-indigo-500/10'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          {idx === 0 && userCoords && (
                            <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                              Closest
                            </span>
                          )}
                          <h4 className="font-bold text-slate-900 dark:text-white text-xs truncate">
                            {shop.name}
                          </h4>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                          {shop.distanceKm !== undefined && (
                            <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                              📍 {formatDistance(shop.distanceKm)}
                            </span>
                          )}
                          <span>•</span>
                          <span>B&W ₹{shop.rates?.bwSingleRate ?? shop.bwSingleRate ?? 2}</span>
                        </div>
                      </div>

                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                          <CheckCircle className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 hover:text-indigo-600 font-semibold shrink-0">
                          Select
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grid View Rendering */}
      {viewMode === 'GRID' && (
        <>
          {proximityShops.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
              <Store className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <div className="font-bold text-slate-900 dark:text-white text-sm">
                No Print Shops Within {radiusKm} km
              </div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No shops were detected in your immediate {radiusKm} km radius. Tap <strong>5 km</strong> or <strong>All</strong> above to expand your search area.
              </p>
              <button
                type="button"
                onClick={() => setRadiusKm(5)}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md shadow-indigo-500/20"
              >
                Expand to 5 km Radius
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {proximityShops.map((shop, idx) => {
                const isSelected = selectedShop?.id === shop.id;
                const bwSingle = shop.rates?.bwSingleRate ?? shop.bwSingleRate ?? 2.0;
                const bwDuplex = shop.rates?.bwDuplexRate ?? shop.bwDuplexRate ?? 3.0;
                const colorSingle = shop.rates?.colorSingleRate ?? shop.colorSingleRate ?? 10.0;
                const colorDuplex = shop.rates?.colorDuplexRate ?? shop.colorDuplexRate ?? 18.0;

                return (
                  <div
                    key={shop.id}
                    onClick={() => onSelectShop(shop)}
                    className={`p-5 rounded-3xl border-2 cursor-pointer transition-all duration-200 relative flex flex-col justify-between ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/40 shadow-lg shadow-indigo-500/10'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div>
                      {/* Header with Name, Proximity Badge and Rating */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 dark:text-white text-base">
                              {shop.name}
                            </h4>
                            {isSelected && (
                              <span className="p-0.5 rounded-full bg-indigo-600 text-white">
                                <CheckCircle className="w-4 h-4" />
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                            <span className="truncate">{shop.address}</span>
                          </p>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs font-bold">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <span>{shop.stats?.rating || 4.9}</span>
                          </div>
                          {idx === 0 && userCoords && (
                            <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold uppercase tracking-wider">
                              #1 Nearest
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Distance Pill */}
                      {shop.distanceKm !== undefined && (
                        <div className="mb-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-900/60 text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                          <Navigation className="w-3 h-3 text-indigo-600" />
                          <span>{formatDistance(shop.distanceKm)}</span>
                          <span className="text-slate-300 dark:text-slate-600">•</span>
                          <span className="font-semibold text-slate-600 dark:text-slate-400">{formatWalkTime(shop.distanceKm)}</span>
                        </div>
                      )}

                      {/* Capabilities Badges */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 font-semibold text-[10px] flex items-center gap-1">
                          <QrCode className="w-3 h-3" />
                          <span>PhonePe QR</span>
                        </span>
                        {shop.capabilities?.supportsBw && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[10px]">
                            B&W Laser
                          </span>
                        )}
                        {shop.capabilities?.supportsColor && (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold text-[10px]">
                            Color Jet
                          </span>
                        )}
                        {shop.capabilities?.supportsDuplex && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold text-[10px]">
                            2-Sided Duplex
                          </span>
                        )}
                      </div>

                      {/* Live Rates Matrix Table */}
                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-100/80 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-700/80">
                        <div className="space-y-0.5">
                          <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">
                            B&W Single / Duplex
                          </span>
                          <span className="font-extrabold text-slate-900 dark:text-white font-mono text-sm">
                            ₹{bwSingle.toFixed(2)} <span className="text-slate-400 dark:text-slate-500 font-normal">/</span> ₹{bwDuplex.toFixed(2)}
                          </span>
                        </div>

                        <div className="space-y-0.5">
                          <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">
                            Color Single / Duplex
                          </span>
                          <span className="font-extrabold text-slate-900 dark:text-white font-mono text-sm">
                            ₹{colorSingle.toFixed(2)} <span className="text-slate-400 dark:text-slate-500 font-normal">/</span> ₹{colorDuplex.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Selection Trigger */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" />
                        {shop.phone}
                      </span>

                      <span
                        className={`font-semibold ${
                          isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {isSelected ? '✓ Selected for Pickup' : 'Select Shop'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};
