import React, { useState, useEffect } from 'react';
import { Store, MapPin, Phone, Star, CheckCircle, Printer, Sparkles, QrCode } from 'lucide-react';
import { Shop } from '../../types/index.js';
import { api } from '../../services/api.js';
import { SkeletonShimmer } from '../common/SkeletonShimmer.js';
import { EmptyState } from '../common/EmptyState.js';

interface ShopSelectorProps {
  selectedShop: Shop | null;
  onSelectShop: (shop: Shop) => void;
}

export const ShopSelector: React.FC<ShopSelectorProps> = ({ selectedShop, onSelectShop }) => {
  const [shops, setShops] = useState<Shop[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/shops');
      if (res.data.success) {
        setShops(res.data.shops);
        // Auto-select first shop if none selected
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
        description="No verified print shops are currently online in your area. Please check back shortly."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Store className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          Select Pickup Print Shop
        </h3>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {shops.length} {shops.length === 1 ? 'shop' : 'shops'} available
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {shops.map((shop) => {
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
                {/* Header with Name and Rating */}
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

                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs font-bold flex-shrink-0">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{shop.stats?.rating || 4.9}</span>
                  </div>
                </div>

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
    </div>
  );
};
