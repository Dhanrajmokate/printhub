import fs from 'fs';
import path from 'path';
import cron from 'node-cron';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rawDir = path.resolve(__dirname, '../../uploads/raw');
const convertedDir = path.resolve(__dirname, '../../uploads/converted');

export function cleanupOldFiles(maxAgeHours: number = 24) {
  const cutoffTime = Date.now() - maxAgeHours * 60 * 60 * 1000;
  let deletedCount = 0;

  const cleanDirectory = (dir: string) => {
    if (!fs.existsSync(dir)) return;

    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (file === '.gitkeep') continue;

        const filePath = path.join(dir, file);
        try {
          const stats = fs.statSync(filePath);
          if (stats.isFile() && stats.mtimeMs < cutoffTime) {
            fs.unlinkSync(filePath);
            deletedCount++;
          }
        } catch (err) {
          console.warn(`[Cleanup] Could not stat/delete ${filePath}:`, err);
        }
      }
    } catch (err) {
      console.warn(`[Cleanup] Error scanning ${dir}:`, err);
    }
  };

  cleanDirectory(rawDir);
  cleanDirectory(convertedDir);

  if (deletedCount > 0) {
    console.log(`[Cleanup] Purged ${deletedCount} temporary file(s) older than ${maxAgeHours} hours.`);
  }
}

export function initCleanupCron() {
  // Run every hour
  cron.schedule('0 * * * *', () => {
    console.log('[Cleanup] Running hourly file cleanup job...');
    cleanupOldFiles(24);
  });
  console.log('[Cleanup] 24-hour auto-cleanup cron initialized.');
}
