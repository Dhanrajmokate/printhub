import React, { useState, useEffect } from 'react';
import { Store, MapPin, Phone, Star, CheckCircle2, Map, LayoutGrid, Navigation, Compass, AlertCircle, ArrowRight } from 'lucide-react';
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
  onOpenMap?: () => void;
}

export const ShopSelector: React.FC<ShopSelectorProps> = ({ selectedShop, onSelectShop, onOpenMap }) => {
  const [shops, setShops] = useState<Shop[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Map & Discovery State (defaults to clean GRID list)
  const [viewMode, setViewMode] = useState<'MAP' | 'GRID'>('GRID');
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
        setGpsError('Could not acquire GPS. Using campus center.');
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

  const selectedShopWithDistance = proximityShops.find((s) => s.id === selectedShop?.id) || (selectedShop as ShopWithDistance);

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
      {/* Streamlined Unified Control Bar */}
      <div className="p-3.5 sm:p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Location Landmark & GPS */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 text-xs font-bold text-indigo-900 dark:text-indigo-200">
            <Compass className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <select
              value={selectedLandmarkId}
              onChange={handleLandmarkChange}
              className="bg-transparent font-bold focus:outline-none cursor-pointer max-w-[180px] sm:max-w-xs truncate"
            >
              {selectedLandmarkId === 'custom-gps' && (
                <option value="custom-gps">📍 Live Device GPS</option>
              )}
              {CAMPUS_LANDMARKS.map((landmark) => (
                <option key={landmark.id} value={landmark.id}>
                  {landmark.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleDetectGps}
            disabled={isDetectingGps}
            className="px-2.5 py-1.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1 transition-colors"
            title="Auto-detect current location"
          >
            <Navigation className={`w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 ${isDetectingGps ? 'animate-spin' : ''}`} />
            <span>{isDetectingGps ? 'Locating...' : 'GPS'}</span>
          </button>
        </div>

        {/* Right: Distance Radius & View Toggle */}
        <div className="flex items-center justify-between sm:justify-end gap-2">
          {/* Radius Filter Pills */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
            {([1, 2, 5, 'ALL'] as const).map((r) => {
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
                  {r === 'ALL' ? 'All' : `${r}km`}
                </button>
              );
            })}
          </div>

          {/* Map vs List Mode Switch */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                if (onOpenMap) {
                  onOpenMap();
                } else {
                  setViewMode('MAP');
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                viewMode === 'MAP'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              <span>Open Map</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('GRID')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                viewMode === 'GRID'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>List ({proximityShops.length})</span>
            </button>
          </div>
        </div>
      </div>

      {gpsError && (
        <div className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-medium px-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{gpsError}</span>
        </div>
      )}

      {/* MAP VIEW */}
      {viewMode === 'MAP' && (
        <div className="space-y-3">
          <ShopMapView
            shops={proximityShops}
            selectedShop={selectedShopWithDistance}
            onSelectShop={onSelectShop}
            userCoords={userCoords}
            radiusKm={radiusKm}
          />

          {/* Simple Selected Shop Banner */}
          {selectedShopWithDistance && (
            <div className="p-4 rounded-3xl bg-indigo-50/90 dark:bg-indigo-950/40 border-2 border-indigo-200 dark:border-indigo-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm animate-in fade-in">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                    {selectedShopWithDistance.name}
                  </h4>
                  {selectedShopWithDistance.distanceKm !== undefined && (
                    <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
                      📍 {formatDistance(selectedShopWithDistance.distanceKm)} ({formatWalkTime(selectedShopWithDistance.distanceKm)})
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <span>{selectedShopWithDistance.address}</span>
                  <span>•</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    B&W: ₹{selectedShopWithDistance.rates?.bwSingleRate ?? selectedShopWithDistance.bwSingleRate ?? 2}/page
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                <span className="px-3 py-1.5 rounded-2xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Selected for Pickup</span>
                </span>
                <button
                  type="button"
                  onClick={() => setViewMode('GRID')}
                  className="px-3 py-1.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-colors"
                >
                  View All
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode === 'GRID' && (
        <div className="space-y-3">
          {proximityShops.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
              <Store className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <div className="font-bold text-slate-900 dark:text-white text-sm">
                No Print Shops Found Within {radiusKm} km
              </div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No shops were detected in your immediate {radiusKm} km area. Tap <strong>5km</strong> or <strong>All</strong> above to view nearby shops.
              </p>
              <button
                type="button"
                onClick={() => setRadiusKm(5)}
                className="px-4 py-2 rounded-2xl bg-indigo-600 text-white font-bold text-xs shadow-md shadow-indigo-500/20"
              >
                Show Shops Within 5 km
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {proximityShops.map((shop, idx) => {
                const isSelected = selectedShop?.id === shop.id;
                const bwRate = shop.rates?.bwSingleRate ?? shop.bwSingleRate ?? 2.0;
                const colorRate = shop.rates?.colorSingleRate ?? shop.colorSingleRate ?? 10.0;

                return (
                  <div
                    key={shop.id}
                    onClick={() => onSelectShop(shop)}
                    className={`p-4 rounded-3xl border-2 cursor-pointer transition-all duration-200 flex flex-col justify-between gap-3 ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-md shadow-indigo-500/10'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div>
                      {/* Shop Name & Distance */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {idx === 0 && (
                              <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase">
                                Closest
                              </span>
                            )}
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base truncate">
                              {shop.name}
                            </h4>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{shop.address}</span>
                          </p>
                        </div>

                        {shop.distanceKm !== undefined && (
                          <div className="text-right shrink-0">
                            <span className="inline-block px-2.5 py-1 rounded-xl bg-indigo-100/80 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-black">
                              {formatDistance(shop.distanceKm)}
                            </span>
                            <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                              {formatWalkTime(shop.distanceKm)}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Simple Pricing & Rating Bar */}
                      <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            B&W: <strong className="text-slate-900 dark:text-white font-mono">₹{bwRate}</strong>
                          </span>
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            Color: <strong className="text-slate-900 dark:text-white font-mono">₹{colorRate}</strong>
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-amber-500 font-bold text-xs">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>{shop.stats?.rating || 4.9}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Pill */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectShop(shop);
                      }}
                      className={`w-full py-2 px-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                          : 'bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 text-slate-700 dark:text-slate-300 hover:text-indigo-600'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Selected for Pickup</span>
                        </>
                      ) : (
                        <span>Choose This Shop</span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
