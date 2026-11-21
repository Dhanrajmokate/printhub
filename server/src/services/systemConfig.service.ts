import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configFilePath = path.resolve(__dirname, '../../config/platformConfig.json');

export interface PlatformConfig {
  maintenanceMode: boolean;
  announcement: string;
  signupBonus: number;
  platformCommissionPercent: number;
  allowNewRegistrations: boolean;
  emergencyNotice?: string;
  updatedAt: string;
}

const DEFAULT_CONFIG: PlatformConfig = {
  maintenanceMode: false,
  announcement: '🎉 Welcome to PrintHub! Enjoy lightning-fast printing at campus print shops with ₹100 free welcome credits.',
  signupBonus: 100,
  platformCommissionPercent: 5.0,
  allowNewRegistrations: true,
  emergencyNotice: '',
  updatedAt: new Date().toISOString()
};

let currentConfig: PlatformConfig = { ...DEFAULT_CONFIG };

// Load config from disk if exists
try {
  if (fs.existsSync(configFilePath)) {
    const raw = fs.readFileSync(configFilePath, 'utf-8');
    currentConfig = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } else {
    // Ensure parent dir exists
    const dir = path.dirname(configFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(configFilePath, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf-8');
  }
} catch (e) {
  console.warn('[SystemConfig] Failed to load config from disk, using defaults:', e);
}

export function getPlatformConfig(): PlatformConfig {
  return { ...currentConfig };
}

export function updatePlatformConfig(updates: Partial<PlatformConfig>): PlatformConfig {
  currentConfig = {
    ...currentConfig,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  try {
    const dir = path.dirname(configFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(configFilePath, JSON.stringify(currentConfig, null, 2), 'utf-8');
  } catch (e) {
    console.error('[SystemConfig] Failed to persist config to disk:', e);
  }

  return { ...currentConfig };
}
