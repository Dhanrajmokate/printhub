const { app, BrowserWindow, ipcMain, shell, Notification } = require('electron');
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

    // Use stable port 8345 so localStorage and login state persist across app restarts
    const preferredPort = 8345;
    const serverInstance = internalApp.listen(preferredPort, '127.0.0.1')
      .on('listening', () => {
        internalServer = serverInstance;
        console.log(`[Embedded Web Server] Serving shop client on http://127.0.0.1:${preferredPort}`);
        resolve(`http://127.0.0.1:${preferredPort}/shop`);
      })
      .on('error', (err) => {
        console.warn(`[Embedded Web Server] Preferred port ${preferredPort} in use or failed (${err.code}). Falling back to dynamic port...`);
        const fallbackServer = internalApp.listen(0, '127.0.0.1', () => {
          internalServer = fallbackServer;
          const fallbackPort = fallbackServer.address().port;
          console.log(`[Embedded Web Server] Serving shop client on fallback http://127.0.0.1:${fallbackPort}`);
          resolve(`http://127.0.0.1:${fallbackPort}/shop`);
        });
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

// Printer Cache & Pacing to avoid PowerShell / WMI process storms
let cachedPrintersResult = null;
let lastPrinterQueryTime = 0;
const PRINTER_CACHE_TTL_MS = 3500;
let lastPrintDispatchTime = 0;

// Helper: Convert Word documents (.docx, .doc) to PDF
async function convertWordToPdf(inputFilePath, outputPdfPath, options = {}) {
  // Strategy 1: Native Windows MS Word COM Automation (100% fidelity, exact fonts, tables, styles)
  let tempDocxCopy = null;
  try {
    let resolvedDocx = inputFilePath;
    const curExt = path.extname(inputFilePath).toLowerCase();
    if (!['.docx', '.doc'].includes(curExt)) {
      const targetExt = ['.docx', '.doc'].includes(path.extname(options.originalFileName || '').toLowerCase())
        ? path.extname(options.originalFileName)
        : '.docx';
      tempDocxCopy = path.join(downloadsDir, `temp_convert_${Date.now()}${targetExt}`);
      fs.copyFileSync(inputFilePath, tempDocxCopy);
      resolvedDocx = tempDocxCopy;
    }

    const escapedDocx = resolvedDocx.replace(/'/g, "''");
    const escapedPdf = outputPdfPath.replace(/'/g, "''");
    const psCmd = `& {
      $word = $null
      try {
        $word = New-Object -ComObject Word.Application
        $word.Visible = $false
        $word.DisplayAlerts = 0
        $doc = $word.Documents.Open('${escapedDocx}', $false, $true, $false)
        $doc.ExportAsFixedFormat('${escapedPdf}', 17)
        $doc.Close(0)
        Write-Host "DOCX_CONVERT_SUCCESS"
      } catch {
        Write-Host "DOCX_CONVERT_ERROR: $($_.Exception.Message)"
      } finally {
        if ($word) {
          $word.Quit(0)
          [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
        }
        [System.GC]::Collect()
        [System.GC]::WaitForPendingFinalizers()
      }
    }`;

    await new Promise((resolve, reject) => {
      require('child_process').execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psCmd], { timeout: 30000 }, (err, stdout) => {
        if (!err && stdout && stdout.includes('DOCX_CONVERT_SUCCESS') && fs.existsSync(outputPdfPath)) {
          resolve();
        } else {
          reject(new Error(stdout || (err ? err.message : 'Word COM conversion failed')));
        }
      });
    });

    console.log(`✅ [Word Converter] Successfully converted DOCX to native PDF via MS Word COM (${fs.statSync(outputPdfPath).size} bytes)`);
    return outputPdfPath;
  } catch (wordErr) {
    console.warn(`[Word Converter] Word COM unavailable (${wordErr.message}). Falling back to JavaScript mammoth HTML renderer...`);
  } finally {
    if (tempDocxCopy && fs.existsSync(tempDocxCopy)) {
      try { fs.unlinkSync(tempDocxCopy); } catch (e) {}
    }
  }

  // Strategy 2: Pure JavaScript Mammoth.js + Electron Chromium printToPDF fallback
  try {
    const mammoth = require('mammoth');
    const result = await mammoth.convertToHtml({ path: inputFilePath });
    const htmlBody = result.value;

    const paperSize = options.paperSize || 'A4';
    const orientation = options.orientation?.toLowerCase() === 'landscape' ? 'landscape' : 'portrait';
    const isLandscape = orientation === 'landscape';

    const fullHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page {
    size: ${paperSize} ${orientation};
    margin: 20mm 15mm;
  }
  body {
    font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.5;
    color: #1a1a1a;
    margin: 0;
    padding: 0;
  }
  p { margin: 0 0 10pt; }
  h1, h2, h3, h4, h5, h6 { color: #0f172a; margin-top: 18pt; margin-bottom: 6pt; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12pt; }
  th, td { border: 1px solid #cbd5e1; padding: 6pt 8pt; text-align: left; }
  img { max-width: 100%; height: auto; }
</style>
</head>
<body>${htmlBody}</body>
</html>`;

    const win = new BrowserWindow({
      show: false,
      width: isLandscape ? 1123 : 794,
      height: isLandscape ? 794 : 1123,
      webPreferences: { offscreen: true }
    });

    try {
      await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(fullHtml)}`);
      await new Promise((r) => setTimeout(r, 600));

      const pdfBuf = await win.webContents.printToPDF({
        printBackground: true,
        pageSize: paperSize === 'A3' ? 'A3' : paperSize === 'Legal' ? 'Legal' : paperSize === 'Letter' ? 'Letter' : 'A4',
        landscape: isLandscape,
        margins: { marginType: 'none' }
      });

      fs.writeFileSync(outputPdfPath, pdfBuf);
      console.log(`✅ [Word Converter] Successfully converted DOCX via Mammoth fallback (${pdfBuf.length} bytes)`);
      return outputPdfPath;
    } finally {
      if (!win.isDestroyed()) win.destroy();
    }
  } catch (mammothErr) {
    console.error(`❌ [Word Converter] All DOCX conversion methods failed:`, mammothErr);
    throw new Error(`Failed to convert Word document (.docx) to PDF: ${mammothErr.message}`);
  }
}

// Helper: Convert non-PDF documents (Word DOCX, JPEG, JPG, PNG, WEBP, TXT) to high-fidelity PDF via MS Word COM or Electron offscreen Chromium
async function convertDocumentToPdf(inputFilePath, originalFileName, options = {}) {
  const ext = path.extname(originalFileName || inputFilePath).toLowerCase();
  if (ext === '.pdf') {
    return inputFilePath; // Already a PDF
  }

  const paperSize = options.paperSize || 'A4';
  const orientation = options.orientation?.toLowerCase() === 'landscape' ? 'landscape' : 'portrait';
  const isLandscape = orientation === 'landscape';

  const safePdfName = `converted_${Date.now()}_${path.basename(inputFilePath, ext)}.pdf`;
  const outputPdfPath = path.join(downloadsDir, safePdfName);

  console.log(`[Document Converter] Converting non-PDF file (${ext}) to print-ready PDF: ${inputFilePath} -> ${outputPdfPath}`);

  // Handle Word Documents (.docx, .doc)
  if (['.docx', '.doc'].includes(ext)) {
    return await convertWordToPdf(inputFilePath, outputPdfPath, { ...options, originalFileName });
  }

  const win = new BrowserWindow({
    show: false,
    width: isLandscape ? 1123 : 794,
    height: isLandscape ? 794 : 1123,
    webPreferences: {
      offscreen: true,
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  try {
    let contentHtml = '';

    if (['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif'].includes(ext)) {
      const imgBuffer = fs.readFileSync(inputFilePath);
      const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
      const dataUri = `data:${mime};base64,${imgBuffer.toString('base64')}`;

      contentHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page {
    size: ${paperSize} ${orientation};
    margin: 0;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    width: 100vw;
    height: 100vh;
    background: #ffffff;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
  }
  img {
    max-width: 98vw;
    max-height: 98vh;
    width: auto;
    height: auto;
    object-fit: contain;
    display: block;
    margin: auto;
  }
</style>
</head>
<body>
  <img src="${dataUri}" />
</body>
</html>`;
    } else if (ext === '.txt') {
      const textContent = fs.readFileSync(inputFilePath, 'utf-8');
      const escaped = textContent
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      contentHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page {
    size: ${paperSize} ${orientation};
    margin: 15mm;
  }
  body {
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 11pt;
    line-height: 1.45;
    white-space: pre-wrap;
    word-break: break-word;
    color: #111;
    margin: 0;
    padding: 0;
  }
</style>
</head>
<body>${escaped}</body>
</html>`;
    } else {
      contentHtml = `<!DOCTYPE html><html><body><p>Document: ${originalFileName}</p></body></html>`;
    }

    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(contentHtml)}`);
    // Wait for image layout & rendering
    await new Promise((r) => setTimeout(r, 450));

    const validPageSizes = ['A3', 'A4', 'A5', 'Legal', 'Letter', 'Tabloid'];
    const selectedPageSize = validPageSizes.includes(paperSize) ? paperSize : 'A4';

    const pdfBuffer = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: selectedPageSize,
      landscape: isLandscape,
      margins: { marginType: 'none' }
    });

    fs.writeFileSync(outputPdfPath, pdfBuffer);
    console.log(`✅ [Document Converter] Successfully created print-ready PDF (${pdfBuffer.length} bytes)`);
    return outputPdfPath;
  } catch (convErr) {
    console.error(`❌ [Document Converter] Conversion to PDF failed:`, convErr);
    return inputFilePath;
  } finally {
    if (!win.isDestroyed()) {
      win.destroy();
    }
  }
}

// Helper: Get detailed real-time Windows printer inventory with true physical hardware detection
async function getDetailedSystemPrinters(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedPrintersResult && (now - lastPrinterQueryTime) < PRINTER_CACHE_TTL_MS) {
    return cachedPrintersResult;
  }

  return new Promise((resolve) => {
    const psCmd = `& {
      $p = Get-CimInstance Win32_Printer | Select-Object Name, PortName, DriverName, WorkOffline, PrinterStatus, ExtendedPrinterStatus, DetectedErrorState, Default;
      $u = Get-CimInstance Win32_PnPEntity | Where-Object { ($_.PNPClass -eq 'Printer' -or $_.Service -eq 'usbprint' -or $_.DeviceID -like '*USBPRINT*') -and $_.Status -eq 'OK' } | Select-Object Name, DeviceID;
      $c = Get-CimInstance Win32_PrinterConfiguration | Select-Object Name, Duplex;
      [PSCustomObject]@{ Printers = @($p); UsbPrinters = @($u); Configs = @($c) } | ConvertTo-Json -Depth 3 -Compress
    }`;

    require('child_process').execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psCmd], { timeout: 5000 }, async (err, stdout) => {
      let rawPrinters = [];
      let activeUsbPrinters = [];
      let printerConfigs = [];

      if (!err && stdout && stdout.trim()) {
        try {
          const parsed = JSON.parse(stdout.trim());
          rawPrinters = Array.isArray(parsed.Printers) ? parsed.Printers : (parsed.Printers ? [parsed.Printers] : []);
          activeUsbPrinters = Array.isArray(parsed.UsbPrinters) ? parsed.UsbPrinters : (parsed.UsbPrinters ? [parsed.UsbPrinters] : []);
          printerConfigs = Array.isArray(parsed.Configs) ? parsed.Configs : (parsed.Configs ? [parsed.Configs] : []);
        } catch (e) {}
      }

      const isVirtualPrinter = (name, port, driver) => {
        const lowerName = String(name || '').toLowerCase();
        const lowerPort = String(port || '').toLowerCase();
        const lowerDriver = String(driver || '').toLowerCase();

        // 1. Virtual, software, or legacy ports that do NOT represent active physical printers
        if (
          !lowerPort ||
          lowerPort === 'portprompt:' ||
          lowerPort === 'nul:' ||
          lowerPort === 'file:' ||
          lowerPort === 'shrfax:' ||
          lowerPort.includes('xpsport') ||
          lowerPort.includes('pdf') ||
          lowerPort.startsWith('lpt') || // Legacy parallel ports (LPT1:, LPT2:, etc.)
          lowerPort.startsWith('com')    // Legacy serial ports (COM1:, COM2:, etc.)
        ) {
          return true;
        }

        // 2. Virtual keywords in printer name or driver
        const virtualKeywords = [
          'onenote', 'pdf', 'xps', 'fax', 'solid edge', 'writer',
          'distiller', 'virtual', 'printhub', 'dummy', 'test', 'cutepdf',
          'foxit', 'nitro', 'dopdf', 'bullzip', 'snagit', 'image', 'scan',
          'docu', 'send to'
        ];

        if (virtualKeywords.some((kw) => lowerName.includes(kw) || lowerDriver.includes(kw))) {
          return true;
        }

        // 3. Must be connected over recognized modern physical printer interface
        const isPhysicalPort =
          lowerPort.startsWith('usb') ||
          lowerPort.startsWith('wsd') ||
          lowerPort.startsWith('ip_') ||
          lowerPort.startsWith('tcp_') ||
          /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(lowerPort) ||
          lowerPort.startsWith('http://') ||
          lowerPort.startsWith('https://') ||
          lowerPort.startsWith('ipp://') ||
          lowerPort.startsWith('bth');

        return !isPhysicalPort;
      };

      const systemDefaultObj = rawPrinters.find((p) => p.Default === true);
      const defaultName = systemDefaultObj ? systemDefaultObj.Name : '';

      const enriched = rawPrinters.map((p) => {
        const isVirtual = isVirtualPrinter(p.Name, p.PortName, p.DriverName);
        const lowerPort = String(p.PortName || '').toLowerCase();

        // Check if Windows explicitly marks it offline.
        // NOTE: PrinterStatus 3 (Idle), 4 (Printing), 1/2 (Normal/Other), 5 (Warming up) are ALL online!
        // ONLY PrinterStatus 7 is PRINTER_STATUS_OFFLINE.
        // We intentionally do NOT check DetectedErrorState !== 0 because active ink-tank/GDI printers report non-zero codes for low ink warnings or during active printing.
        const isMarkedOffline = Boolean(
          p.WorkOffline === true ||
          p.PrinterStatus === 7 ||
          p.ExtendedPrinterStatus === 7
        );

        // For USB printers, also require that an active USB printer hardware device is plugged in!
        let hasHardwareConnection = true;
        if (!isVirtual && lowerPort.startsWith('usb')) {
          hasHardwareConnection = activeUsbPrinters.length > 0;
        }

        const isOnline = !isVirtual && !isMarkedOffline && hasHardwareConnection;

        // Check hardware duplex capability
        const cfgMatch = printerConfigs.find((c) => c.Name && c.Name.toLowerCase() === (p.Name || '').toLowerCase());
        const supportsHardwareDuplex = cfgMatch ? Boolean(cfgMatch.Duplex) : false;

        return {
          name: p.Name,
          portName: p.PortName,
          driverName: p.DriverName,
          isPhysical: !isVirtual,
          isVirtual: isVirtual,
          isOnline: isOnline,
          workOffline: Boolean(p.WorkOffline),
          isDefault: Boolean(p.Default),
          supportsDuplex: supportsHardwareDuplex
        };
      });

      const physicalPrinters = enriched.filter((p) => p.isPhysical);
      const onlinePhysicalPrinters = physicalPrinters.filter((p) => p.isOnline);

      const result = {
        success: true,
        printers: enriched,
        defaultPrinter: defaultName,
        hasPhysicalPrinter: onlinePhysicalPrinters.length > 0,
        physicalPrinterCount: physicalPrinters.length,
        onlinePhysicalPrinterCount: onlinePhysicalPrinters.length,
        connectedPhysicalPrinters: onlinePhysicalPrinters.map((p) => p.name)
      };

      cachedPrintersResult = result;
      lastPrinterQueryTime = Date.now();
      resolve(result);
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
        let downloadUrl = jobData.fileUrl;
        if (downloadUrl.startsWith('/')) {
          const cfg = loadConfig();
          const backendBase = (cfg.backendUrl || 'https://printhub-cloud-api.onrender.com').replace(/\/$/, '');
          downloadUrl = `${backendBase}${downloadUrl}`;
        }
        console.log(`[Desktop Spooler] Fetching print document from: ${downloadUrl}`);
        const response = await axios({
          url: downloadUrl,
          method: 'GET',
          responseType: 'arraybuffer',
          timeout: 45000
        });

        fs.writeFileSync(localFilePath, Buffer.from(response.data));
        console.log(`[Desktop Spooler] Document downloaded successfully (${response.data.length} bytes) -> ${localFilePath}`);
      }
    }

    if (!localFilePath || !fs.existsSync(localFilePath)) {
      throw new Error('Document file could not be located or downloaded.');
    }

    // Convert images / non-PDFs to PDF using Electron offscreen Chromium so SumatraPDF prints cleanly without blank pages
    const printablePdfPath = await convertDocumentToPdf(localFilePath, jobData.originalFileName, {
      paperSize: jobData.paperSize,
      orientation: jobData.orientation
    });

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

    // Duplex check: if target printer does not have automatic duplex hardware, fallback to simplex
    let finalSide = jobData.duplexMode === 'DUPLEX_SHORT'
      ? 'duplexshort'
      : (jobData.duplexMode === 'DUPLEX_LONG' || jobData.duplexMode === 'DUPLEX')
      ? 'duplexlong'
      : 'simplex';

    if (finalSide !== 'simplex' && targetObj && targetObj.supportsDuplex === false) {
      console.log(`[Hardware Spooler] Printer '${targetPrinter}' does not have automatic duplex hardware (Duplex: False). Gracefully spooling as simplex.`);
      finalSide = 'simplex';
    }

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

    // Spooler pacing buffer: ensure at least 1200ms gap between consecutive print jobs to prevent port lockups
    const timeSinceLastPrint = Date.now() - lastPrintDispatchTime;
    if (timeSinceLastPrint < 1200) {
      const waitMs = 1200 - timeSinceLastPrint;
      console.log(`[Hardware Spooler] Spooler pacing: pausing ${waitMs}ms before dispatching next job...`);
      await new Promise((r) => setTimeout(r, waitMs));
    }
    lastPrintDispatchTime = Date.now();

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
      await ptp.print(printablePdfPath, ptpOptions);
      physicalDispatched = true;
      console.log(`✅ [Hardware Spooler] Paper job successfully spooled to ${targetPrinter}!`);
    } catch (spoolErr) {
      console.warn(`[Hardware Spooler] Full specs print failed (${spoolErr.message}). Retrying with safe basic flags...`);
      try {
        await ptp.print(printablePdfPath, {
          printer: targetPrinter,
          copies: Math.max(1, parseInt(jobData.copies || 1, 10)),
          silent: true
        });
        physicalDispatched = true;
        console.log(`✅ [Hardware Spooler] Paper job spooled via basic print to ${targetPrinter}!`);
      } catch (basicErr) {
        console.warn(`[Hardware Spooler] Basic ptp print failed (${basicErr.message}). Retrying with Windows shell PrintTo...`);
        try {
          const escapedPath = printablePdfPath.replace(/'/g, "''");
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

    // 5. Native OS notification & open proof for virtual / hardware feedback
    try {
      if (Notification && Notification.isSupported()) {
        new Notification({
          title: `🖨️ Order #${jobData.orderNumber || 'N/A'} Printed!`,
          body: `${jobData.originalFileName || 'Document'} (${jobData.colorMode || 'BW'}, Copies: ${jobData.copies || 1}) -> ${dispatchedPrinterName}`
        }).show();
      }
      // If virtual printer or PrintHub Studio Laser 1, open proof file so user visually sees the print result
      if (targetObj?.isVirtual || dispatchedPrinterName.includes('PrintHub Studio') || dispatchedPrinterName.includes('Laser 1')) {
        shell.openPath(proofFile);
      }
    } catch (notifErr) {}

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
