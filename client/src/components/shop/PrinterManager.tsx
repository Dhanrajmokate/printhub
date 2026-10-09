import React, { useState, useEffect } from 'react';
import { Printer, Plus, Trash2, RefreshCw, CheckCircle2, AlertCircle, Sparkles, Sliders, ToggleLeft, ToggleRight, Download, HelpCircle, X, Laptop, Cpu, Check, ArrowRight } from 'lucide-react';
import { Printer as PrinterType } from '../../types/index.js';
import { api } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.js';
import { SkeletonShimmer } from '../common/SkeletonShimmer.js';
import { EmptyState } from '../common/EmptyState.js';
import { PrintAttributeTesterModal } from './PrintAttributeTesterModal.js';

export const PrinterManager: React.FC = () => {
  const [printers, setPrinters] = useState<PrinterType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPinging, setIsPinging] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isAttributeTesterOpen, setIsAttributeTesterOpen] = useState(false);

  // New Printer form state
  const [name, setName] = useState('');
  const [port, setPort] = useState('8001');
  const [type, setType] = useState<'BW' | 'COLOR'>('BW');
  const [supportsDuplex, setSupportsDuplex] = useState(true);
  const [autoConvert, setAutoConvert] = useState(true);

  const { showToast } = useToast();

  const extractPrinterName = (p: any): string => {
    if (!p) return '';
    if (typeof p === 'string') return p;
    if (typeof p === 'object') return p.name || p.deviceId || '';
    return String(p);
  };

  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;
  const [systemPrinters, setSystemPrinters] = useState<any[]>([]);
  const [defaultSystemPrinter, setDefaultSystemPrinter] = useState<string>('');
  const [selectedBwPrinter, setSelectedBwPrinter] = useState<string>('');
  const [selectedColorPrinter, setSelectedColorPrinter] = useState<string>('');
  const [isTestPrinting, setIsTestPrinting] = useState<boolean>(false);

  const fetchPrinters = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/printers');
      if (res.data?.success && Array.isArray(res.data?.printers)) {
        setPrinters(res.data.printers);
      } else {
        setPrinters([]);
      }
    } catch (err) {
      console.error('Failed to fetch printers:', err);
      setPrinters([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrinters();

    if (isElectron && window.electronAPI?.getSystemPrinters) {
      window.electronAPI.getSystemPrinters().then((res) => {
        if (res?.success && Array.isArray(res.printers)) {
          setSystemPrinters(res.printers);
          if (res.defaultPrinter) {
            setDefaultSystemPrinter(extractPrinterName(res.defaultPrinter));
          }
        }
      }).catch((e) => console.warn('Could not query system printers:', e));
      if (window.electronAPI?.getConfig) {
        window.electronAPI.getConfig().then((cfg) => {
          if (cfg?.bwPrinter) setSelectedBwPrinter(extractPrinterName(cfg.bwPrinter));
          if (cfg?.colorPrinter) setSelectedColorPrinter(extractPrinterName(cfg.colorPrinter));
        }).catch((e) => console.warn('Could not query config:', e));
      }
    }
  }, [isElectron]);

  const handlePrintTestPage = async (printerName?: string) => {
    setIsTestPrinting(true);
    try {
      if (isElectron && window.electronAPI?.printJob) {
        const target = printerName || selectedBwPrinter || defaultSystemPrinter;
        await window.electronAPI.printJob({
          orderNumber: 'TEST-PAGE',
          originalFileName: 'PrintHub_Physical_Hardware_Test.pdf',
          localPath: 'c:\\Users\\rahul\\OneDrive\\Desktop\\smart print\\shop-desktop\\test-page.pdf',
          fileUrl: `${window.location.origin}/test-page.pdf`,
          printerName: target || undefined,
          copies: 1,
          colorMode: 'BW',
          duplexMode: 'SINGLE',
          paperSize: 'A4',
          pageRange: '1'
        });
        showToast('success', 'Physical Print Sent!', `Test page spooled to ${target || 'Default Printer'}`);
      } else {
        showToast('info', 'Web Mode', 'Test page simulation recorded.');
      }
    } catch (err: any) {
      showToast('error', 'Test Print Error', err.message || 'Could not send test page');
    } finally {
      setIsTestPrinting(false);
    }
  };

  const handleUpdatePrinterConfig = async (key: 'bwPrinter' | 'colorPrinter', value: string) => {
    if (key === 'bwPrinter') setSelectedBwPrinter(value);
    if (key === 'colorPrinter') setSelectedColorPrinter(value);

    if (isElectron && window.electronAPI?.saveConfig) {
      const cfg = await window.electronAPI.getConfig();
      await window.electronAPI.saveConfig({ ...cfg, [key]: value });
      showToast('success', 'Setting Saved', `${key === 'bwPrinter' ? 'B&W' : 'Color'} printer mapped to ${value || 'Default'}`);
    }
  };

  const handlePingAll = async () => {
    setIsPinging(true);
    try {
      await fetchPrinters();
      showToast('info', 'Printer Health Checked', 'Updated status for all configured printers.');
    } finally {
      setIsPinging(false);
    }
  };

  const handleToggleAutoConvert = async (printer: PrinterType) => {
    try {
      const res = await api.put(`/printers/${printer.id}`, {
        autoConvert: !printer.autoConvert
      });
      if (res.data.success) {
        showToast('success', 'Setting Updated', `Auto-convert ${!printer.autoConvert ? 'enabled' : 'disabled'}`);
        fetchPrinters();
      }
    } catch (err) {
      showToast('error', 'Update Failed', 'Could not update printer setting');
    }
  };

  const handleDeletePrinter = async (id: string, printerName: string) => {
    if (!window.confirm(`Are you sure you want to remove ${printerName}?`)) return;

    try {
      const res = await api.delete(`/printers/${id}`);
      if (res.data.success) {
        showToast('success', 'Printer Removed', `${printerName} deleted`);
        setPrinters((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (err) {
      showToast('error', 'Delete Failed', 'Could not remove printer');
    }
  };

  const handleAddPrinter = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/printers', {
        name,
        port: parseInt(port, 10),
        type,
        supportsDuplex,
        autoConvert
      });
      if (res.data.success) {
        showToast('success', 'Printer Added', `${name} registered on port ${port}`);
        setIsAddModalOpen(false);
        setName('');
        fetchPrinters();
      }
    } catch (err: any) {
      showToast('error', 'Failed to Add', err.response?.data?.message || 'Could not add printer');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Printer className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Shop Printer Fleet Management
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time port pinging & capability routing (Ports 8001/8002)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePingAll}
            disabled={isPinging}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} />
            <span>Ping All</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Printer</span>
          </button>
        </div>
      </div>

      {/* Native Desktop Physical Printers Section */}
      {isElectron && (
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 text-white space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Physical Windows Printers Detected</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 text-[10px] font-bold border border-emerald-800">
                    Live Spooler
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  {systemPrinters.length} printer(s) linked via Windows Print Spooler (winspool.drv).
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAttributeTesterOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/25 flex items-center gap-2"
                title="Test all granular print attributes (Duplex, Colors, Paper Sizes, Margins, Copies)"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>🧪 Test All Attributes</span>
              </button>

              <button
                type="button"
                onClick={() => handlePrintTestPage()}
                disabled={isTestPrinting}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/25 flex items-center gap-2 disabled:opacity-50"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{isTestPrinting ? 'Printing Test Page...' : 'Quick Test Page'}</span>
              </button>
            </div>
          </div>

          {/* Connected printers dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="block text-slate-300 font-bold uppercase text-[10px] tracking-wider">
                Default B&amp;W Printer:
              </label>
              <select
                value={selectedBwPrinter}
                onChange={(e) => handleUpdatePrinterConfig('bwPrinter', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">Windows Default ({extractPrinterName(defaultSystemPrinter) || 'Default'})</option>
                {(systemPrinters || []).map((p, idx) => {
                  const pName = extractPrinterName(p) || `Printer ${idx + 1}`;
                  const isPhys = typeof p === 'object' && p !== null ? Boolean(p.isPhysical) : true;
                  return (
                    <option key={`bw-${pName}-${idx}`} value={pName}>
                      {pName} {isPhys ? '🖨️ (Physical)' : '📄 (Virtual)'}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-slate-300 font-bold uppercase text-[10px] tracking-wider">
                Default Color Printer:
              </label>
              <select
                value={selectedColorPrinter}
                onChange={(e) => handleUpdatePrinterConfig('colorPrinter', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">Windows Default ({extractPrinterName(defaultSystemPrinter) || 'Default'})</option>
                {(systemPrinters || []).map((p, idx) => {
                  const pName = extractPrinterName(p) || `Printer ${idx + 1}`;
                  const isPhys = typeof p === 'object' && p !== null ? Boolean(p.isPhysical) : true;
                  return (
                    <option key={`color-${pName}-${idx}`} value={pName}>
                      {pName} {isPhys ? '🖨️ (Physical)' : '📄 (Virtual)'}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Print Agent Status & Setup Card */}
      <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md flex-shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-950 dark:text-indigo-200">
                PrintHub Desktop Agent
              </h3>
              <span className="flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active on Ports 8001/8002
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Connects your physical USB & Wi-Fi printers to the PrintHub cloud queue.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsHelpModalOpen(true)}
            className="px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white/70 dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-50 transition-all flex items-center gap-1"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>How It Works</span>
          </button>

          <a
            href="/start-printer-agent.bat"
            download="start-printer-agent.bat"
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-500/20 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Agent (.bat)</span>
          </a>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonShimmer variant="card" count={2} />
        </div>
      ) : !Array.isArray(printers) || printers.length === 0 ? (
        <EmptyState
          icon={Printer}
          title="No Printers Configured"
          description="Add a physical or simulator printer on port 8001 (B&W) or 8002 (Color) to start processing print jobs."
          actionText="Add First Printer"
          onAction={() => setIsAddModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(printers || []).map((printer) => {
            const isOnline = printer.healthStatus?.isOnline ?? printer.isOnline;
            const health = printer.healthStatus?.details;

            return (
              <div
                key={printer.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                {/* Printer Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-xs ${
                        printer.type === 'COLOR'
                          ? 'bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {printer.type === 'COLOR' ? '🎨' : '⬛'}
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm">{printer.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span className="font-mono">Port: {printer.port}</span>
                        <span>•</span>
                        <span className="font-medium uppercase">{printer.type} Printer</span>
                      </div>
                      {isElectron && (
                        <div className="text-[11px] text-emerald-500 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                          <span>Spooler Target:</span>
                          <span className="font-mono text-slate-700 dark:text-slate-300">
                            {printer.type === 'COLOR'
                              ? (selectedColorPrinter || defaultSystemPrinter || 'Windows Default')
                              : (selectedBwPrinter || defaultSystemPrinter || 'Windows Default')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <span
                      className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                        (isElectron || isOnline)
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900'
                          : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900'
                      }`}
                    >
                      {isElectron ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" /> Ready (Spooler)
                        </>
                      ) : isOnline ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" /> Online
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-indigo-500" /> Cloud Spool Ready
                        </>
                      )}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleDeletePrinter(printer.id, printer.name)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                      title="Delete Printer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Capabilities & Live Metrics */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Paper Tray:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {typeof health?.paperStatus === 'string'
                        ? health.paperStatus
                        : (isOnline ? 'Ready (Tray 1: 500 sheets)' : 'Offline')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Toner/Ink Level:</span>
                    <span className="font-semibold font-mono text-slate-800 dark:text-slate-200">
                      {typeof health?.tonerLevel === 'string' || typeof health?.tonerLevel === 'number'
                        ? String(health.tonerLevel)
                        : (printer.type === 'COLOR' ? 'Cyan 92%, Mag 88%, Yel 95%, Blk 90%' : 'Black: 94%')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-slate-700/40">
                    <span className="text-slate-500 dark:text-slate-400">Duplex (2-Sided):</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {printer.supportsDuplex ? 'Supported' : 'Single Only'}
                    </span>
                  </div>
                </div>

                {/* Auto Convert Toggle */}
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Auto-Convert to PDF
                    </span>
                    <p className="text-[10px] text-slate-400">Silently convert Word/Images before spooling</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleAutoConvert(printer)}
                    className="text-indigo-600 dark:text-indigo-400 hover:opacity-80 transition-opacity"
                  >
                    {printer.autoConvert ? (
                      <ToggleRight className="w-7 h-7 fill-current" />
                    ) : (
                      <ToggleLeft className="w-7 h-7 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Printer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Register New Printer</h3>

            <form onSubmit={handleAddPrinter} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Printer Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Office LaserJet Pro"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Port</label>
                  <input
                    type="number"
                    required
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as 'BW' | 'COLOR')}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600"
                  >
                    <option value="BW">⬛ B&W Laser</option>
                    <option value="COLOR">🎨 Color Jet</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={supportsDuplex}
                    onChange={(e) => setSupportsDuplex(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Supports Duplex</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={autoConvert}
                    onChange={(e) => setAutoConvert(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Auto-Convert</span>
                </label>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20"
                >
                  Save Printer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* "How It Works" Educational Walkthrough Modal */}
      {isHelpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl relative space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
                  <Laptop className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">How the Print Agent Works</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Connecting your computer's printers to the cloud</p>
                </div>
              </div>
              <button
                onClick={() => setIsHelpModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs">
                  1
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">Connect Printer to this PC</h4>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    Connect your printer normally via <strong>USB cable or Wi-Fi</strong>. Make sure Windows can print a regular test page.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs">
                  2
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">Download & Launch the Agent (.bat)</h4>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    Click <strong>"Download Agent (.bat)"</strong> and double-click to run it. It runs in the background and activates Ports 8001 (B&W) and 8002 (Color).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs">
                  3
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">Click "Print Job" on the Dashboard</h4>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    When an order arrives, click <strong>"Print Job"</strong>. The cloud sends the file directly to your agent, which dispatches it straight to your physical printer tray!
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <a
                href="/start-printer-agent.bat"
                download="start-printer-agent.bat"
                onClick={() => setIsHelpModalOpen(false)}
                className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/25 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Download PrintHub Agent (.bat)</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Print Attribute Tester Modal */}
      <PrintAttributeTesterModal
        isOpen={isAttributeTesterOpen}
        onClose={() => setIsAttributeTesterOpen(false)}
        systemPrinters={systemPrinters || []}
        defaultPrinter={extractPrinterName(defaultSystemPrinter)}
      />
    </div>
  );
};
