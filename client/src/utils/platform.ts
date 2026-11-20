/**
 * Platform & Environment Detection Utility
 * Differentiates between the Shop Partner Desktop/Mobile App (Electron / Native)
 * and the Customer Web Application (Vercel / Browser).
 */

export const isShopApp: boolean =
  typeof window !== 'undefined' && Boolean((window as any).electronAPI);

export const isCustomerWeb: boolean = !isShopApp;

export interface PlatformCapabilities {
  hasHardwarePrinters: boolean;
  supportsSilentAutoPrint: boolean;
  isDesktopTerminal: boolean;
  isWebBrowser: boolean;
}

export function getPlatformCapabilities(): PlatformCapabilities {
  return {
    hasHardwarePrinters: isShopApp,
    supportsSilentAutoPrint: isShopApp,
    isDesktopTerminal: isShopApp,
    isWebBrowser: isCustomerWeb
  };
}
