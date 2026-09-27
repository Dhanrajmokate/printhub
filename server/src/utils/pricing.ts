export interface PricingParams {
  colorMode: 'BW' | 'COLOR';
  duplexMode: 'SINGLE' | 'DUPLEX';
  totalPages: number;
  pageRange?: string;
  copies: number;
  rates: {
    bwSingleRate: number;
    bwDuplexRate: number;
    colorSingleRate: number;
    colorDuplexRate: number;
  };
}

/**
 * Calculates total target pages based on page range string (e.g. "1-5, 8, 10-12")
 */
export function calculateTargetPages(totalPages: number, pageRange?: string): number {
  if (!pageRange || pageRange.trim().toUpperCase() === 'ALL') {
    return Math.max(1, totalPages);
  }

  const pagesSet = new Set<number>();
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
          pagesSet.add(i);
        }
      }
    } else {
      const page = parseInt(trimmed, 10);
      if (!isNaN(page) && page >= 1 && page <= totalPages) {
        pagesSet.add(page);
      }
    }
  }

  return pagesSet.size > 0 ? pagesSet.size : Math.max(1, totalPages);
}

/**
 * Multiplicative Price Calculation:
 * Base Rate (B&W or Color) × Duplex Factor × Effective Pages × Copies
 */
export function calculateItemPrice(params: PricingParams): {
  unitPricePerPage: number;
  effectivePages: number;
  copies: number;
  totalPrice: number;
} {
  const { colorMode, duplexMode, totalPages, pageRange, copies, rates } = params;
  const effectivePages = calculateTargetPages(totalPages, pageRange);
  const validCopies = Math.max(1, Math.floor(copies));

  let unitPricePerPage = 0;

  if (colorMode === 'COLOR') {
    if (duplexMode === 'DUPLEX') {
      // In duplex, rate per page = duplex rate / 2 (e.g. 18 / 2 = 9 per side)
      unitPricePerPage = rates.colorDuplexRate / 2;
    } else {
      unitPricePerPage = rates.colorSingleRate;
    }
  } else {
    // B&W
    if (duplexMode === 'DUPLEX') {
      unitPricePerPage = rates.bwDuplexRate / 2;
    } else {
      unitPricePerPage = rates.bwSingleRate;
    }
  }

  // Live multiplicative price
  const rawTotal = unitPricePerPage * effectivePages * validCopies;
  const totalPrice = Math.round((rawTotal + Number.EPSILON) * 100) / 100;

  return {
    unitPricePerPage,
    effectivePages,
    copies: validCopies,
    totalPrice: Math.max(1.0, totalPrice) // Minimum ₹1.00
  };
}
