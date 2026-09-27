import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '8000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'printhub_super_secret_jwt_key_2026_secure',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:8080',
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'PrintHub <no-reply@printhub.com>'
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock_printhub',
    keySecret: process.env.RAZORPAY_KEY_SECRET || 'mock_secret_printhub_12345'
  },
  printers: {
    bwUrl: process.env.BW_PRINTER_URL || 'http://localhost:8001',
    colorUrl: process.env.COLOR_PRINTER_URL || 'http://localhost:8002'
  }
};
