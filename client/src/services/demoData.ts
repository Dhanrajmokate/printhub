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
    name: 'PrintHub Metro Central',
    address: 'Metro Station Arcade, Ground Floor, Shop #3',
    phone: '9876543210',
    latitude: 19.8762,
    longitude: 75.3433,
    upiId: 'printhub@upi',
    upiName: 'PrintHub Metro Central',
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

export const DEMO_DHANRAJ_SHOP_USER: User = {
  id: 'dhanraj-shop-user-id',
  email: 'dhanraj@printhub.com',
  name: 'Dhanraj Gopal Mokate',
  phone: '9876543213',
  role: 'SHOP',
  isVerified: true,
  shop: {
    id: 'demo-shop-4',
    userId: 'dhanraj-shop-user-id',
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
        name: 'Dhanraj Station Heavy-Duty Laser 8001',
        port: 8001,
        type: 'BW',
        supportsDuplex: true,
        isOnline: true,
        autoConvert: true,
        healthStatus: { isOnline: true, statusText: 'Online & Ready (Port 8001)' }
      },
      {
        id: 'demo-printer-6',
        shopId: 'demo-shop-4',
        name: 'Dhanraj Pro Color Studio 8002',
        port: 8002,
        type: 'COLOR',
        supportsDuplex: true,
        isOnline: true,
        autoConvert: true,
        healthStatus: { isOnline: true, statusText: 'Online & Ready (Port 8002)' }
      }
    ],
    stats: {
      totalOrders: 114,
      completedOrders: 110,
      rating: 4.9
    }
  }
};

export const DEMO_CAMPUS_SHOP_USER: User = {
  id: 'campus-shop-user-id',
  email: 'campus@printhub.com',
  name: 'Campus Print Corner',
  phone: '9123456789',
  role: 'SHOP',
  isVerified: true,
  shop: {
    id: 'demo-shop-campus',
    userId: 'campus-shop-user-id',
    name: 'Campus Express Print Hub',
    address: 'Block C, University Student Center',
    phone: '9123456789',
    latitude: 19.8800,
    longitude: 75.3440,
    upiId: 'campusexpress@upi',
    upiName: 'Campus Express Print Hub',
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
        id: 'demo-printer-campus-1',
        shopId: 'demo-shop-campus',
        name: 'Campus B&W Laser 8001',
        port: 8001,
        type: 'BW',
        supportsDuplex: true,
        isOnline: true,
        autoConvert: true,
        healthStatus: { isOnline: true, statusText: 'Online & Ready (Port 8001)' }
      },
      {
        id: 'demo-printer-campus-2',
        shopId: 'demo-shop-campus',
        name: 'Campus Color Jet 8002',
        port: 8002,
        type: 'COLOR',
        supportsDuplex: true,
        isOnline: true,
        autoConvert: true,
        healthStatus: { isOnline: true, statusText: 'Online & Ready (Port 8002)' }
      }
    ],
    stats: {
      totalOrders: 85,
      completedOrders: 82,
      rating: 4.8
    }
  }
};

export const DEMO_LIBRARY_SHOP_USER: User = {
  id: 'library-shop-user-id',
  email: 'library@printhub.com',
  name: 'Central Library Print Desk',
  phone: '9876543211',
  role: 'SHOP',
  isVerified: true,
  shop: {
    id: 'demo-shop-2',
    userId: 'library-shop-user-id',
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
        healthStatus: { isOnline: true, statusText: 'Online & Ready (Port 8003)' }
      }
    ],
    stats: {
      totalOrders: 68,
      completedOrders: 66,
      rating: 4.8
    }
  }
};

export const DEMO_SHOPS: Shop[] = [
  DEMO_SHOP_USER.shop!,
  DEMO_DHANRAJ_SHOP_USER.shop!,
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
    address: 'Station Road Business Plaza, Shop #4',
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

export let DEMO_ORDERS: Order[] = [
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
        scaling: 'FIT_PAGE',
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

if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem('printhub_demo_orders');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        DEMO_ORDERS = parsed;
      }
    }
  } catch (e) {}
}

function persistDemoOrders() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('printhub_demo_orders', JSON.stringify(DEMO_ORDERS));
    } catch (e) {}
  }
}

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

  if (m === 'DELETE') {
    // 1. Delete item from order: /orders/shop/:orderId/items/:itemId
    const itemMatch = url.match(/\/orders\/shop\/([^/]+)\/items\/([^/]+)/);
    if (itemMatch) {
      const ordId = itemMatch[1];
      const itmId = itemMatch[2];
      const targetOrder = DEMO_ORDERS.find((o) => o.id === ordId || o.orderNumber?.toLowerCase() === ordId);
      if (targetOrder && targetOrder.items) {
        targetOrder.items = targetOrder.items.filter((i) => i.id !== itmId);
        persistDemoOrders();
      }
      return { success: true, message: 'Document deleted successfully' };
    }

    // 2. Delete order: /orders/shop/:orderId or /orders/:orderId
    const orderMatch = url.match(/\/orders\/(?:shop\/)?([^/?]+)/);
    if (orderMatch) {
      const ordId = orderMatch[1];
      DEMO_ORDERS = DEMO_ORDERS.filter((o) => o.id !== ordId && o.orderNumber?.toLowerCase() !== ordId);
      persistDemoOrders();
      return { success: true, message: 'Order deleted successfully' };
    }

    return { success: true, message: 'Deleted successfully' };
  }

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

  // 1. Single order lookup by ID: /orders/:id
  const orderIdMatch = url.match(/\/orders\/([a-zA-Z0-9_\-]+)/);
  if (orderIdMatch && m === 'GET' && !url.includes('/orders/customer') && !url.includes('/orders/shop') && !url.includes('/orders/history')) {
    const targetId = orderIdMatch[1];
    const found = DEMO_ORDERS.find((o) => o.id.toLowerCase() === targetId || o.orderNumber.toLowerCase() === targetId);
    if (found) {
      return { success: true, order: found };
    }
  }

  if (url.includes('/orders/customer')) {
    return { success: true, orders: DEMO_ORDERS.filter((o) => o.customerId === 'demo-customer-id') };
  }

  if (url.includes('/orders/shop')) {
    const queue = DEMO_ORDERS.filter((o) => o.status !== 'COMPLETED' && o.status !== 'CANCELLED');
    const history = DEMO_ORDERS.filter((o) => o.status === 'COMPLETED' || o.status === 'CANCELLED');
    return { success: true, queue, history, orders: DEMO_ORDERS };
  }

  if (url.includes('/orders') && m === 'GET') {
    return { success: true, orders: DEMO_ORDERS, order: DEMO_ORDERS[0] };
  }

  if (url.includes('/orders') && m === 'POST') {
    let payload = postData;
    if (typeof postData === 'string') {
      try { payload = JSON.parse(postData); } catch (e) {}
    }

    const newOrderId = `ord-demo-${Date.now()}`;
    const newOrderNumber = `PH-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const targetShop = (payload?.shopId && DEMO_SHOPS.find((s) => s.id === payload.shopId)) || DEMO_SHOPS[0];

    const items = (payload?.items && Array.isArray(payload.items) && payload.items.length > 0)
      ? payload.items.map((it: any, idx: number) => ({
          id: `item-demo-${Date.now()}-${idx}`,
          orderId: newOrderId,
          originalFileName: it.originalFileName || 'Document.pdf',
          storedFileName: it.storedFileName || 'Document.pdf',
          fileType: it.fileType || 'application/pdf',
          fileSize: it.fileSize || 102400,
          pageCount: it.pageCount || 1,
          calculatedPages: it.calculatedPages || it.pageCount || 1,
          copies: it.copies || 1,
          colorMode: it.colorMode || 'BW',
          duplexMode: it.duplexMode || 'SINGLE',
          orientation: it.orientation || 'PORTRAIT',
          paperSize: it.paperSize || 'A4',
          quality: it.quality || 'NORMAL',
          pageRange: it.pageRange || 'ALL',
          pageSubset: it.pageSubset || 'ALL',
          scaling: it.scaling || 'FIT',
          collate: it.collate !== false,
          itemPrice: it.itemPrice || (it.copies ? it.copies * 2.0 : 2.0),
          status: 'PENDING'
        }))
      : DEMO_ORDERS[0].items;

    const totalAmount = items.reduce((sum: number, it: any) => sum + (it.itemPrice || 2.0), 0);

    const newOrder: Order = {
      id: newOrderId,
      orderNumber: newOrderNumber,
      customerId: 'demo-customer-id',
      customer: {
        id: 'demo-customer-id',
        name: 'Demo Student Customer',
        phone: '9876543210',
        email: 'customer@printhub.com'
      },
      shopId: targetShop.id,
      shop: targetShop,
      status: 'PENDING',
      totalAmount,
      paymentMethod: payload?.paymentMethod || 'SHOP_UPI_QR',
      paymentStatus: 'PAID',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items
    };

    DEMO_ORDERS.unshift(newOrder);
    persistDemoOrders();

    return {
      success: true,
      order: newOrder,
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
