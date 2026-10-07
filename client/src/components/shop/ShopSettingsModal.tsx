import React, { useState, useEffect, useRef } from 'react';
import { Settings, X, Save, IndianRupee, Store, MapPin, Phone, QrCode, Upload, Image as ImageIcon, CheckCircle, Trash2, Building2, CreditCard, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.js';

interface ShopSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const ShopSettingsModal: React.FC<ShopSettingsModalProps> = ({
  isOpen,
  onClose,
  onSaved
}) => {
  const { user, refreshUser } = useAuth();
  const shop = user?.shop;

  const [name, setName] = useState(shop?.name || '');
  const [address, setAddress] = useState(shop?.address || '');
  const [phone, setPhone] = useState(shop?.phone || '');
  const [upiId, setUpiId] = useState(shop?.upiId || 'apexprint@upi');
  const [upiName, setUpiName] = useState(shop?.upiName || shop?.name || '');
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(shop?.qrImageUrl || null);
  const [qrType, setQrType] = useState<'DYNAMIC_UPI' | 'CUSTOM_PHONEPE_IMAGE'>(
    shop?.qrType === 'CUSTOM_PHONEPE_IMAGE' ? 'CUSTOM_PHONEPE_IMAGE' : 'DYNAMIC_UPI'
  );

  const [bwSingleRate, setBwSingleRate] = useState((shop?.bwSingleRate ?? 2.0).toString());
  const [bwDuplexRate, setBwDuplexRate] = useState((shop?.bwDuplexRate ?? 3.0).toString());
  const [colorSingleRate, setColorSingleRate] = useState((shop?.colorSingleRate ?? 10.0).toString());
  const [colorDuplexRate, setColorDuplexRate] = useState((shop?.colorDuplexRate ?? 18.0).toString());

  // Bank & Razorpay Route Settlement State
  const [bankAccountName, setBankAccountName] = useState(shop?.bankAccountName || '');
  const [bankAccountNumber, setBankAccountNumber] = useState(shop?.bankAccountNumber || '');
  const [bankIfsc, setBankIfsc] = useState(shop?.bankIfsc || '');
  const [razorpayAccountId, setRazorpayAccountId] = useState(shop?.razorpayAccountId || '');

  const [isUploadingQr, setIsUploadingQr] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (shop) {
      setName(shop.name || '');
      setAddress(shop.address || '');
      setPhone(shop.phone || '');
      setUpiId(shop.upiId || 'apexprint@upi');
      setUpiName(shop.upiName || shop.name || '');
      setQrImageUrl(shop.qrImageUrl || null);
      setQrType(shop.qrType === 'CUSTOM_PHONEPE_IMAGE' ? 'CUSTOM_PHONEPE_IMAGE' : 'DYNAMIC_UPI');
      setBwSingleRate((shop.bwSingleRate ?? 2.0).toString());
      setBwDuplexRate((shop.bwDuplexRate ?? 3.0).toString());
      setColorSingleRate((shop.colorSingleRate ?? 10.0).toString());
      setColorDuplexRate((shop.colorDuplexRate ?? 18.0).toString());
      setBankAccountName(shop.bankAccountName || '');
      setBankAccountNumber(shop.bankAccountNumber || '');
      setBankIfsc(shop.bankIfsc || '');
      setRazorpayAccountId(shop.razorpayAccountId || '');
    }
  }, [shop, isOpen]);

  if (!isOpen) return null;

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('qrImage', file);

      setIsUploadingQr(true);
      try {
        const res = await api.post('/shops/upload-qr', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (res.data.success) {
          setQrImageUrl(res.data.qrImageUrl);
          setQrType('CUSTOM_PHONEPE_IMAGE');
          showToast('success', 'PhonePe QR Uploaded', 'Your PhonePe QR standee is now saved.');
        }
      } catch (err: any) {
        showToast('error', 'Upload Failed', err.response?.data?.message || 'Could not upload QR image.');
      } finally {
        setIsUploadingQr(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const res = await api.put('/shops/settings', {
        name,
        address,
        phone,
        upiId: upiId.trim(),
        upiName: upiName.trim(),
        qrImageUrl,
        qrType,
        bwSingleRate: parseFloat(bwSingleRate),
        bwDuplexRate: parseFloat(bwDuplexRate),
        colorSingleRate: parseFloat(colorSingleRate),
        colorDuplexRate: parseFloat(colorDuplexRate),
        bankAccountName: bankAccountName.trim(),
        bankAccountNumber: bankAccountNumber.trim(),
        bankIfsc: bankIfsc.trim().toUpperCase(),
        razorpayAccountId: razorpayAccountId.trim()
      });

      if (res.data.success) {
        showToast('success', 'Shop Settings Saved', 'Your bank settlement details, QR code, and pricing are now updated.');
        await refreshUser();
        onSaved();
        onClose();
      }
    } catch (err: any) {
      showToast('error', 'Update Failed', err.response?.data?.message || 'Could not save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl relative flex flex-col max-h-[92vh] overflow-hidden">
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {/* Fixed Header */}
          <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 p-5 sm:p-6 shrink-0 bg-white dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Shop Profile & PhonePe QR Config</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Add your PhonePe Standee QR code & pricing rates</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Form Body */}
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
            {/* Shop Details */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
              Shop Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs sm:text-sm focus:border-indigo-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                Shop Address
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs sm:text-sm focus:border-indigo-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                Contact Phone
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs sm:text-sm focus:border-indigo-600 focus:outline-none"
              />
            </div>
          </div>

          {/* PhonePe QR Code Standee & UPI Configuration Box */}
          <div className="p-4 rounded-3xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-purple-900 dark:text-purple-200">
                  Shop PhonePe / UPI QR Standee
                </h3>
              </div>

              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-200 dark:bg-purple-900 text-purple-900 dark:text-purple-200">
                Direct Shop Payment
              </span>
            </div>

            {/* QR Mode Selector */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setQrType('CUSTOM_PHONEPE_IMAGE')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  qrType === 'CUSTOM_PHONEPE_IMAGE'
                    ? 'border-purple-600 bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-sm'
                    : 'border-purple-200 dark:border-purple-800/80 text-purple-600 dark:text-purple-400'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Upload QR Standee</span>
              </button>

              <button
                type="button"
                onClick={() => setQrType('DYNAMIC_UPI')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  qrType === 'DYNAMIC_UPI'
                    ? 'border-purple-600 bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-sm'
                    : 'border-purple-200 dark:border-purple-800/80 text-purple-600 dark:text-purple-400'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Dynamic UPI QR</span>
              </button>
            </div>

            {/* If Upload QR Image is Selected */}
            {qrType === 'CUSTOM_PHONEPE_IMAGE' && (
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleQrUpload}
                  className="hidden"
                />

                {qrImageUrl ? (
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-purple-200 dark:border-purple-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={qrImageUrl}
                        alt="Shop PhonePe QR"
                        className="w-14 h-14 object-cover rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                          <span>PhonePe QR Standee Active</span>
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                          Customers will see your exact shop QR card
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1 text-xs font-semibold bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-100 transition-colors"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={() => setQrImageUrl(null)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                        title="Remove uploaded QR"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-5 border-2 border-dashed border-purple-300 dark:border-purple-700 bg-white/70 dark:bg-slate-900/60 rounded-2xl text-center cursor-pointer hover:border-purple-500 transition-all flex flex-col items-center justify-center gap-1.5"
                  >
                    <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                      {isUploadingQr ? (
                        <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Upload className="w-5 h-5" />
                      )}
                    </div>
                    <p className="text-xs font-bold text-purple-900 dark:text-purple-200">
                      Click to Upload PhonePe / UPI QR Standee Image
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      PNG, JPG, or WEBP photo of your shop counter QR code
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* UPI ID / Number input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  PhonePe UPI ID / Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 9876543210@ybl or apexprint@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-purple-200 dark:border-purple-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs focus:border-purple-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Merchant Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Apex Print Hub"
                  value={upiName}
                  onChange={(e) => setUpiName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-purple-200 dark:border-purple-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:border-purple-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Pricing Rates */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              Per-Page Pricing Rates (INR ₹)
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  B&W Single-Sided (₹/pg)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">₹</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    required
                    value={bwSingleRate}
                    onChange={(e) => setBwSingleRate(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  B&W Duplex Sheet (₹/sheet)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">₹</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    required
                    value={bwDuplexRate}
                    onChange={(e) => setBwDuplexRate(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Color Single-Sided (₹/pg)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">₹</span>
                  <input
                    type="number"
                    step="0.5"
                    min="1.0"
                    required
                    value={colorSingleRate}
                    onChange={(e) => setColorSingleRate(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Color Duplex Sheet (₹/sheet)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">₹</span>
                  <input
                    type="number"
                    step="0.5"
                    min="1.0"
                    required
                    value={colorDuplexRate}
                    onChange={(e) => setColorDuplexRate(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bank Account & Razorpay Route Settlement */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-500" />
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Bank Account & Razorpay Route Settlement
              </label>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              When customers pay online via Razorpay, funds are automatically routed and deposited directly into this linked bank account.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Account Holder Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Apex Xerox & Stationers"
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Bank Account Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 50100428912345"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Bank IFSC Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. HDFC0001234"
                  value={bankIfsc}
                  onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono uppercase text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Razorpay Route Linked ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. acc_OPq123xyz (optional)"
                  value={razorpayAccountId}
                  onChange={(e) => setRazorpayAccountId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 rounded-xl">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Multi-Vendor Settlement Active: Payouts are reconciled directly to this vendor ledger.</span>
            </div>
          </div>

          </div>

          {/* Pinned Footer Actions */}
          <div className="flex gap-2 p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-500/20 flex items-center justify-center gap-1.5 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
