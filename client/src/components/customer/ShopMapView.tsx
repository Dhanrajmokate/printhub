import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { ShopWithDistance, Coordinates, formatDistance, formatTravelTime } from '../../utils/geo.js';
import { Store, Check, Crosshair, Globe, ZoomIn, ZoomOut } from 'lucide-react';

interface ShopMapViewProps {
  shops: ShopWithDistance[];
  selectedShop: ShopWithDistance | null;
  onSelectShop: (shop: ShopWithDistance) => void;
  userCoords: Coordinates | null;
  radiusKm: number | 'ALL';
  onRecenterUser?: () => void;
}

export const ShopMapView: React.FC<ShopMapViewProps> = ({
  shops,
  selectedShop,
  onSelectShop,
  userCoords,
  radiusKm
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const radiusCircleRef = useRef<L.Circle | null>(null);
  const prevUserCoordsRef = useRef<string | null>(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initialCenter = userCoords
      ? [userCoords.lat, userCoords.lng]
      : selectedShop?.latitude && selectedShop?.longitude
      ? [selectedShop.latitude, selectedShop.longitude]
      : [20.5937, 78.9629]; // Default Central India

    const initialZoom = userCoords ? 13 : 5;

    const map = L.map(mapContainerRef.current, {
      center: initialCenter as L.LatLngExpression,
      zoom: initialZoom,
      zoomControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Pan / Fly when user coordinates change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !userCoords) return;

    const key = `${userCoords.lat.toFixed(4)},${userCoords.lng.toFixed(4)}`;
    if (prevUserCoordsRef.current !== key) {
      prevUserCoordsRef.current = key;
      if (radiusKm === 'ALL' && shops.length > 0) {
        // Fit bounds around user and shops
        const bounds = L.latLngBounds([[userCoords.lat, userCoords.lng]]);
        shops.forEach((s) => {
          if (s.latitude && s.longitude) bounds.extend([s.latitude, s.longitude]);
        });
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      } else {
        const targetZoom = radiusKm === 2 ? 14 : radiusKm === 5 ? 13 : radiusKm === 15 ? 12 : 11;
        map.flyTo([userCoords.lat, userCoords.lng], targetZoom, { duration: 0.8 });
      }
    }
  }, [userCoords, radiusKm, shops]);

  // Update Markers, Radius Circle, and User Location Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    // 1. Render User Location & Proximity Circle
    if (userCoords) {
      const userIcon = L.divIcon({
        className: 'user-location-pin',
        html: `
          <div style="position: relative; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 26px; height: 26px; border-radius: 9999px; background: rgba(59, 130, 246, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: relative; width: 14px; height: 14px; border-radius: 9999px; background: #2563eb; border: 2.5px solid #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.4);"></div>
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });

      L.marker([userCoords.lat, userCoords.lng], { icon: userIcon, zIndexOffset: 1000 })
        .bindTooltip('📍 Your Searched / GPS Location', { permanent: false, direction: 'top', offset: [0, -10] })
        .addTo(markersLayer);

      // Proximity search circle
      if (radiusCircleRef.current) {
        radiusCircleRef.current.remove();
        radiusCircleRef.current = null;
      }

      if (radiusKm !== 'ALL') {
        const circle = L.circle([userCoords.lat, userCoords.lng], {
          radius: radiusKm * 1000,
          color: '#6366f1',
          fillColor: '#818cf8',
          fillOpacity: 0.12,
          weight: 2,
          dashArray: '6, 8'
        }).addTo(map);
        radiusCircleRef.current = circle;
      }
    }

    // 2. Render Shop Pins
    shops.forEach((shop) => {
      const sLat = shop.latitude ?? 19.8762;
      const sLng = shop.longitude ?? 75.3433;
      const isSelected = selectedShop?.id === shop.id;

      const shopIcon = L.divIcon({
        className: `shop-pin-${shop.id}`,
        html: `
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            width: ${isSelected ? '40px' : '34px'};
            height: ${isSelected ? '40px' : '34px'};
            background: ${isSelected ? '#4f46e5' : '#10b981'};
            color: #ffffff;
            border-radius: 9999px;
            border: 2.5px solid #ffffff;
            box-shadow: ${isSelected ? '0 0 0 4px rgba(99, 102, 241, 0.45), 0 8px 20px rgba(0,0,0,0.35)' : '0 4px 12px rgba(0,0,0,0.25)'};
            transition: all 0.2s ease;
            cursor: pointer;
          ">
            <svg style="width: ${isSelected ? '20px' : '16px'}; height: ${isSelected ? '20px' : '16px'};" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2m-8 0v4h8v-4M8 14h.01" />
            </svg>
          </div>
        `,
        iconSize: [isSelected ? 40 : 34, isSelected ? 40 : 34],
        iconAnchor: [isSelected ? 20 : 17, isSelected ? 20 : 17]
      });

      const distText = shop.distanceKm !== undefined ? formatDistance(shop.distanceKm) : null;
      const travelText = shop.distanceKm !== undefined ? formatTravelTime(shop.distanceKm) : null;

      const marker = L.marker([sLat, sLng], { icon: shopIcon });

      const popupContent = document.createElement('div');
      popupContent.style.minWidth = '220px';
      popupContent.style.padding = '4px';
      popupContent.innerHTML = `
        <div style="font-family: inherit;">
          <div style="font-weight: 800; font-size: 14px; color: #0f172a; margin-bottom: 2px;">
            ${shop.name}
          </div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 6px; line-height: 1.3;">
            ${shop.address}
          </div>
          ${
            distText
              ? `<div style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 9999px; background: #e0e7ff; color: #4338ca; font-size: 10px; font-weight: 700; margin-bottom: 8px;">
                  📍 ${distText} ${travelText ? `• ${travelText}` : ''}
                </div>`
              : ''
          }
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 10px; padding: 6px; background: #f8fafc; border-radius: 8px;">
            <div>B&W: <strong>₹${shop.rates?.bwSingleRate ?? shop.bwSingleRate ?? 2}/pg</strong></div>
            <div>Color: <strong>₹${shop.rates?.colorSingleRate ?? shop.colorSingleRate ?? 10}/pg</strong></div>
          </div>
          <button id="select-shop-btn-${shop.id}" style="
            width: 100%;
            padding: 8px 12px;
            background: #4f46e5;
            color: #ffffff;
            font-size: 11px;
            font-weight: 700;
            border-radius: 8px;
            border: none;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(79, 70, 229, 0.25);
          ">
            ${isSelected ? '✓ Selected' : 'Choose This Shop'}
          </button>
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on('popupopen', () => {
        const btn = document.getElementById(`select-shop-btn-${shop.id}`);
        if (btn) {
          btn.onclick = () => {
            onSelectShop(shop);
            marker.closePopup();
          };
        }
      });

      marker.addTo(markersLayer);
    });
  }, [shops, selectedShop, userCoords, radiusKm]);

  // Handle re-center on selected shop or user
  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (selectedShop?.latitude && selectedShop?.longitude) {
      map.flyTo([selectedShop.latitude, selectedShop.longitude], 15, { duration: 0.8 });
    } else if (userCoords) {
      map.flyTo([userCoords.lat, userCoords.lng], 14, { duration: 0.8 });
    }
  };

  // Handle fit all shops
  const handleFitAllShops = () => {
    const map = mapInstanceRef.current;
    if (!map || shops.length === 0) return;

    const bounds = L.latLngBounds([]);
    if (userCoords) bounds.extend([userCoords.lat, userCoords.lng]);
    shops.forEach((s) => {
      if (s.latitude && s.longitude) bounds.extend([s.latitude, s.longitude]);
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  };

  return (
    <div className="relative w-full h-[380px] sm:h-[440px] rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl bg-slate-100 dark:bg-slate-900">
      {/* Map Target Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top Floating Control Bar */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-[400] gap-2">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-lg border border-slate-200/80 dark:border-slate-700/80 pointer-events-auto flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <Store className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>
            {shops.length} {shops.length === 1 ? 'print shop' : 'print shops'} in{' '}
            {radiusKm === 'ALL' ? 'Pan-India / Worldwide' : `${radiusKm} km radius`}
          </span>
        </div>

        <div className="flex items-center gap-1.5 pointer-events-auto">
          {shops.length > 1 && (
            <button
              type="button"
              onClick={handleFitAllShops}
              className="bg-white/95 dark:bg-slate-900/95 hover:bg-white dark:hover:bg-slate-900 backdrop-blur-md px-2.5 py-1.5 rounded-2xl shadow-lg border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 transition-all flex items-center gap-1 text-xs font-bold active:scale-95"
              title="Fit all registered shops on map"
            >
              <Globe className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline">Fit All</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleRecenter}
            className="bg-white/95 dark:bg-slate-900/95 hover:bg-white dark:hover:bg-slate-900 backdrop-blur-md p-2 rounded-2xl shadow-lg border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 transition-all flex items-center gap-1.5 text-xs font-bold active:scale-95"
            title="Center on selected shop or your location"
          >
            <Crosshair className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden sm:inline">Center</span>
          </button>
        </div>
      </div>

      {/* Bottom Floating Legend / Quick Status */}
      {selectedShop && (
        <div className="absolute bottom-3 left-3 right-14 sm:right-auto sm:max-w-sm bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-indigo-200 dark:border-indigo-900/60 pointer-events-auto z-[400] flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
              <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                {selectedShop.name}
              </div>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {selectedShop.distanceKm !== undefined ? (
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                  {formatDistance(selectedShop.distanceKm)} ({formatTravelTime(selectedShop.distanceKm)})
                </span>
              ) : (
                selectedShop.address
              )}
            </div>
          </div>

          <span className="px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold shrink-0 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
            <Check className="w-3 h-3 text-indigo-600" /> Selected
          </span>
        </div>
      )}
    </div>
  );
};
