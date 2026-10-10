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
        const isSSE = Boolean(req.headers.accept && req.headers.accept.includes('text/event-stream'));
        const headers = { ...req.headers };
        delete headers.host;
        delete headers['content-length'];

        const response = await axios({
          method: req.method,
          url: target,
          headers,
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

// Helper: Get detailed real-time Windows printer inventory with Online/Offline detection
async function getDetailedSystemPrinters() {
  return new Promise((resolve) => {
    const psCmd = `Get-CimInstance Win32_Printer | Select-Object Name, PortName, DriverName, WorkOffline, PrinterStatus, ExtendedPrinterStatus, DetectedErrorState, Default | ConvertTo-Json -Compress`;
    require('child_process').exec(`powershell.exe -NoProfile -NonInteractive -Command "${psCmd}"`, { timeout: 4000 }, async (err, stdout) => {
      let rawList = [];
      if (!err && stdout && stdout.trim()) {
        try {
          const parsed = JSON.parse(stdout.trim());
          rawList = Array.isArray(parsed) ? parsed : [parsed];
        } catch (e) {}
      }

      if (rawList.length === 0) {
        const ptpPrinters = await ptp.getPrinters().catch(() => []);
        rawList = (ptpPrinters || []).map((p) => ({
          Name: typeof p === 'string' ? p : (p?.name || p?.deviceId || 'Printer'),
          PortName: '',
          DriverName: '',
          WorkOffline: false,
          PrinterStatus: 3
        }));
      }

      const isVirtualPrinter = (name, port, driver) => {
        const lowerName = String(name || '').toLowerCase();
        const lowerPort = String(port || '').toLowerCase();
        const lowerDriver = String(driver || '').toLowerCase();

        if (
          lowerPort === 'portprompt:' ||
          lowerPort === 'nul:' ||
          lowerPort === 'file:' ||
          lowerPort === 'shrfax:' ||
          lowerPort.includes('xpsport')
        ) {
          return true;
        }

        return (
          lowerName.includes('onenote') ||
          lowerName.includes('pdf') ||
          lowerName.includes('xps') ||
          lowerName.includes('fax') ||
          lowerName.includes('solid edge') ||
          lowerName.includes('writer') ||
          lowerName.includes('distiller') ||
          lowerName.includes('virtual') ||
          lowerDriver.includes('pdf') ||
          lowerDriver.includes('onenote') ||
          lowerDriver.includes('xps') ||
          lowerDriver.includes('fax')
        );
      };

      const systemDefaultObj = rawList.find((p) => p.Default === true);
      const defaultName = systemDefaultObj ? systemDefaultObj.Name : '';

      const enriched = rawList.map((p) => {
        const isVirtual = isVirtualPrinter(p.Name, p.PortName, p.DriverName);
        const isOffline = Boolean(
          p.WorkOffline === true ||
          p.PrinterStatus === 7 ||
          p.ExtendedPrinterStatus === 7 ||
          (p.DetectedErrorState && p.DetectedErrorState !== 0)
        );

        return {
          name: p.Name,
          portName: p.PortName,
          driverName: p.DriverName,
          isPhysical: !isVirtual,
          isVirtual: isVirtual,
          isOnline: isVirtual ? true : !isOffline,
          workOffline: Boolean(p.WorkOffline),
          isDefault: Boolean(p.Default)
        };
      });

      const physicalPrinters = enriched.filter((p) => p.isPhysical);
      const onlinePhysicalPrinters = physicalPrinters.filter((p) => p.isOnline);

      resolve({
        success: true,
        printers: enriched,
        defaultPrinter: defaultName,
        hasPhysicalPrinter: onlinePhysicalPrinters.length > 0,
        physicalPrinterCount: physicalPrinters.length,
        onlinePhysicalPrinterCount: onlinePhysicalPrinters.length,
        connectedPhysicalPrinters: onlinePhysicalPrinters.map((p) => p.name)
      });
    });
  });
}

// IPC: Get System Printers
ipcMain.handle('get-system-printers', async () => {
  try {
    const details = await getDetailedSystemPrinters();
    return details;
  } catch (err) {
    return {
      success: false,
      message: err.message,
      printers: [],
      defaultPrinter: '',
      hasPhysicalPrinter: false,
      connectedPhysicalPrinters: []
    };
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

    // Check if provided localPath exists, or check fallback locations
    if (localFilePath && !fs.existsSync(localFilePath)) {
      const altLocal = path.resolve(__dirname, '..', path.basename(localFilePath));
      if (fs.existsSync(altLocal)) {
        localFilePath = altLocal;
      }
    }

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

    // 2. Real-time physical printer validation
    const printerDetails = await getDetailedSystemPrinters();
    const config = loadConfig();

    let targetPrinter = jobData.printerName || (jobData.colorMode === 'COLOR' ? config.colorPrinter : config.bwPrinter);
    if (typeof targetPrinter === 'object' && targetPrinter !== null) {
      targetPrinter = targetPrinter.name || targetPrinter.deviceId || '';
    }

    // Check if target printer is recognized
    let targetObj = targetPrinter
      ? printerDetails.printers.find((p) => p.name.toLowerCase() === targetPrinter.toLowerCase())
      : null;

    // If target is unassigned or is a virtual printer, auto-route to first connected physical printer
    if (!targetPrinter || !targetObj || targetObj.isVirtual) {
      const firstOnlinePhysical = printerDetails.printers.find((p) => p.isPhysical && p.isOnline);
      if (firstOnlinePhysical) {
        targetPrinter = firstOnlinePhysical.name;
        targetObj = firstOnlinePhysical;
        console.log(`[Hardware Spooler] Auto-routed to online physical printer: ${targetPrinter}`);
      }
    }

    // STRICT OFFLINE CHECK: If no physical printer is connected or target printer is offline, REFUSE to print!
    if (!printerDetails.hasPhysicalPrinter && (!targetObj || targetObj.isVirtual)) {
      const noPrinterErr = `Printer is OFFLINE. No physical printer is currently connected to this computer. Please plug in your USB/Wi-Fi printer and turn it on to print.`;
      console.warn(`❌ [Hardware Spooler] ${noPrinterErr}`);
      throw new Error(noPrinterErr);
    }

    if (targetObj && targetObj.isPhysical && !targetObj.isOnline) {
      const offlineErr = `Printer '${targetPrinter}' is OFFLINE or disconnected. Please check the power and USB/Wi-Fi cable and try again.`;
      console.warn(`❌ [Hardware Spooler] ${offlineErr}`);
      throw new Error(offlineErr);
    }

    if (!targetPrinter) {
      throw new Error('No physical printer is available. Please connect a physical printer.');
    }

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
    let dispatchedPrinterName = targetPrinter;

    // 3. Spool to Windows Hardware Printer with robust multi-tier fallback
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

    try {
      await ptp.print(localFilePath, ptpOptions);
      physicalDispatched = true;
      console.log(`✅ [Hardware Spooler] Paper job successfully spooled to ${targetPrinter}!`);
    } catch (spoolErr) {
      console.warn(`[Hardware Spooler] Full specs print failed (${spoolErr.message}). Retrying with safe basic flags...`);
      try {
        await ptp.print(localFilePath, {
          printer: targetPrinter,
          copies: Math.max(1, parseInt(jobData.copies || 1, 10)),
          silent: true
        });
        physicalDispatched = true;
        console.log(`✅ [Hardware Spooler] Paper job spooled via basic print to ${targetPrinter}!`);
      } catch (basicErr) {
        console.warn(`[Hardware Spooler] Basic ptp print failed (${basicErr.message}). Retrying with Windows shell PrintTo...`);
        try {
          const escapedPath = localFilePath.replace(/'/g, "''");
          const escapedPrinter = targetPrinter.replace(/'/g, "''");
          const psCmd = `Start-Process -FilePath '${escapedPath}' -Verb PrintTo -ArgumentList '"${escapedPrinter}"' -PassThru | Wait-Process -Timeout 15`;
          await new Promise((resolve, reject) => {
            require('child_process').exec(`powershell.exe -Command "${psCmd}"`, (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
          physicalDispatched = true;
          console.log(`✅ [Hardware Spooler] Paper job spooled via Windows PrintTo to ${targetPrinter}!`);
        } catch (winErr) {
          console.error(`❌ [Hardware Spooler] All print attempts failed for ${targetPrinter}:`, winErr);
          throw new Error(`Physical print failed on '${targetPrinter}'. Please check if printer is online, has paper, and is connected.`);
        }
      }
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
      message: `Order #${jobData.orderNumber} dispatched to physical printer ${dispatchedPrinterName}`
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
