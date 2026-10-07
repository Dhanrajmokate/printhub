import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { CartItem, PrintSettings, Shop, UploadedFileMeta } from '../types/index.js';

interface CartContextType {
  selectedShop: Shop | null;
  setSelectedShop: (shop: Shop | null) => void;
  items: CartItem[];
  addItem: (fileMeta: UploadedFileMeta, settings: PrintSettings) => { success: boolean; isDuplicate?: boolean; message?: string };
  removeItem: (id: string) => void;
  updateItemSettings: (id: string, settings: PrintSettings) => void;
  clearCart: () => void;
  subtotal: number;
  totalItemsCount: number;
  calculatePrice: (fileMeta: UploadedFileMeta, settings: PrintSettings, customShop?: Shop | null) => { unitPrice: number; effectivePages: number; itemPrice: number };
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const defaultPrintSettings: PrintSettings = {
  colorMode: 'BW',
  duplexMode: 'SINGLE',
  copies: 1,
  orientation: 'AUTO',
  paperSize: 'A4',
  quality: 'NORMAL',
  pageRange: 'ALL',
  pageSubset: 'ALL',
  scaling: 'FIT',
  collate: true
};

export function parsePageRange(
  totalPages: number,
  pageRange?: string,
  pageSubset?: 'ALL' | 'ODD' | 'EVEN'
): number {
  let candidates = new Set<number>();
  const isAllPages = !pageRange || pageRange.trim().toUpperCase() === 'ALL';

  if (isAllPages) {
    for (let i = 1; i <= Math.max(1, totalPages); i++) {
      candidates.add(i);
    }
  } else {
    const parts = pageRange.split(',');
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.includes('-')) {
        const [startStr, endStr] = trimmed.split('-');
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);

        if (!isNaN(start) && !isNaN(end)) {
          const min = Math.max(1, Math.min(start, end));
          const max = Math.min(totalPages, Math.max(start, end));
          for (let i = min; i <= max; i++) {
            candidates.add(i);
          }
        }
      } else {
        const page = parseInt(trimmed, 10);
        if (!isNaN(page) && page >= 1 && page <= totalPages) {
          candidates.add(page);
        }
      }
    }
  }

  if (candidates.size === 0) {
    for (let i = 1; i <= Math.max(1, totalPages); i++) {
      candidates.add(i);
    }
  }

  if (pageSubset === 'ODD') {
    candidates = new Set([...candidates].filter((p) => p % 2 !== 0));
  } else if (pageSubset === 'EVEN') {
    candidates = new Set([...candidates].filter((p) => p % 2 === 0));
  }

  return Math.max(1, candidates.size);
}

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedShop, setSelectedShop] = useState<Shop | null>(() => {
    const saved = sessionStorage.getItem('printhub_selected_shop');
    return saved ? JSON.parse(saved) : null;
  });

  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = sessionStorage.getItem('printhub_cart');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    sessionStorage.setItem('printhub_cart', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    if (selectedShop) {
      sessionStorage.setItem('printhub_selected_shop', JSON.stringify(selectedShop));
    } else {
      sessionStorage.removeItem('printhub_selected_shop');
    }
  }, [selectedShop]);

  const calculatePrice = (
    fileMeta: UploadedFileMeta,
    settings: PrintSettings,
    customShop?: Shop | null
  ) => {
    const activeShop = customShop !== undefined ? customShop : selectedShop;
    const effectivePages = parsePageRange(fileMeta.pageCount || 1, settings.pageRange, settings.pageSubset);
    const validCopies = Math.max(1, Math.floor(settings.copies || 1));

    // Default shop rates fallback
    const bwSingle = activeShop?.rates?.bwSingleRate ?? activeShop?.bwSingleRate ?? 2.0;
    const bwDuplex = activeShop?.rates?.bwDuplexRate ?? activeShop?.bwDuplexRate ?? 3.0;
    const colorSingle = activeShop?.rates?.colorSingleRate ?? activeShop?.colorSingleRate ?? 10.0;
    const colorDuplex = activeShop?.rates?.colorDuplexRate ?? activeShop?.colorDuplexRate ?? 18.0;

    let unitPrice = 0;
    const isDuplex =
      settings.duplexMode === 'DUPLEX' ||
      settings.duplexMode === 'DUPLEX_LONG' ||
      settings.duplexMode === 'DUPLEX_SHORT';

    if (settings.colorMode === 'COLOR') {
      unitPrice = isDuplex ? colorDuplex / 2 : colorSingle;
    } else {
      unitPrice = isDuplex ? bwDuplex / 2 : bwSingle;
    }

    const rawTotal = unitPrice * effectivePages * validCopies;
    const itemPrice = Math.max(1.0, Math.round((rawTotal + Number.EPSILON) * 100) / 100);

    return {
      unitPrice,
      effectivePages,
      itemPrice
    };
  };

  // Helper to check if two setting objects are identical
  const areSettingsEqual = (s1: PrintSettings, s2: PrintSettings) => {
    return (
      s1.colorMode === s2.colorMode &&
      s1.duplexMode === s2.duplexMode &&
      s1.copies === s2.copies &&
      s1.orientation === s2.orientation &&
      s1.paperSize === s2.paperSize &&
      s1.quality === s2.quality &&
      (s1.pageRange || 'ALL').trim() === (s2.pageRange || 'ALL').trim() &&
      (s1.pageSubset || 'ALL') === (s2.pageSubset || 'ALL') &&
      s1.scaling === s2.scaling &&
      s1.collate === s2.collate
    );
  };

  const addItem = (fileMeta: UploadedFileMeta, settings: PrintSettings) => {
    // Check duplicate: duplicate block ONLY if same file + identical settings
    const duplicate = items.find(
      (item) =>
        item.fileMeta.storedFileName === fileMeta.storedFileName &&
        areSettingsEqual(item.settings, settings)
    );

    if (duplicate) {
      return {
        success: false,
        isDuplicate: true,
        message: `This file '${fileMeta.originalFileName}' with the EXACT same print settings is already in your cart.`
      };
    }

    const { unitPrice, effectivePages, itemPrice } = calculatePrice(fileMeta, settings);

    const newItem: CartItem = {
      id: `cart_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      fileMeta,
      settings,
      calculatedPages: effectivePages,
      unitPrice,
      itemPrice
    };

    setItems((prev) => [...prev, newItem]);
    return { success: true };
  };

  const updateItemSettings = (id: string, newSettings: PrintSettings) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const { unitPrice, effectivePages, itemPrice } = calculatePrice(item.fileMeta, newSettings);
          return {
            ...item,
            settings: newSettings,
            calculatedPages: effectivePages,
            unitPrice,
            itemPrice
          };
        }
        return item;
      })
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setItems([]);
  };

  // Re-calculate prices whenever selectedShop changes
  useEffect(() => {
    if (items.length > 0) {
      setItems((prev) =>
        prev.map((item) => {
          const { unitPrice, effectivePages, itemPrice } = calculatePrice(item.fileMeta, item.settings, selectedShop);
          return {
            ...item,
            calculatedPages: effectivePages,
            unitPrice,
            itemPrice
          };
        })
      );
    }
  }, [selectedShop]);

  const subtotal = useMemo(() => {
    const total = items.reduce((sum, item) => sum + item.itemPrice, 0);
    return Math.round((total + Number.EPSILON) * 100) / 100;
  }, [items]);

  const totalItemsCount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.settings.copies, 0);
  }, [items]);

  return (
    <CartContext.Provider
      value={{
        selectedShop,
        setSelectedShop,
        items,
        addItem,
        removeItem,
        updateItemSettings,
        clearCart,
        subtotal,
        totalItemsCount,
        calculatePrice
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};
