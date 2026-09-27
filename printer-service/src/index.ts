import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ptp = require('pdf-to-printer');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const printedOutputDir = path.resolve(__dirname, '../printed-output');
if (!fs.existsSync(printedOutputDir)) {
  fs.mkdirSync(printedOutputDir, { recursive: true });
}

interface PrintJobRecord {
  jobId: string;
  orderNumber: string;
  originalFileName: string;
  colorMode: string;
  duplexMode: string;
  orientation: string;
  paperSize: string;
  copies: number;
  printedAt: string;
  outputPath: string;
  status: 'COMPLETED' | 'FAILED';
  physicalDispatched?: boolean;
  physicalPrinter?: string;
}

function createPrinterInstance(port: number, printerName: string, printerType: 'BW' | 'COLOR') {
  const app = express();
  let isOnline = true;
  const jobHistory: PrintJobRecord[] = [];

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  // Ensure output directory for this printer type
  const targetDir = path.join(printedOutputDir, printerType.toLowerCase());
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // 1. HEALTH CHECK (Returns 503 if offline, 200 if online)
  app.get('/health', (_req: Request, res: Response) => {
    if (!isOnline) {
      return res.status(503).json({
        status: 'offline',
        statusCode: 503,
        printer: printerName,
        type: printerType,
        port,
        message: 'Printer simulator is offline'
      });
    }

    return res.json({
      status: 'online',
      statusCode: 200,
      printer: printerName,
      type: printerType,
      port,
      paperStatus: 'Ready (Tray 1: 500 sheets)',
      tonerLevel: printerType === 'COLOR'
        ? 'Cyan: 92%, Magenta: 88%, Yellow: 95%, Black: 90%'
        : 'Black: 94%',
      spoolerQueue: jobHistory.filter((j) => j.status === 'COMPLETED').length,
      timestamp: new Date().toISOString()
    });
  });

  // 2. LIST PHYSICAL PRINTERS DETECTED ON WINDOWS/OS
  app.get('/system-printers', async (_req: Request, res: Response) => {
    try {
      const printers = await ptp.getPrinters();
      const defaultPrinter = await ptp.getDefaultPrinter().catch(() => null);
      return res.json({
        success: true,
        defaultPrinter,
        printers
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // 3. RECEIVE & SPOOL PRINT JOB
  app.post('/print', async (req: Request, res: Response) => {
    if (!isOnline) {
      return res.status(503).json({
        success: false,
        message: `Printer ${printerName} on port ${port} is currently offline (503).`
      });
    }

    const {
      jobId,
      orderNumber,
      filePath,
      originalFileName,
      copies,
      colorMode,
      duplexMode,
      orientation,
      paperSize,
      quality,
      pageRange
    } = req.body;

    console.log(`\n======================================================`);
    console.log(`🖨️ [Printer Port ${port} - ${printerName}] RECEIVED PRINT JOB`);
    console.log(`📦 Order: ${orderNumber} | File: ${originalFileName}`);
    console.log(`⚙️ Specs: ${colorMode} | ${duplexMode} | Copies: ${copies} | Size: ${paperSize} | Orientation: ${orientation}`);
    console.log(`📄 Range: ${pageRange || 'ALL'} | Quality: ${quality}`);
    console.log(`======================================================\n`);

    try {
      const safeFileName = `${Date.now()}_${(originalFileName || 'doc.pdf').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const destinationPath = path.join(targetDir, safeFileName);

      // Save local proof copy
      if (filePath && fs.existsSync(filePath)) {
        fs.copyFileSync(filePath, destinationPath);
      } else {
        const mockContent = `PRINTED OUTPUT RECEIPT\nPrinter: ${printerName}\nPort: ${port}\nJob: ${jobId}\nOrder: ${orderNumber}\nFile: ${originalFileName}\nPrinted at: ${new Date().toISOString()}\n`;
        fs.writeFileSync(destinationPath, mockContent, 'utf-8');
      }

      // Hardware Physical Spooling Bridge
      let physicalDispatched = false;
      let physicalPrinterName = 'None';

      try {
        if (filePath && fs.existsSync(filePath)) {
          const sysPrinters = await ptp.getPrinters();
          const defaultPrinter = await ptp.getDefaultPrinter().catch(() => null);

          // Helper to distinguish physical printers from virtual software drivers
          const isVirtual = (name: string) => {
            const lower = name.toLowerCase();
            return (
              lower.includes('onenote') ||
              lower.includes('pdf') ||
              lower.includes('xps') ||
              lower.includes('fax') ||
              lower.includes('solid edge') ||
              lower.includes('writer') ||
              lower.includes('distiller') ||
              lower.includes('snagit') ||
              lower.includes('virtual') ||
              lower.includes('postscript')
            );
          };

          // 1. Try matching by configured printer name (if not a generic virtual driver)
          let targetPrinter = sysPrinters.find((p: any) =>
            !isVirtual(p.name) &&
            (p.name.toLowerCase().includes(printerName.toLowerCase()) ||
            (printerType === 'COLOR' && p.name.toLowerCase().includes('color')))
          );

          // 2. Fallback to Windows default printer if it is physical
          if (!targetPrinter && defaultPrinter && !isVirtual(defaultPrinter.name)) {
            targetPrinter = defaultPrinter;
          }

          // 3. Fallback to ANY physical hardware printer connected to this PC
          if (!targetPrinter) {
            targetPrinter = sysPrinters.find((p: any) => !isVirtual(p.name));
          }

          // If a real physical printer exists
          if (targetPrinter && !isVirtual(targetPrinter.name)) {
            physicalPrinterName = targetPrinter.name;
            console.log(`🖨️ [Hardware Spooler] Dispatching directly to physical printer: ${targetPrinter.name}...`);

            // Wrap with a 4-second timeout so a busy or unresponsive driver never blocks the server
            const printPromise = ptp.print(filePath, {
              printer: targetPrinter.name,
              copies: copies || 1,
              orientation: orientation?.toLowerCase() === 'landscape' ? 'landscape' : 'portrait',
              paperSize: paperSize || 'A4',
              pages: pageRange && pageRange !== 'ALL' ? pageRange : undefined
            });

            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Printer driver spool timeout (4s limit)')), 4000)
            );

            await Promise.race([printPromise, timeoutPromise]);

            physicalDispatched = true;
            console.log(`✅ [Hardware Spooler] Physical paper job spooled to ${targetPrinter.name}!`);
          } else {
            console.log(`ℹ️ [Simulator Spooler] No physical printer connected. High-fidelity proof saved to ${destinationPath}`);
          }
        }
      } catch (hardwareErr: any) {
        console.warn(`[Hardware Spooler Note] ${hardwareErr.message}. Proof safely recorded.`);
      }

      const record: PrintJobRecord = {
        jobId: jobId || `job_${Date.now()}`,
        orderNumber: orderNumber || 'N/A',
        originalFileName: originalFileName || 'document.pdf',
        colorMode: colorMode || printerType,
        duplexMode: duplexMode || 'SINGLE',
        orientation: orientation || 'PORTRAIT',
        paperSize: paperSize || 'A4',
        copies: copies || 1,
        printedAt: new Date().toISOString(),
        outputPath: destinationPath,
        status: 'COMPLETED',
        physicalDispatched,
        physicalPrinter: physicalPrinterName
      };

      jobHistory.unshift(record);

      return res.json({
        success: true,
        message: physicalDispatched
          ? `Print job dispatched to physical printer: ${physicalPrinterName}`
          : `Print job successfully spooled on ${printerName}`,
        printer: printerName,
        physicalDispatched,
        physicalPrinter: physicalPrinterName,
        port,
        outputFile: safeFileName,
        outputPath: destinationPath,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      console.error(`[Printer Port ${port}] Spool error:`, err);
      return res.status(500).json({
        success: false,
        message: `Failed to print: ${err.message}`
      });
    }
  });

  // 4. GET PAST PRINT JOBS
  app.get('/jobs', (_req: Request, res: Response) => {
    return res.json({
      printer: printerName,
      port,
      type: printerType,
      isOnline,
      totalJobs: jobHistory.length,
      jobs: jobHistory
    });
  });

  // 5. TOGGLE ONLINE / OFFLINE (For testing error states & 503 fallback)
  app.post('/toggle-status', (_req: Request, res: Response) => {
    isOnline = !isOnline;
    console.log(`[Printer Port ${port} - ${printerName}] Status toggled to: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
    return res.json({
      success: true,
      printer: printerName,
      port,
      isOnline,
      message: `Printer is now ${isOnline ? 'ONLINE' : 'OFFLINE'}`
    });
  });

  const server = app.listen(port, () => {
    console.log(`🖨️ [Printer Service] ${printerName} (${printerType}) listening on port ${port}`);
  });

  return { app, server };
}

// Instantiate printer fleet instances:
// Ports 8001-8005 are ready out-of-the-box for any multi-printer setup:
const bwPrinter = createPrinterInstance(8001, 'PrintHub High-Speed B&W Laser 1', 'BW');
const colorPrinter = createPrinterInstance(8002, 'PrintHub Pro Studio Color Jet 1', 'COLOR');
const bwPrinter2 = createPrinterInstance(8003, 'PrintHub Heavy-Duty B&W Duplex 2', 'BW');
const colorPrinter2 = createPrinterInstance(8004, 'PrintHub Secondary Color Jet 2', 'COLOR');
const auxPrinter = createPrinterInstance(8005, 'PrintHub Auxiliary Plotter / Special 3', 'BW');

export { bwPrinter, colorPrinter, bwPrinter2, colorPrinter2, auxPrinter };
