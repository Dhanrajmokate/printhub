import React, { useState } from 'react';
import { X, Printer, CheckCircle2, Sliders, Zap, RotateCw, FileText, Layers, Check, Play, ShieldAlert } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useToast } from '../../context/ToastContext.js';

interface PrintAttributeTesterModalProps {
  isOpen: boolean;
  onClose: () => void;
  systemPrinters?: Array<{ name: string; isPhysical: boolean } | any>;
  defaultPrinter?: any;
}

export const PrintAttributeTesterModal: React.FC<PrintAttributeTesterModalProps> = ({
  isOpen,
  onClose,
  systemPrinters = [],
  defaultPrinter = ''
}) => {
  const { showToast } = useToast();

  const extractPrinterName = (p: any): string => {
    if (!p) return '';
    if (typeof p === 'string') return p;
    if (typeof p === 'object') return p.name || p.deviceId || '';
    return String(p);
  };

  const defaultPrinterName = extractPrinterName(defaultPrinter);
  const [selectedPrinter, setSelectedPrinter] = useState<string>(defaultPrinterName);
  const [colorMode, setColorMode] = useState<'BW' | 'COLOR'>('COLOR');
  const [duplexMode, setDuplexMode] = useState<'SINGLE' | 'DUPLEX_LONG' | 'DUPLEX_SHORT'>('DUPLEX_LONG');
  const [paperSize, setPaperSize] = useState<string>('A4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [scaling, setScaling] = useState<'fit' | 'actual' | 'shrink'>('fit');
  const [pageSubset, setPageSubset] = useState<'ALL' | 'ODD' | 'EVEN'>('ALL');
  const [copies, setCopies] = useState<number>(1);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [lastDispatchedLog, setLastDispatchedLog] = useState<string | null>(null);

  if (!isOpen) return null;

  // Generate dynamic multi-page diagnostic PDF testing the exact attributes
  const generateDiagnosticPDF = (): string => {
    const doc = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: paperSize.toLowerCase() === 'a3' ? 'a3' : paperSize.toLowerCase() === 'a5' ? 'a5' : 'a4'
    });

    const isLandscape = orientation === 'landscape';
    const pageWidth = isLandscape ? 297 : 210;
    const pageHeight = isLandscape ? 210 : 297;

    // --- PAGE 1 (FRONT / SIDE A) ---
    // Outer border & margin grid
    doc.setLineWidth(0.8);
    doc.setDrawColor(79, 70, 229); // Indigo border
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(30, 41, 59);
    doc.text('PrintHub Hardware Attribute Test', 15, 22);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated: ${new Date().toLocaleString()} | Target: ${selectedPrinter || 'Default Windows Spooler'}`, 15, 28);

    // Attribute Badges Box
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(15, 33, pageWidth - 30, 28, 3, 3, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('CURRENT TEST ATTRIBUTES:', 20, 40);

    doc.setFont('helvetica', 'normal');
    doc.text(`• Color Mode: ${colorMode === 'BW' ? 'Monochrome (B&W Grayscale)' : 'Full Color (CMYK/RGB)'}`, 20, 46);
    doc.text(`• Duplex Mode: ${duplexMode === 'SINGLE' ? 'Single-Sided (Simplex)' : duplexMode === 'DUPLEX_LONG' ? 'Duplex Long-Edge (Book Flip)' : 'Duplex Short-Edge (Calendar Flip)'}`, 20, 51);
    doc.text(`• Paper Size: ${paperSize} | Orientation: ${orientation.toUpperCase()} | Scaling: ${scaling.toUpperCase()} | Copies: ${copies}`, 20, 56);

    // Duplex Side Indicator Box
    doc.setFillColor(238, 242, 255);
    doc.setDrawColor(99, 102, 241);
    doc.setLineWidth(0.5);
    doc.roundedRect(15, 66, pageWidth - 30, 35, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(67, 56, 202);
    doc.text('PAGE 1 (SIDE A - FRONT)', 20, 78);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(
      duplexMode !== 'SINGLE'
        ? 'If your printer supports auto-duplex, Page 2 (Side B) should be printed on the back of this sheet!'
        : 'Single-sided mode selected. Page 2 should be printed on a separate sheet.',
      20,
      86
    );

    // Color Swatches & Grayscale Density Test
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('COLOR & DENSITY CALIBRATION SWATCHES:', 15, 112);

    if (colorMode === 'COLOR') {
      // Cyan
      doc.setFillColor(0, 180, 216);
      doc.rect(15, 117, 30, 14, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text('CYAN (C)', 18, 126);

      // Magenta
      doc.setFillColor(224, 30, 90);
      doc.rect(50, 117, 30, 14, 'F');
      doc.text('MAGENTA (M)', 52, 126);

      // Yellow
      doc.setFillColor(255, 195, 0);
      doc.rect(85, 117, 30, 14, 'F');
      doc.setTextColor(15, 23, 42);
      doc.text('YELLOW (Y)', 88, 126);

      // Key Black
      doc.setFillColor(15, 23, 42);
      doc.rect(120, 117, 30, 14, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('BLACK (K)', 124, 126);
    } else {
      // 100% Black
      doc.setFillColor(0, 0, 0);
      doc.rect(15, 117, 30, 14, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text('100% BLACK', 18, 126);

      // 60% Gray
      doc.setFillColor(100, 100, 100);
      doc.rect(50, 117, 30, 14, 'F');
      doc.text('60% GRAY', 54, 126);

      // 30% Gray
      doc.setFillColor(180, 180, 180);
      doc.rect(85, 117, 30, 14, 'F');
      doc.setTextColor(15, 23, 42);
      doc.text('30% GRAY', 88, 126);

      // 10% Gray
      doc.setFillColor(230, 230, 230);
      doc.rect(120, 117, 30, 14, 'F');
      doc.text('10% TINT', 124, 126);
    }

    // Ruler & Margin Alignment Test
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('MARGIN & SCALING ALIGNMENT RULER:', 15, 145);

    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.4);
    doc.line(15, 152, pageWidth - 15, 152);

    for (let x = 15; x <= pageWidth - 15; x += 10) {
      doc.line(x, 150, x, 154);
    }

    // --- PAGE 2 (BACK / SIDE B) ---
    doc.addPage(paperSize.toLowerCase() === 'a3' ? 'a3' : paperSize.toLowerCase() === 'a5' ? 'a5' : 'a4', orientation);

    // Border
    doc.setLineWidth(0.8);
    doc.setDrawColor(16, 185, 129); // Emerald border
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

    // Header
    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(16, 185, 129);
    doc.roundedRect(15, 18, pageWidth - 30, 35, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(4, 120, 87);
    doc.text('PAGE 2 (SIDE B - BACK)', 20, 32);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(6, 95, 70);
    doc.text(
      duplexMode === 'DUPLEX_LONG'
        ? 'DUPLEX LONG-EDGE TEST: This text should be right-side up when flipped like a standard book!'
        : duplexMode === 'DUPLEX_SHORT'
        ? 'DUPLEX SHORT-EDGE TEST: This text should be right-side up when flipped vertically like a calendar!'
        : 'SIMPLEX TEST: Printed on second sheet.',
      20,
      42
    );

    // Footer signature
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text('PrintHub Automated Print Spooler Benchmark & Diagnostics Sheet', 15, pageHeight - 15);

    return doc.output('datauristring');
  };

  const handleExecuteTest = async () => {
    setIsPrinting(true);
    setLastDispatchedLog(null);

    try {
      const dataUri = generateDiagnosticPDF();
      const base64Data = dataUri.split(',')[1];

      if (typeof window !== 'undefined' && window.electronAPI?.printJob) {
        // Send base64 dataURI to electron printJob
        const res = await window.electronAPI.printJob({
          orderNumber: 'DIAGNOSTIC-TEST',
          originalFileName: `PrintHub_Diagnostic_${colorMode}_${duplexMode}_${paperSize}.pdf`,
          fileUrl: `data:application/pdf;base64,${base64Data}`,
          printerName: selectedPrinter || undefined,
          copies: copies,
          colorMode: colorMode,
          duplexMode: duplexMode,
          paperSize: paperSize,
          orientation: orientation,
          scaling: scaling,
          pageSubset: pageSubset
        });

        const logMsg = `Spool successfully sent to ${res.printerName || selectedPrinter || 'Default'}! (Copies: ${copies}, Duplex: ${duplexMode}, Size: ${paperSize})`;
        setLastDispatchedLog(logMsg);
        showToast('success', 'Hardware Job Dispatched!', logMsg);
      } else {
        // Fallback for web mode
        const logMsg = `Simulated: 2-Page Diagnostic generated with ${colorMode}, ${duplexMode}, ${paperSize}, ${orientation}.`;
        setLastDispatchedLog(logMsg);
        showToast('info', 'Web Preview Generated', logMsg);

        // Open in new tab for review
        const blob = new Blob([Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0))], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      }
    } catch (err: any) {
      showToast('error', 'Print Test Failed', err.message || 'Could not spool to printer');
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/40 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Print Attribute Hardware Tester</h2>
              <p className="text-xs text-indigo-200/80 font-medium">
                Test Duplex, Color/BW, Paper Sizes, Margins &amp; Copies on physical printers
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto text-xs">
          {/* Target Physical Printer */}
          <div className="space-y-1.5">
            <label className="block font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Select Destination Printer:
            </label>
            <select
              value={selectedPrinter}
              onChange={(e) => setSelectedPrinter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">Windows Default Printer ({defaultPrinterName || 'Default'})</option>
              {(systemPrinters || []).map((p, idx) => {
                const pName = extractPrinterName(p) || `Printer ${idx + 1}`;
                const isPhys = typeof p === 'object' && p !== null ? Boolean(p.isPhysical) : true;
                return (
                  <option key={`${pName}-${idx}`} value={pName}>
                    {pName} {isPhys ? '🖨️ (Physical Hardware)' : '📄 (Virtual Spooler)'}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Preset Buttons */}
          <div className="space-y-2">
            <label className="block font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-[10px]">
              Quick 1-Click Attribute Presets:
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setColorMode('COLOR');
                  setDuplexMode('DUPLEX_LONG');
                  setPaperSize('A4');
                  setOrientation('portrait');
                  setCopies(1);
                }}
                className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold hover:bg-indigo-100 transition-colors flex items-center gap-1.5"
              >
                <span>🎨 Color + Duplex Book (A4)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setColorMode('BW');
                  setDuplexMode('SINGLE');
                  setPaperSize('A4');
                  setOrientation('portrait');
                  setCopies(1);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-200 transition-colors flex items-center gap-1.5"
              >
                <span>📄 Pure B&amp;W Simplex (A4)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setColorMode('COLOR');
                  setDuplexMode('DUPLEX_SHORT');
                  setPaperSize('A4');
                  setOrientation('landscape');
                  setCopies(1);
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold hover:bg-emerald-100 transition-colors flex items-center gap-1.5"
              >
                <span>📅 Landscape Calendar Flip</span>
              </button>
            </div>
          </div>

          {/* Granular Attribute Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            {/* Color Mode */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-600 dark:text-slate-400 block">1. Color Mode</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setColorMode('BW')}
                  className={`flex-1 py-2 px-3 rounded-xl font-bold border transition-all ${
                    colorMode === 'BW'
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-transparent shadow-sm'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  B&amp;W Mono
                </button>
                <button
                  type="button"
                  onClick={() => setColorMode('COLOR')}
                  className={`flex-1 py-2 px-3 rounded-xl font-bold border transition-all ${
                    colorMode === 'COLOR'
                      ? 'bg-indigo-600 text-white border-transparent shadow-sm'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Full Color
                </button>
              </div>
            </div>

            {/* Duplex Mode */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-600 dark:text-slate-400 block">2. Double-Sided (Duplex)</label>
              <select
                value={duplexMode}
                onChange={(e: any) => setDuplexMode(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white"
              >
                <option value="SINGLE">Single-Sided (Simplex)</option>
                <option value="DUPLEX_LONG">Duplex Long-Edge (Book Flip)</option>
                <option value="DUPLEX_SHORT">Duplex Short-Edge (Calendar Flip)</option>
              </select>
            </div>

            {/* Paper Size */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-600 dark:text-slate-400 block">3. Paper Size</label>
              <select
                value={paperSize}
                onChange={(e) => setPaperSize(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white"
              >
                <option value="A4">A4 (210 × 297 mm)</option>
                <option value="A3">A3 Large Format</option>
                <option value="A5">A5 Booklet</option>
                <option value="Letter">US Letter</option>
                <option value="Legal">Legal</option>
              </select>
            </div>

            {/* Orientation */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-600 dark:text-slate-400 block">4. Orientation</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOrientation('portrait')}
                  className={`flex-1 py-2 px-3 rounded-xl font-bold border transition-all ${
                    orientation === 'portrait'
                      ? 'bg-indigo-600 text-white border-transparent'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Portrait
                </button>
                <button
                  type="button"
                  onClick={() => setOrientation('landscape')}
                  className={`flex-1 py-2 px-3 rounded-xl font-bold border transition-all ${
                    orientation === 'landscape'
                      ? 'bg-indigo-600 text-white border-transparent'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Landscape
                </button>
              </div>
            </div>

            {/* Scaling */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-600 dark:text-slate-400 block">5. Scaling &amp; Fit</label>
              <select
                value={scaling}
                onChange={(e: any) => setScaling(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white"
              >
                <option value="fit">Fit to Printable Margin</option>
                <option value="actual">100% Actual Scale (No Scale)</option>
                <option value="shrink">Shrink Oversized Pages</option>
              </select>
            </div>

            {/* Copies */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-600 dark:text-slate-400 block">6. Copies</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={copies}
                  onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value || '1', 10)))}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white"
                />
                <span className="text-[11px] text-slate-400">sets</span>
              </div>
            </div>
          </div>

          {/* Feedback Status Alert */}
          {lastDispatchedLog && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="font-medium text-xs">{lastDispatchedLog}</span>
            </div>
          )}

          {/* Action Trigger */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleExecuteTest}
              disabled={isPrinting}
              className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2 disabled:opacity-50"
            >
              <Play className={`w-4 h-4 ${isPrinting ? 'animate-spin' : ''}`} />
              <span>{isPrinting ? 'Spooling to Hardware...' : '🚀 Dispatch Attribute Test to Printer'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
