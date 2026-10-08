const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const ptp = require('pdf-to-printer');

const express = require('express');
const cors = require('cors');

let mainWindow;
let internalServer = null;

// Directory Paths
const userDataDir = app.getPath('userData');
const downloadsDir = path.join(userDataDir, 'downloads');
const printedOutputDir = path.join(userDataDir, 'printed-output');
const configFile = path.join(userDataDir, 'config.json');

if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir, { recursive: true });
if (!fs.existsSync(printedOutputDir)) fs.mkdirSync(printedOutputDir, { recursive: true });

// Default Configuration
const defaultConfig = {
  backendUrl: 'https://printhub-cloud-api.onrender.com',
  autoPrint: false,
  soundAlerts: true,
  bwPrinter: '',
  colorPrinter: '',
  shopToken: '',
  shopUser: null
};

function loadConfig() {
  try {
    if (fs.existsSync(configFile)) {
      const data = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
      return { ...defaultConfig, ...data };
    }
  } catch (err) {
    console.error('Error loading config:', err);
  }
  return { ...defaultConfig };
}

function saveConfig(cfg) {
  try {
    fs.writeFileSync(configFile, JSON.stringify(cfg, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error saving config:', err);
    return false;
  }
}

function startInternalServer(distDir) {
  return new Promise((resolve) => {
    if (internalServer) {
      return resolve(`http://127.0.0.1:${internalServer.address().port}/shop`);
    }

    const internalApp = express();
    internalApp.use(cors());
    internalApp.use(express.json({ limit: '50mb' }));
    internalApp.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Proxy /api requests to configured backendUrl
    internalApp.use('/api', async (req, res) => {
      const cfg = loadConfig();
      const backendBase = (cfg.backendUrl || 'https://printhub-cloud-api.onrender.com').replace(/\/$/, '');
      const target = `${backendBase}${req.originalUrl}`;
      try {
        const isSSE = req.headers.accept?.includes('text/event-stream');
        const response = await axios({
          method: req.method,
          url: target,
          headers: { ...req.headers, host: undefined },
          data: ['POST', 'PUT', 'PATCH'].includes(req.method) ? req.body : undefined,
          responseType: isSSE ? 'stream' : undefined,
          validateStatus: () => true,
          timeout: isSSE ? 0 : 30000
        });
        res.status(response.status).set(response.headers);
        if (response.data && typeof response.data.pipe === 'function') {
          response.data.pipe(res);
        } else {
          res.send(response.data);
        }
      } catch (err) {
        res.status(502).json({
          error: 'Backend Server Unreachable',
          message: err.message,
          backendUrl: cfg.backendUrl
        });
      }
    });

    // Proxy /uploads requests to configured backendUrl
    internalApp.use('/uploads', async (req, res) => {
      const cfg = loadConfig();
      const backendBase = (cfg.backendUrl || 'https://printhub-cloud-api.onrender.com').replace(/\/$/, '');
      const target = `${backendBase}${req.originalUrl}`;
      try {
        const response = await axios({
          method: req.method,
          url: target,
          responseType: 'stream',
          validateStatus: () => true
        });
        res.status(response.status).set(response.headers);
        response.data.pipe(res);
      } catch (err) {
        res.status(404).send('Upload file not found');
      }
    });

    // Serve bundled client React app
    internalApp.use(express.static(distDir));

    // Single Page App fallback for React Router (compatible with Express 5)
    internalApp.use((req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });

    internalServer = internalApp.listen(0, '127.0.0.1', () => {
      const port = internalServer.address().port;
      console.log(`[Embedded Web Server] Serving shop client on http://127.0.0.1:${port}`);
      resolve(`http://127.0.0.1:${port}/shop`);
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 880,
    minWidth: 1024,
    minHeight: 700,
    title: 'PrintHub Shop Partner — Desktop Print Manager',
    backgroundColor: '#0f172a',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Pre-warm the backend immediately in the background so it's awake
  try {
    const cfg = loadConfig();
    const backendBase = (cfg.backendUrl || 'https://printhub-cloud-api.onrender.com').replace(/\/$/, '');
    axios.get(`${backendBase}/api/health`, { timeout: 15000 }).catch(() => {});
  } catch (e) {}

  // Resolve client-dist folder across dev, unpacked resources, and packaged modes
  const unpackedClientDist = process.resourcesPath
    ? path.join(process.resourcesPath, 'app.asar.unpacked', 'client-dist')
    : '';
  const localClientDist = path.join(__dirname, 'client-dist');
  const siblingClientDist = path.join(__dirname, '..', 'client', 'dist');

  const clientDistFolder = (unpackedClientDist && fs.existsSync(path.join(unpackedClientDist, 'index.html')))
    ? unpackedClientDist
    : fs.existsSync(path.join(localClientDist, 'index.html'))
    ? localClientDist
    : siblingClientDist;

  // In packaged mode, start embedded server instantly without waiting for localhost:8080!
  if (app.isPackaged) {
    startInternalServer(clientDistFolder)
      .then((embeddedUrl) => {
        mainWindow.loadURL(embeddedUrl);
      })
      .catch((serverErr) => {
        console.error('[Desktop] Failed to start embedded server:', serverErr);
        mainWindow.loadFile(path.join(clientDistFolder, 'index.html'));
      });
  } else {
    // In dev mode, check if Vite dev server is running on 8080
    const targetUrl = process.env.VITE_DEV_URL || 'http://localhost:8080/shop';
    axios.get('http://localhost:8080', { timeout: 800 })
      .then(() => {
        console.log('[Desktop] Connected to live web client at http://localhost:8080');
        mainWindow.loadURL(targetUrl);
      })
      .catch(async () => {
        console.log('[Desktop] Live web dev server not detected. Starting embedded static server...');
        try {
          const embeddedUrl = await startInternalServer(clientDistFolder);
          mainWindow.loadURL(embeddedUrl);
        } catch (serverErr) {
          console.error('[Desktop] Failed to start embedded server:', serverErr);
          mainWindow.loadFile(path.join(clientDistFolder, 'index.html'));
        }
      });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC: Get System Printers
ipcMain.handle('get-system-printers', async () => {
  try {
    const printers = await ptp.getPrinters();
    const defaultPrinter = await ptp.getDefaultPrinter().catch(() => null);

    const isVirtual = (name) => {
      const lower = String(name || '').toLowerCase();
      return (
        lower.includes('onenote') ||
        lower.includes('pdf') ||
        lower.includes('xps') ||
        lower.includes('fax') ||
        lower.includes('solid edge') ||
        lower.includes('writer') ||
        lower.includes('distiller') ||
        lower.includes('virtual')
      );
    };

    const defaultPrinterName = typeof defaultPrinter === 'object' && defaultPrinter !== null
      ? (defaultPrinter.name || defaultPrinter.deviceId || '')
      : (typeof defaultPrinter === 'string' ? defaultPrinter : '');

    const normalizedPrinters = (printers || []).map((p) => {
      const pName = typeof p === 'string' ? p : (p?.name || p?.deviceId || 'Unknown Printer');
      return {
        ...(typeof p === 'object' && p !== null ? p : {}),
        name: pName,
        isPhysical: !isVirtual(pName)
      };
    });

    return {
      success: true,
      defaultPrinter: defaultPrinterName,
      printers: normalizedPrinters
    };
  } catch (err) {
    return { success: false, message: err.message, printers: [], defaultPrinter: '' };
  }
});

// IPC: Print Job
ipcMain.handle('print-job', async (event, jobData) => {
  console.log(`\n======================================================`);
  console.log(`🖨️ [Desktop Spooler] RECEIVED PRINT JOB: #${jobData.orderNumber || 'N/A'}`);
  console.log(`📄 File: ${jobData.originalFileName} | Copies: ${jobData.copies || 1}`);
  console.log(`⚙️ Specs: ${jobData.colorMode} | Duplex: ${jobData.duplexMode} | Size: ${jobData.paperSize}`);
  console.log(`======================================================\n`);

  try {
    let localFilePath = jobData.localPath;

    // 1. Download or decode document if URL provided
    if (jobData.fileUrl && (!localFilePath || !fs.existsSync(localFilePath))) {
      const safeName = `${Date.now()}_${(jobData.originalFileName || 'document.pdf').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      localFilePath = path.join(downloadsDir, safeName);

      if (jobData.fileUrl.startsWith('data:')) {
        const base64Index = jobData.fileUrl.indexOf(';base64,');
        const base64Str = base64Index !== -1 ? jobData.fileUrl.substring(base64Index + 8) : jobData.fileUrl;
        fs.writeFileSync(localFilePath, Buffer.from(base64Str, 'base64'));
      } else {
        const response = await axios({
          url: jobData.fileUrl,
          method: 'GET',
          responseType: 'arraybuffer',
          timeout: 30000
        });

        fs.writeFileSync(localFilePath, Buffer.from(response.data));
      }
    }

    if (!localFilePath || !fs.existsSync(localFilePath)) {
      throw new Error('Document file could not be located or downloaded.');
    }

    // 2. Resolve printer settings & attributes
    const config = loadConfig();
    const systemDefault = await ptp.getDefaultPrinter().catch(() => null);
    const targetPrinter = jobData.printerName || (jobData.colorMode === 'COLOR' ? config.colorPrinter : config.bwPrinter) || systemDefault;

    const finalSide = jobData.duplexMode === 'DUPLEX_SHORT'
      ? 'duplexshort'
      : (jobData.duplexMode === 'DUPLEX_LONG' || jobData.duplexMode === 'DUPLEX')
      ? 'duplexlong'
      : 'simplex';

    const finalSubset = jobData.pageSubset === 'ODD' ? 'odd' : jobData.pageSubset === 'EVEN' ? 'even' : undefined;
    const finalScale = jobData.scaling?.toLowerCase() === 'shrink'
      ? 'shrink'
      : jobData.scaling?.toLowerCase() === 'actual'
      ? 'noscale'
      : 'fit';

    const finalOrientation = jobData.orientation?.toLowerCase() === 'landscape'
      ? 'landscape'
      : jobData.orientation?.toLowerCase() === 'portrait'
      ? 'portrait'
      : undefined;

    let physicalDispatched = false;
    let dispatchedPrinterName = targetPrinter || 'Default';

    // 3. Spool to Windows Hardware Printer
    if (targetPrinter) {
      console.log(`[Hardware Spooler] Dispatching to physical printer: ${targetPrinter}...`);

      const ptpOptions = {
        printer: targetPrinter,
        copies: Math.max(1, parseInt(jobData.copies || 1, 10)),
        side: finalSide,
        subset: finalSubset,
        scale: finalScale,
        orientation: finalOrientation,
        paperSize: jobData.paperSize || 'A4',
        pages: jobData.pageRange && jobData.pageRange !== 'ALL' ? jobData.pageRange : undefined,
        monochrome: jobData.colorMode === 'BW',
        silent: true,
        printDialog: false
      };

      await ptp.print(localFilePath, ptpOptions);
      physicalDispatched = true;
      console.log(`✅ [Hardware Spooler] Paper job successfully spooled to ${targetPrinter}!`);
    } else {
      console.log(`ℹ️ [Simulator Spooler] No physical printer assigned. Saving high-fidelity proof.`);
    }

    // 4. Save local audit receipt
    const proofFile = path.join(printedOutputDir, `${Date.now()}_${jobData.originalFileName || 'document.pdf'}`);
    fs.copyFileSync(localFilePath, proofFile);
    const receiptFile = `${proofFile}.receipt.json`;
    fs.writeFileSync(
      receiptFile,
      JSON.stringify(
        {
          orderNumber: jobData.orderNumber,
          originalFileName: jobData.originalFileName,
          colorMode: jobData.colorMode,
          duplexMode: jobData.duplexMode,
          side: finalSide,
          paperSize: jobData.paperSize,
          copies: jobData.copies,
          pageSubset: jobData.pageSubset || 'ALL',
          scaling: jobData.scaling,
          physicalDispatched,
          printerName: dispatchedPrinterName,
          printedAt: new Date().toISOString()
        },
        null,
        2
      )
    );

    return {
      success: true,
      physicalDispatched,
      printerName: dispatchedPrinterName,
      message: physicalDispatched
        ? `Order #${jobData.orderNumber} dispatched to ${dispatchedPrinterName}`
        : `Order #${jobData.orderNumber} spooled and proof recorded`
    };
  } catch (err) {
    console.error('Print Error:', err);
    return {
      success: false,
      message: err.message || 'Hardware print dispatch failed'
    };
  }
});

// IPC: Config Handlers
ipcMain.handle('get-config', () => loadConfig());
ipcMain.handle('save-config', (event, cfg) => {
  saveConfig(cfg);
  return { success: true };
});

// IPC: Reload Window (e.g. after changing server URL)
ipcMain.handle('reload-app', () => {
  if (mainWindow) mainWindow.reload();
  return { success: true };
});

// IPC: Open Proof Folder
ipcMain.handle('open-proof-folder', () => {
  shell.openPath(printedOutputDir);
});

app.on('will-quit', () => {
  if (internalServer) {
    internalServer.close();
  }
});
