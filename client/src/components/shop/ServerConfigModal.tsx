import React, { useState, useEffect } from 'react';
import { X, Server, CheckCircle2, AlertCircle, RefreshCw, Globe, Wifi, Laptop } from 'lucide-react';
import axios from 'axios';

interface ServerConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUrl: string;
  onUrlUpdated: (newUrl: string) => void;
}

export const ServerConfigModal: React.FC<ServerConfigModalProps> = ({
  isOpen,
  onClose,
  currentUrl,
  onUrlUpdated
}) => {
  const [serverUrl, setServerUrl] = useState(currentUrl || 'http://localhost:8000');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setServerUrl(currentUrl || 'http://localhost:8000');
      setTestResult(null);
    }
  }, [isOpen, currentUrl]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const cleanUrl = serverUrl.trim().replace(/\/$/, '');

    try {
      const res = await axios.get(`${cleanUrl}/api/health`, { timeout: 5000 });
      if (res.data?.status === 'ok' || res.status === 200) {
        setTestResult({
          success: true,
          message: `Connected successfully! (Service: ${res.data?.service || 'PrintHub API'})`
        });
      } else {
        setTestResult({
          success: false,
          message: 'Server responded, but health check was not ok.'
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message?.includes('timeout')
          ? 'Connection timed out. Check IP and firewall.'
          : `Failed to connect: ${err.message || 'Server offline'}`
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    const cleanUrl = serverUrl.trim().replace(/\/$/, '');
    setSaving(true);

    try {
      // Save in localStorage for web requests
      localStorage.setItem('printhub_server_url', cleanUrl);

      // Save in Electron config file if running in desktop app
      if (window.electronAPI?.getConfig && window.electronAPI?.saveConfig) {
        const cfg = await window.electronAPI.getConfig();
        await window.electronAPI.saveConfig({ ...cfg, backendUrl: cleanUrl });
      }

      onUrlUpdated(cleanUrl);
      onClose();

      // Reload app to re-establish sockets / SSE with new URL
      if (window.electronAPI?.reloadApp) {
        window.electronAPI.reloadApp();
      } else {
        window.location.reload();
      }
    } catch (err) {
      console.error('Error saving server URL:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[92vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Central Server Connection</h3>
              <p className="text-xs text-slate-400">Connect to PrintHub Cloud or Local Network Backend</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Backend Server URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => {
                  setServerUrl(e.target.value);
                  setTestResult(null);
                }}
                placeholder="http://localhost:8000 or https://your-api.onrender.com"
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-600"
              />
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || !serverUrl}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xs font-semibold text-indigo-300 border border-slate-700 flex items-center gap-1.5 transition-all"
              >
                {testing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                Test
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Where customer print orders and real-time SSE queues originate from.
            </p>
          </div>

          {/* Test Status Banner */}
          {testResult && (
            <div
              className={`p-3 rounded-2xl flex items-center gap-2.5 text-xs ${
                testResult.success
                  ? 'bg-emerald-950/60 border border-emerald-800/80 text-emerald-300'
                  : 'bg-rose-950/60 border border-rose-800/80 text-rose-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Architecture Presets */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Quick Setup Presets
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setServerUrl('http://localhost:8000');
                  setTestResult(null);
                }}
                className="p-3 rounded-2xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 text-left flex items-start gap-2.5 transition-all"
              >
                <Laptop className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold text-white">Local Development</div>
                  <div className="text-[11px] text-slate-400 font-mono">http://localhost:8000</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Same laptop development</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setServerUrl('https://printhub-api.onrender.com');
                  setTestResult(null);
                }}
                className="p-3 rounded-2xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 text-left flex items-start gap-2.5 transition-all"
              >
                <Globe className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold text-white">Cloud Production</div>
                  <div className="text-[11px] text-emerald-400/90 font-mono">https://api.onrender...</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Any PC worldwide via internet</div>
                </div>
              </button>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-800/40 text-[11px] text-indigo-300/90 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-indigo-200">
              <Wifi className="w-3.5 h-3.5" /> For College / Lab Demo (Another PC):
            </div>
            <p>
              Connect both laptops to the same Wi-Fi or Mobile Hotspot. Enter your laptop's local IP address
              (e.g., <code className="bg-indigo-900/60 px-1 py-0.5 rounded text-white font-mono">http://192.168.1.15:8000</code>).
            </p>
          </div>
        </div>

        {/* Pinned Footer */}
        <div className="p-4 sm:p-6 border-t border-slate-800 flex justify-end gap-3 bg-slate-950/40 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !serverUrl}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
            Save & Connect
          </button>
        </div>
      </div>
    </div>
  );
};
