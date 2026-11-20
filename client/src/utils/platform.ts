import { useState, useEffect } from 'react';

/**
 * Platform & Environment Detection Utility
 * Robustly detects whether the runtime environment is the Shop Partner Desktop / Mobile App
 * or the Customer Website.
 */

export function checkIsShopApp(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Explicitly exposed Electron / Preload flags
  if ((window as any).isShopApp === true) return true;
  if ((window as any).appMode === 'SHOP') return true;
  if (Boolean((window as any).electronAPI)) return true;

  // 2. Custom or Standard User-Agent check
  const ua = (navigator.userAgent || '').toLowerCase();
  if (ua.includes('printhubshoppartnerapp') || ua.includes('electron')) return true;

  // 3. Local desktop embedded server (Port 8345)
  if (window.location.port === '8345') return true;

  // 4. Native App protocols (Capacitor on Android or local file wrapper)
  if (
    window.location.protocol === 'capacitor:' ||
    window.location.protocol === 'file:' ||
    Boolean((window as any).Capacitor)
  ) {
    return true;
  }

  // 5. Query parameters or pathname
  const search = window.location.search || '';
  if (search.includes('app=shop') || search.includes('mode=shop') || search.includes('role=shop')) {
    return true;
  }

  // 6. Explicit localStorage persistence
  try {
    if (localStorage.getItem('printhub_app_mode') === 'SHOP') return true;
  } catch (e) {
    // Ignore storage restrictions
  }

  return false;
}

// Initial evaluation
export const isShopApp: boolean = checkIsShopApp();
export const isCustomerWeb: boolean = !isShopApp;

/**
 * React Hook for dynamic re-validation of the platform mode.
 * Ensures that if preload bridges expose APIs shortly after module evaluation,
 * components immediately update their UI.
 */
export function useIsShopApp(): boolean {
  const [isShop, setIsShop] = useState<boolean>(() => checkIsShopApp());

  useEffect(() => {
    // Re-check after window has loaded all preloads and properties
    const current = checkIsShopApp();
    if (current !== isShop) {
      setIsShop(current);
    }
  }, [isShop]);

  return isShop;
}

export function setAppModePreference(mode: 'SHOP' | 'CUSTOMER') {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('printhub_app_mode', mode);
    } catch (e) {}
  }
}
