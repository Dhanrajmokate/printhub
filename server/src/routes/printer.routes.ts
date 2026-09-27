import { Router, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { prisma } from '../prisma.js';
import { authenticate, AuthenticatedRequest, requireRole } from '../middleware/auth.js';
import { pingPrinterHealth } from '../services/printerRouting.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// 1. GET SHOP PRINTERS & LIVE HEALTH PING
router.get('/', authenticate, requireRole(['SHOP']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const shop = await prisma.shop.findUnique({
      where: { userId: req.user!.userId },
      include: { printers: true }
    });

    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    // Ping each printer's port to get real-time health status
    const printersWithHealth = await Promise.all(
      shop.printers.map(async (p) => {
        const health = await pingPrinterHealth(p.port);
        return {
          id: p.id,
          name: p.name,
          port: p.port,
          type: p.type,
          supportsDuplex: p.supportsDuplex,
          isOnline: p.isOnline && health.isOnline,
          autoConvert: p.autoConvert,
          healthStatus: health
        };
      })
    );

    return res.json({ success: true, printers: printersWithHealth });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch printers' });
  }
});

// 2. PING SPECIFIC PRINTER HEALTH
router.get('/:id/health', authenticate, requireRole(['SHOP']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const printer = await prisma.printer.findUnique({
      where: { id: req.params.id }
    });

    if (!printer) {
      return res.status(404).json({ success: false, message: 'Printer not found' });
    }

    const health = await pingPrinterHealth(printer.port);
    return res.json({ success: true, printerId: printer.id, port: printer.port, health });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Health check failed' });
  }
});

// 3. ADD PRINTER
router.post('/', authenticate, requireRole(['SHOP']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, port, type, supportsDuplex, autoConvert } = req.body;
    const shop = await prisma.shop.findUnique({ where: { userId: req.user!.userId } });

    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    if (!name || !port || !type) {
      return res.status(400).json({ success: false, message: 'Printer name, port, and type (BW/COLOR) are required.' });
    }

    const printer = await prisma.printer.create({
      data: {
        shopId: shop.id,
        name: name.trim(),
        port: parseInt(port, 10),
        type: type === 'COLOR' ? 'COLOR' : 'BW',
        supportsDuplex: supportsDuplex !== undefined ? Boolean(supportsDuplex) : true,
        autoConvert: autoConvert !== undefined ? Boolean(autoConvert) : true,
        isOnline: true
      }
    });

    const health = await pingPrinterHealth(printer.port);

    return res.status(201).json({
      success: true,
      message: 'Printer added successfully',
      printer: { ...printer, healthStatus: health }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to add printer' });
  }
});

// 4. UPDATE PRINTER
router.put('/:id', authenticate, requireRole(['SHOP']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, port, type, supportsDuplex, isOnline, autoConvert } = req.body;

    const printer = await prisma.printer.update({
      where: { id: req.params.id },
      data: {
        name: name ? name.trim() : undefined,
        port: port !== undefined ? parseInt(port, 10) : undefined,
        type: type ? (type === 'COLOR' ? 'COLOR' : 'BW') : undefined,
        supportsDuplex: supportsDuplex !== undefined ? Boolean(supportsDuplex) : undefined,
        isOnline: isOnline !== undefined ? Boolean(isOnline) : undefined,
        autoConvert: autoConvert !== undefined ? Boolean(autoConvert) : undefined
      }
    });

    const health = await pingPrinterHealth(printer.port);

    return res.json({
      success: true,
      message: 'Printer updated successfully',
      printer: { ...printer, healthStatus: health }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to update printer' });
  }
});

// 5. DELETE PRINTER
router.delete('/:id', authenticate, requireRole(['SHOP']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    await prisma.printer.delete({
      where: { id: req.params.id }
    });

    return res.json({ success: true, message: 'Printer removed successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to delete printer' });
  }
});

// 6. DOWNLOAD DESKTOP PRINT AGENT LAUNCHER (.BAT)
router.get('/agent/download', (_req: any, res: Response) => {
  const rootPath = path.resolve(__dirname, '../../../start-printer-agent.bat');
  const publicPath = path.resolve(__dirname, '../../../client/public/start-printer-agent.bat');
  const target = fs.existsSync(rootPath) ? rootPath : publicPath;

  if (fs.existsSync(target)) {
    return res.download(target, 'PrintHub-Desktop-Agent.bat');
  }
  return res.status(404).json({ success: false, message: 'Desktop Agent script not found' });
});

export default router;
