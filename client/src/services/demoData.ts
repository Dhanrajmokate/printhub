import { User, Shop, Order, Printer } from '../types/index.js';

export const DEMO_CUSTOMER_USER: User = {
  id: 'demo-customer-id',
  email: 'customer@printhub.com',
  name: 'Demo Student Customer',
  phone: '9876543210',
  role: 'CUSTOMER',
  isVerified: true,
  wallet: {
    id: 'demo-wallet-id',
    userId: 'demo-customer-id',
    balance: 100.0,
    transactions: [
      {
        id: 'tx-welcome',
        walletId: 'demo-wallet-id',
        amount: 100.0,
        type: 'CREDIT',
        description: 'Welcome Bonus Credit ₹100',
        createdAt: new Date().toISOString()
      }
    ]
  }
};

export const DEMO_SHOP_USER: User = {
  id: 'demo-shop-user-id',
  email: 'shop@printhub.com',
  name: 'Demo Print Shop Owner',
  phone: '9876543210',
  role: 'SHOP',
  isVerified: true,
  shop: {
    id: 'demo-shop-id',
    userId: 'demo-shop-user-id',
    name: 'PrintHub Campus Central',
    address: 'Campus Student Center, Ground Floor, Shop #3',
    phone: '9876543210',
    latitude: 19.8762,
    longitude: 75.3433,
    upiId: 'printhub@upi',
    upiName: 'PrintHub Campus Shop',
    bwSingleRate: 2.0,
    bwDuplexRate: 3.0,
    colorSingleRate: 10.0,
    colorDuplexRate: 18.0,
    autoConvert: true,
    capabilities: {
      supportsBw: true,
      supportsColor: true,
      supportsDuplex: true,
      autoConvert: true
    },
    printers: [
      {
        id: 'demo-printer-1',
        shopId: 'demo-shop-id',
        name: 'High-Speed B&W Laser (Port 8001)',
        port: 8001,
        type: 'BW',
        supportsDuplex: true,
        isOnline: true,
        autoConvert: true,
        healthStatus: { isOnline: true, statusText: 'Online & Ready (Port 8001)' }
      },
      {
        id: 'demo-printer-2',
        shopId: 'demo-shop-id',
        name: 'Pro Glossy Color Inkjet (Port 8002)',
        port: 8002,
        type: 'COLOR',
        supportsDuplex: true,
        isOnline: true,
        autoConvert: true,
        healthStatus: { isOnline: true, statusText: 'Online & Ready (Port 8002)' }
      }
    ],
    stats: {
      totalOrders: 42,
      completedOrders: 39,
      rating: 4.9
    }
  }
};

export const DEMO_SHOPS: Shop[] = [
  DEMO_SHOP_USER.shop!,
  {
    id: 'demo-shop-2',
    name: 'PrintHub Central Library Annex',
    address: 'Central Library, 1st Floor, Reading Hall Entrance',
    phone: '9876543211',
    latitude: 19.8788,
    longitude: 75.3455,
    upiId: 'libraryprint@upi',
    upiName: 'Library Express Print',
    bwSingleRate: 1.5,
    bwDuplexRate: 2.5,
    colorSingleRate: 8.0,
    colorDuplexRate: 15.0,
    autoConvert: true,
    capabilities: {
      supportsBw: true,
      supportsColor: true,
      supportsDuplex: true,
      autoConvert: true
    },
    printers: [
      {
        id: 'demo-printer-3',
        shopId: 'demo-shop-2',
        name: 'Library Xerox Laser Pro',
        port: 8003,
        type: 'BW',
        supportsDuplex: true,
        isOnline: true,
        autoConvert: true,
        healthStatus: { isOnline: true, statusText: 'Online & Ready' }
      }
    ],
    stats: {
      totalOrders: 68,
      completedOrders: 66,
      rating: 4.8
    }
  },
  {
    id: 'demo-shop-3',
    name: 'Apex QuickPrint Hub',
    address: 'Campus North Gate Arcade, Shop #4',
    phone: '9876543212',
    latitude: 19.8845,
    longitude: 75.3495,
    upiId: 'apexprint@upi',
    upiName: 'Apex QuickPrint Hub',
    bwSingleRate: 2.0,
    bwDuplexRate: 3.0,
    colorSingleRate: 10.0,
    colorDuplexRate: 18.0,
    autoConvert: true,
    capabilities: {
      supportsBw: true,
      supportsColor: true,
      supportsDuplex: true,
      autoConvert: true
    },
    printers: [
      {
        id: 'demo-printer-4',
        shopId: 'demo-shop-3',
        name: 'LaserJet High Capacity 8001',
        port: 8001,
        type: 'BW',
        supportsDuplex: true,
        isOnline: true,
        autoConvert: true,
        healthStatus: { isOnline: true, statusText: 'Online & Ready' }
      }
    ],
    stats: {
      totalOrders: 92,
      completedOrders: 89,
      rating: 4.7
    }
  },
  {
    id: 'demo-shop-4',
    name: 'Dhanraj Station Print Shop',
    address: 'Railway Station Road, Commercial Complex, Shop #11',
    phone: '9876543213',
    latitude: 19.8940,
    longitude: 75.3580,
    upiId: 'dhanraj@upi',
    upiName: 'Dhanraj Station Print',
    bwSingleRate: 2.0,
    bwDuplexRate: 3.5,
    colorSingleRate: 12.0,
    colorDuplexRate: 20.0,
    autoConvert: true,
    capabilities: {
      supportsBw: true,
      supportsColor: true,
      supportsDuplex: true,
      autoConvert: true
    },
    printers: [
      {
        id: 'demo-printer-5',
        shopId: 'demo-shop-4',
        name: 'Plotter & Color Laser 8002',
        port: 8002,
        type: 'COLOR',
        supportsDuplex: true,
        isOnline: true,
        autoConvert: true,
        healthStatus: { isOnline: true, statusText: 'Online & Ready' }
      }
    ],
    stats: {
      totalOrders: 114,
      completedOrders: 110,
      rating: 4.6
    }
  }
];

export const DEMO_PRINTERS: Printer[] = DEMO_SHOP_USER.shop!.printers!;

export const DEMO_ORDERS: Order[] = [
  {
    id: 'ord-demo-101',
    orderNumber: 'PH-2026-9041',
    customerId: 'demo-customer-id',
    customer: {
      id: 'demo-customer-id',
      name: 'Demo Student Customer',
      phone: '9876543210',
      email: 'customer@printhub.com'
    },
    shopId: 'demo-shop-id',
    shop: DEMO_SHOP_USER.shop!,
    status: 'PRINTING',
    totalAmount: 48.0,
    paymentMethod: 'WALLET',
    paymentStatus: 'PAID',
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    items: [
      {
        id: 'item-demo-1',
        orderId: 'ord-demo-101',
        originalFileName: 'Major_Project_Chapter_1_to_3.pdf',
        storedFileName: 'stored-doc-1.pdf',
        fileType: 'application/pdf',
        fileSize: 2450000,
        pageCount: 16,
        calculatedPages: 16,
        copies: 1,
        colorMode: 'BW',
        duplexMode: 'DUPLEX',
        orientation: 'PORTRAIT',
        paperSize: 'A4',
        quality: 'NORMAL',
        pageRange: '1-16',
        scaling: 'FIT',
        collate: true,
        itemPrice: 48.0,
        status: 'PRINTING'
      }
    ]
  },
  {
    id: 'ord-demo-102',
    orderNumber: 'PH-2026-9042',
    customerId: 'demo-customer-id',
    customer: {
      id: 'demo-customer-id',
      name: 'Demo Student Customer',
      phone: '9876543210',
      email: 'customer@printhub.com'
    },
    shopId: 'demo-shop-id',
    shop: DEMO_SHOP_USER.shop!,
    status: 'PRINTED',
    totalAmount: 20.0,
    paymentMethod: 'WALLET',
    paymentStatus: 'PAID',
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    items: [
      {
        id: 'item-demo-2',
        orderId: 'ord-demo-102',
        originalFileName: 'IEEE_Conference_Certificate.pdf',
        storedFileName: 'stored-doc-2.pdf',
        fileType: 'application/pdf',
        fileSize: 850000,
        pageCount: 2,
        calculatedPages: 2,
        copies: 1,
        colorMode: 'COLOR',
        duplexMode: 'SINGLE',
        orientation: 'LANDSCAPE',
        paperSize: 'A4',
        quality: 'HIGH',
        pageRange: '1-2',
        scaling: 'FIT',
        collate: true,
        itemPrice: 20.0,
        status: 'PRINTED'
      }
    ]
  },
  {
    id: 'ord-demo-103',
    orderNumber: 'PH-2026-9043',
    customerId: 'cust-demo-external',
    customer: {
      id: 'cust-demo-external',
      name: 'Rohan Sharma',
      phone: '9822114455',
      email: 'rohan.sharma@gmail.com'
    },
    shopId: 'demo-shop-id',
    shop: DEMO_SHOP_USER.shop!,
    status: 'PENDING',
    totalAmount: 36.0,
    paymentMethod: 'SHOP_UPI_QR',
    paymentStatus: 'PAID',
    upiTransactionRef: 'UPI20269043009',
    createdAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    items: [
      {
        id: 'item-demo-3',
        orderId: 'ord-demo-103',
        originalFileName: 'Engineering_Drawings_BatchA.pdf',
        storedFileName: 'stored-doc-3.pdf',
        fileType: 'application/pdf',
        fileSize: 3100000,
        pageCount: 12,
        calculatedPages: 12,
        copies: 1,
        colorMode: 'BW',
        duplexMode: 'DUPLEX',
        orientation: 'LANDSCAPE',
        paperSize: 'A3',
        quality: 'HIGH',
        pageRange: '1-12',
        scaling: 'FIT',
        collate: true,
        itemPrice: 36.0,
        status: 'PENDING'
      }
    ]
  }
];

export const DEMO_SHOP_WALLET = {
  id: 'demo-shop-wallet-id',
  balance: 3450.0,
  lifetimeEarnings: 12800.0,
  totalWithdrawn: 9350.0,
  transactions: [
    {
      id: 'tx-s1',
      amount: 48.0,
      type: 'CREDIT',
      description: 'Order #PH-2026-9041 payout',
      orderId: 'ord-demo-101',
      createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString()
    },
    {
      id: 'tx-s2',
      amount: 20.0,
      type: 'CREDIT',
      description: 'Order #PH-2026-9042 payout',
      orderId: 'ord-demo-102',
      createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString()
    },
    {
      id: 'tx-s3',
      amount: 500.0,
      type: 'DEBIT',
      description: 'Bank transfer payout to UPI',
      createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
    }
  ]
};

export function isDemoSession(): boolean {
  if (typeof window === 'undefined') return false;
  const token = sessionStorage.getItem('printhub_token') || localStorage.getItem('printhub_token');
  return !!token && token.startsWith('demo-');
}

export function getMockDataForUrl(rawUrl: string, method: string = 'GET', postData?: any): any {
  const url = (rawUrl || '').toLowerCase();
  const m = (method || 'GET').toUpperCase();

  if (url.includes('/auth/login') && m === 'POST') {
    let email = '';
    if (typeof postData === 'string') {
      try { email = JSON.parse(postData).email || ''; } catch (e) {}
    } else if (postData && typeof postData === 'object') {
      email = postData.email || '';
    }
    const isShop = email.toLowerCase().includes('shop');
    return {
      success: true,
      token: isShop ? 'demo-jwt-token-shop' : 'demo-jwt-token-customer',
      user: isShop ? DEMO_SHOP_USER : DEMO_CUSTOMER_USER,
      message: 'Demo login successful'
    };
  }

  if (url.includes('/auth/me')) {
    const isShop = typeof window !== 'undefined' && localStorage.getItem('printhub_token') === 'demo-jwt-token-shop';
    return { success: true, user: isShop ? DEMO_SHOP_USER : DEMO_CUSTOMER_USER };
  }

  if (url.includes('/shops/wallet')) {
    return { success: true, wallet: DEMO_SHOP_WALLET };
  }

  if (url.includes('/shops')) {
    return { success: true, shops: DEMO_SHOPS, shop: DEMO_SHOPS[0] };
  }

  if (url.includes('/printers')) {
    return { success: true, printers: DEMO_PRINTERS };
  }

  if (url.includes('/orders/customer')) {
    return { success: true, orders: DEMO_ORDERS.filter((o) => o.customerId === 'demo-customer-id') };
  }

  if (url.includes('/orders/shop')) {
    return { success: true, orders: DEMO_ORDERS };
  }

  if (url.includes('/orders') && m === 'GET') {
    return { success: true, orders: DEMO_ORDERS, order: DEMO_ORDERS[0] };
  }

  if (url.includes('/orders') && m === 'POST') {
    return {
      success: true,
      order: {
        ...DEMO_ORDERS[0],
        id: `ord-demo-${Date.now()}`,
        orderNumber: `PH-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        status: 'PENDING'
      },
      message: 'Order created successfully'
    };
  }

  if (url.includes('/status') && m === 'POST') {
    return { success: true, message: 'Status updated' };
  }

  if (url.includes('/upload')) {
    return {
      success: true,
      file: {
        originalFileName: 'Demo_Document.pdf',
        storedFileName: 'stored-demo-file.pdf',
        fileSize: 1024 * 1024 * 2.1,
        fileType: 'application/pdf',
        pageCount: 6,
        isExactPageCount: true
      }
    };
  }

  if (url.includes('/wallet')) {
    return { success: true, wallet: DEMO_CUSTOMER_USER.wallet };
  }

  return { success: true, message: 'OK' };
}
