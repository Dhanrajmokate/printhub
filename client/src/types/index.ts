export type UserRole = 'CUSTOMER' | 'SHOP';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role: UserRole;
  isVerified: boolean;
  wallet?: Wallet | null;
  shop?: Shop | null;
}

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  transactions?: Transaction[];
}

export interface Transaction {
  id: string;
  walletId: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT' | 'REFUND';
  description: string;
  orderId?: string | null;
  createdAt: string;
}

export interface ShopRates {
  bwSingleRate: number;
  bwDuplexRate: number;
  colorSingleRate: number;
  colorDuplexRate: number;
}

export interface ShopCapabilities {
  supportsBw: boolean;
  supportsColor: boolean;
  supportsDuplex: boolean;
  autoConvert: boolean;
}

export interface Shop {
  id: string;
  userId?: string;
  name: string;
  address: string;
  phone: string;
  upiId?: string;
  upiName?: string;
  qrImageUrl?: string | null;
  qrType?: 'DYNAMIC_UPI' | 'CUSTOM_PHONEPE_IMAGE';
  rates?: ShopRates;
  bwSingleRate?: number;
  bwDuplexRate?: number;
  colorSingleRate?: number;
  colorDuplexRate?: number;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  bankIfsc?: string | null;
  razorpayAccountId?: string | null;
  autoConvert?: boolean;
  capabilities?: ShopCapabilities;
  stats?: {
    totalOrders: number;
    completedOrders: number;
    rating: number;
  };
  printers?: Printer[];
}

export interface PrinterHealth {
  isOnline: boolean;
  statusText: string;
  statusCode?: number;
  details?: any;
}

export interface Printer {
  id: string;
  shopId: string;
  name: string;
  port: number;
  type: 'BW' | 'COLOR';
  supportsDuplex: boolean;
  isOnline: boolean;
  autoConvert: boolean;
  healthStatus?: PrinterHealth;
}

export type OrderStatus = 'PENDING' | 'PRINTING' | 'PRINTED' | 'COLLECTED' | 'CANCELLED';
export type ItemStatus = 'PENDING' | 'PRINTING' | 'PRINTED' | 'FAILED';

export interface PrintSettings {
  colorMode: 'BW' | 'COLOR';
  duplexMode: 'SINGLE' | 'DUPLEX_LONG' | 'DUPLEX_SHORT' | 'DUPLEX';
  copies: number;
  orientation: 'PORTRAIT' | 'LANDSCAPE' | 'AUTO';
  paperSize: 'A4' | 'A3' | 'A5' | 'LETTER' | 'LEGAL';
  quality: 'DRAFT' | 'NORMAL' | 'HIGH';
  pageRange: string;
  pageSubset?: 'ALL' | 'ODD' | 'EVEN';
  scaling: 'FIT' | 'ACTUAL' | 'SHRINK';
  collate: boolean;
}

export interface UploadedFileMeta {
  originalFileName: string;
  storedFileName: string;
  fileSize: number;
  fileType: string;
  pageCount: number;
  isExactPageCount?: boolean;
  previewUrl?: string;
}

export interface CartItem {
  id: string;
  fileMeta: UploadedFileMeta;
  settings: PrintSettings;
  calculatedPages: number;
  unitPrice: number;
  itemPrice: number;
}

export interface OrderItem {
  id: string;
  orderId: string;
  originalFileName: string;
  storedFileName: string;
  fileType: string;
  fileSize: number;
  pageCount: number;
  calculatedPages: number;
  copies: number;
  colorMode: 'BW' | 'COLOR';
  duplexMode: 'SINGLE' | 'DUPLEX';
  orientation: string;
  paperSize: string;
  quality: string;
  pageRange: string;
  pageSubset?: string;
  scaling: string;
  collate: boolean;
  itemPrice: number;
  status: ItemStatus;
  printedAt?: string | null;
  errorMessage?: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customer?: {
    id: string;
    name: string;
    phone?: string | null;
    email: string;
  };
  shopId: string;
  shop?: Shop;
  status: OrderStatus;
  totalAmount: number;
  paymentMethod: 'SHOP_UPI_QR' | 'WALLET' | 'RAZORPAY';
  paymentStatus: 'PAID' | 'REFUNDED' | 'FAILED';
  upiTransactionRef?: string | null;
  razorpayPaymentId?: string | null;
  paymentScreenshot?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

declare global {
  interface Window {
    electronAPI?: {
      getSystemPrinters: () => Promise<any[]>;
      printJob: (jobData: any) => Promise<any>;
      getConfig: () => Promise<any>;
      saveConfig: (config: any) => Promise<boolean>;
      reloadApp?: () => Promise<any>;
      openProofFolder: () => Promise<void>;
    };
  }
}
