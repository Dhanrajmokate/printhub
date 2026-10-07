export interface PricingParams {
  colorMode: 'BW' | 'COLOR';
  duplexMode: string;
  totalPages: number;
  pageRange?: string;
  pageSubset?: 'ALL' | 'ODD' | 'EVEN';
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
 * and optional page subset (ODD / EVEN / ALL).
 */
export function calculateTargetPages(
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

  // Filter by subset (Odd / Even) if selected
  if (pageSubset === 'ODD') {
    candidates = new Set([...candidates].filter((p) => p % 2 !== 0));
  } else if (pageSubset === 'EVEN') {
    candidates = new Set([...candidates].filter((p) => p % 2 === 0));
  }

  return Math.max(1, candidates.size);
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
  const { colorMode, duplexMode, totalPages, pageRange, pageSubset, copies, rates } = params;
  const effectivePages = calculateTargetPages(totalPages, pageRange, pageSubset);
  const validCopies = Math.max(1, Math.floor(copies));

  let unitPricePerPage = 0;
  const isDuplex = duplexMode === 'DUPLEX' || duplexMode === 'DUPLEX_LONG' || duplexMode === 'DUPLEX_SHORT';

  if (colorMode === 'COLOR') {
    if (isDuplex) {
      // In duplex, rate per page = duplex rate / 2 (e.g. 18 / 2 = 9 per side)
      unitPricePerPage = rates.colorDuplexRate / 2;
    } else {
      unitPricePerPage = rates.colorSingleRate;
    }
  } else {
    // B&W
    if (isDuplex) {
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
