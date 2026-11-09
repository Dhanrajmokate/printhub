import React, { useState, useEffect } from 'react';
import { Store, MapPin, Compass, Navigation, AlertCircle, ArrowRight, CheckCircle2, Star } from 'lucide-react';
import { Shop } from '../../types/index.js';
import { api } from '../../services/api.js';
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
import { SkeletonShimmer } from '../common/SkeletonShimmer.js';

interface CampusMapDiscoveryProps {
  selectedShop: Shop | null;
  onSelectShop: (shop: Shop) => void;
  onProceedToOrder?: () => void;
}

export const CampusMapDiscovery: React.FC<CampusMapDiscoveryProps> = ({
  selectedShop,
  onSelectShop,
  onProceedToOrder
}) => {
  const [shops, setShops] = useState<Shop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
        setGpsError('Could not acquire GPS fix. Showing campus center.');
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

  const proximityShops: ShopWithDistance[] = filterAndSortShopsByProximity(
    shops,
    userCoords,
    radiusKm
  );

  const selectedShopWithDistance = proximityShops.find((s) => s.id === selectedShop?.id) || (selectedShop as ShopWithDistance);

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
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-sm">
              🗺️
            </span>
            <span>Campus Print Shops Map</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Discover nearby verified print shops around campus and check walking distances
          </p>
        </div>

        {/* Toolbar: Landmark Picker, GPS & Radius */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Landmark Selector */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 text-xs font-bold text-indigo-900 dark:text-indigo-200">
            <Compass className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <select
              value={selectedLandmarkId}
              onChange={handleLandmarkChange}
              className="bg-transparent font-bold focus:outline-none cursor-pointer max-w-[150px] sm:max-w-xs truncate"
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

          {/* GPS Button */}
          <button
            type="button"
            onClick={handleDetectGps}
            disabled={isDetectingGps}
            className="px-3 py-1.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1 transition-colors"
          >
            <Navigation className={`w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 ${isDetectingGps ? 'animate-spin' : ''}`} />
            <span>{isDetectingGps ? 'Locating...' : 'My GPS'}</span>
          </button>

          {/* Radius Pills */}
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
        </div>
      </div>

      {gpsError && (
        <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-medium px-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{gpsError}</span>
        </div>
      )}

      {/* The Leaflet Map Component */}
      <ShopMapView
        shops={proximityShops}
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
                  📍 {formatDistance(selectedShopWithDistance.distanceKm)} ({formatWalkTime(selectedShopWithDistance.distanceKm)})
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
              <span>Selected</span>
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
