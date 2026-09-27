import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { config } from './config/index.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';
import { initCleanupCron } from './services/cleanup.service.js';

import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import shopRoutes from './routes/shop.routes.js';
import printerRoutes from './routes/printer.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import orderRoutes from './routes/order.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import sseRoutes from './routes/sse.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security Headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// CORS
app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Body Parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static file serving for document previews, raw uploads, and shop QR images
const uploadRawDir = path.resolve(__dirname, '../uploads/raw');
const uploadConvertedDir = path.resolve(__dirname, '../uploads/converted');
const uploadQrDir = path.resolve(__dirname, '../uploads/qr');
const uploadPaymentsDir = path.resolve(__dirname, '../uploads/payments');

if (!fs.existsSync(uploadRawDir)) fs.mkdirSync(uploadRawDir, { recursive: true });
if (!fs.existsSync(uploadConvertedDir)) fs.mkdirSync(uploadConvertedDir, { recursive: true });
if (!fs.existsSync(uploadQrDir)) fs.mkdirSync(uploadQrDir, { recursive: true });
if (!fs.existsSync(uploadPaymentsDir)) fs.mkdirSync(uploadPaymentsDir, { recursive: true });

app.use('/uploads/raw', express.static(uploadRawDir));
app.use('/uploads/converted', express.static(uploadConvertedDir));
app.use('/uploads/qr', express.static(uploadQrDir));
app.use('/uploads/payments', express.static(uploadPaymentsDir));

// API Rate Limiting
app.use('/api', apiRateLimiter);

// Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'PrintHub API Server',
    port: config.port
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/printers', printerRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/sse', sseRoutes);

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[ServerError]', err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(config.nodeEnv === 'development' ? { stack: err.stack } : {})
  });
});

// Start Server
app.listen(config.port, () => {
  console.log(`=================================================`);
  console.log(`🚀 PrintHub Backend Server running on Port ${config.port}`);
  console.log(`🌐 Environment: ${config.nodeEnv}`);
  console.log(`📡 Client URL: ${config.clientUrl}`);
  console.log(`=================================================`);

  // Initialize background tasks
  initCleanupCron();
});
