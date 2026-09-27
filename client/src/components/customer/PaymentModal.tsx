import React, { useState, useRef } from 'react';
import { QrCode, Wallet as WalletIcon, CreditCard, ShieldCheck, X, Check, ArrowRight, AlertCircle, Sparkles, Copy, Smartphone, ExternalLink, Image as ImageIcon, Store, Phone, Info, Camera, UploadCloud, Trash2, Zap } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../../context/AuthContext.js';
import { useCart } from '../../context/CartContext.js';
import { api } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.js';
import { Order } from '../../types/index.js';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: (order: Order) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onOrderCreated
}) => {
  const { user, refreshUser } = useAuth();
  const { items, subtotal, selectedShop, clearCart } = useCart();
  const { showToast } = useToast();

  const [paymentMethod, setPaymentMethod] = useState<'SHOP_UPI_QR' | 'WALLET' | 'RAZORPAY'>('RAZORPAY');
  const [upiRef, setUpiRef] = useState('');
  const [notes, setNotes] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [qrViewMode, setQrViewMode] = useState<'AUTO' | 'DYNAMIC'>('AUTO');

  // Payment Screenshot Proof State
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const screenshotInputRef = useRef<HTMLInputElement | null>(null);

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showToast('error', 'Invalid File Type', 'Please upload a photo/image file (JPG, PNG, WEBP)');
        return;
      }
      setScreenshotFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveScreenshot = () => {
    setScreenshotFile(null);
    setScreenshotPreview(null);
    if (screenshotInputRef.current) {
      screenshotInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  const walletBalance = user?.wallet?.balance ?? 0;
  const isWalletSufficient = walletBalance >= subtotal;

  // The Shop's pre-configured PhonePe / UPI ID, Phone Number, and Name
  const shopUpiId = selectedShop?.upiId || 'apexprint@okaxis';
  const shopPhoneNumber = selectedShop?.phone || '9876543210';
  const shopDisplayName = selectedShop?.upiName || selectedShop?.name || 'PrintHub Partner Shop';
  const hasCustomQrImage = Boolean(selectedShop?.qrImageUrl && selectedShop?.qrType === 'CUSTOM_PHONEPE_IMAGE');

  // Standard UPI URI format
  const upiUri = `upi://pay?pa=${encodeURIComponent(shopUpiId)}&pn=${encodeURIComponent(shopDisplayName)}&am=${subtotal.toFixed(2)}&cu=INR&tn=PrintHub_Order`;

  const handleCopyUpiId = () => {
    navigator.clipboard.writeText(shopUpiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(shopPhoneNumber);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleOpenUpiApp = (targetApp?: 'phonepe' | 'gpay' | 'paytm') => {
    // Copy shop details for convenience
    navigator.clipboard.writeText(shopUpiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);

    const isAndroid = /android/i.test(navigator.userAgent);

    if (isAndroid && targetApp) {
      const packageMap = {
        phonepe: 'com.phonepe.app',
        gpay: 'com.google.android.apps.nbu.paisa.user',
        paytm: 'net.one97.paytm'
      };

      const pkg = packageMap[targetApp];
      const intentUrl = `intent://pay?pa=${encodeURIComponent(shopUpiId)}&pn=${encodeURIComponent(shopDisplayName)}&am=${subtotal.toFixed(2)}&cu=INR&tn=PrintHub_Order#Intent;scheme=upi;package=${pkg};end`;
      
      showToast('info', 'Opening App...', `Launching ${targetApp.toUpperCase()} with ₹${subtotal.toFixed(2)}...`);
      window.location.href = intentUrl;

      // Fallback to standard universal UPI link if app not found after short delay
      setTimeout(() => {
        window.location.href = upiUri;
      }, 2000);
    } else {
      // Standard universal UPI link: works across Android app chooser and iOS
      showToast('info', 'Launching UPI...', `Opening UPI app for ₹${subtotal.toFixed(2)}...`);
      window.location.href = upiUri;
    }
  };

  const handleCheckout = async () => {
    if (!selectedShop) {
      setErrorMessage('Please select a print shop before checking out.');
      return;
    }

    if (items.length === 0) {
      setErrorMessage('Your cart is empty.');
      return;
    }

    if (paymentMethod === 'WALLET' && !isWalletSufficient) {
      setErrorMessage(`Insufficient wallet balance. You have ₹${walletBalance.toFixed(2)}, but total is ₹${subtotal.toFixed(2)}.`);
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      let razorpayPaymentId: string | undefined = undefined;
      let paymentScreenshotUrl: string | undefined = undefined;

      // 1. Upload Payment Proof Screenshot if attached
      if (screenshotFile) {
        const proofFormData = new FormData();
        proofFormData.append('proof', screenshotFile);
        const uploadRes = await api.post('/upload/payment-proof', proofFormData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (uploadRes.data.success) {
          paymentScreenshotUrl = uploadRes.data.url;
        }
      }

      if (paymentMethod === 'RAZORPAY') {
        const rzpRes = await api.post('/payment/create-order', { amount: subtotal });
        const rzpOrder = rzpRes.data.order;
        const rzpKey = rzpRes.data.keyId;

        if (!(window as any).Razorpay) {
          throw new Error('Razorpay SDK failed to load. Please check your internet connection.');
        }

        const paymentSuccess = await new Promise<{ paymentId: string; orderId: string; signature: string }>((resolve, reject) => {
          const options = {
            key: rzpKey,
            amount: rzpOrder.amount,
            currency: rzpOrder.currency || 'INR',
            name: 'PrintHub',
            description: `Print Order for ${selectedShop.name}`,
            order_id: rzpOrder.id,
            prefill: {
              name: user?.name || '',
              email: user?.email || '',
              contact: user?.phone || ''
            },
            theme: {
              color: '#4f46e5'
            },
            modal: {
              ondismiss: () => {
                reject(new Error('Payment was cancelled by user.'));
              }
            },
            handler: (response: any) => {
              resolve({
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                signature: response.razorpay_signature
              });
            }
          };

          const rzp = new (window as any).Razorpay(options);
          rzp.on('payment.failed', (resp: any) => {
            reject(new Error(resp.error?.description || 'Payment failed'));
          });
          rzp.open();
        });

        // Verify payment signature on backend
        await api.post('/payment/verify', {
          razorpayOrderId: paymentSuccess.orderId,
          razorpayPaymentId: paymentSuccess.paymentId,
          razorpaySignature: paymentSuccess.signature
        });

        razorpayPaymentId = paymentSuccess.paymentId;
      }

      const formattedItems = items.map((item) => ({
        originalFileName: item.fileMeta.originalFileName,
        storedFileName: item.fileMeta.storedFileName,
        fileType: item.fileMeta.fileType,
        fileSize: item.fileMeta.fileSize,
        pageCount: item.fileMeta.pageCount,
        copies: item.settings.copies,
        colorMode: item.settings.colorMode,
        duplexMode: item.settings.duplexMode,
        orientation: item.settings.orientation,
        paperSize: item.settings.paperSize,
        quality: item.settings.quality,
        pageRange: item.settings.pageRange,
        scaling: item.settings.scaling,
        collate: item.settings.collate
      }));

      const orderRes = await api.post('/orders', {
        shopId: selectedShop.id,
        items: formattedItems,
        paymentMethod,
        upiTransactionRef: paymentMethod === 'SHOP_UPI_QR' ? (upiRef.trim() || `PHONEPE_${Date.now()}`) : undefined,
        razorpayPaymentId,
        paymentScreenshot: paymentScreenshotUrl,
        notes: notes.trim() || undefined
      });

      if (orderRes.data.success) {
        showToast(
          'success',
          'Payment Verified & Order Placed!',
          `Order #${orderRes.data.order.orderNumber} sent to ${selectedShop.name}.`
        );
        clearCart();
        await refreshUser();
        onOrderCreated(orderRes.data.order);
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Payment processing failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 max-w-lg w-full shadow-2xl relative my-8">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-inner">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Pay at {selectedShop?.name || 'Shop'}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official PhonePe QR of {selectedShop?.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Order & Shop Summary */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 mb-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Store className="w-3.5 h-3.5 text-purple-500" />
              <span>Selected Print Shop:</span>
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{selectedShop?.name}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Total Documents:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{items.length} files</span>
          </div>
          <div className="flex items-center justify-between text-sm font-bold border-t border-slate-200/60 dark:border-slate-700/50 pt-2 text-slate-900 dark:text-white">
            <span>Total Payable Amount</span>
            <span className="text-purple-600 dark:text-purple-400 font-mono text-lg font-black">
              ₹{subtotal.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Payment Tabs Selection: The 2 Real Ways Customers Pay */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <button
            type="button"
            onClick={() => setPaymentMethod('RAZORPAY')}
            className={`p-2.5 rounded-2xl border-2 text-center transition-all flex flex-col items-center gap-1 relative ${
              paymentMethod === 'RAZORPAY'
                ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-extrabold shadow-md ring-2 ring-indigo-500/20'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300'
            }`}
          >
            <div className="absolute -top-2 right-1 px-1.5 py-0.2 rounded-full bg-emerald-500 text-white font-black text-[9px] uppercase tracking-wider shadow-sm">
              Instant
            </div>
            <Zap className="w-4 h-4 text-indigo-600 dark:text-indigo-400 fill-indigo-600 dark:fill-indigo-400" />
            <span className="text-xs font-bold leading-tight">Instant UPI / Cards</span>
            <span className="text-[10px] text-slate-400 font-medium">Way 1 • Razorpay</span>
          </button>

          <button
            type="button"
            onClick={() => setPaymentMethod('SHOP_UPI_QR')}
            className={`p-2.5 rounded-2xl border-2 text-center transition-all flex flex-col items-center gap-1 ${
              paymentMethod === 'SHOP_UPI_QR'
                ? 'border-purple-600 bg-purple-50/70 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 font-extrabold shadow-md ring-2 ring-purple-500/20'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300'
            }`}
          >
            <QrCode className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-bold leading-tight">Counter QR & Proof</span>
            <span className="text-[10px] text-slate-400 font-medium">Way 2 • Screenshot</span>
          </button>

          <button
            type="button"
            onClick={() => setPaymentMethod('WALLET')}
            className={`p-2.5 rounded-2xl border-2 text-center transition-all flex flex-col items-center gap-1 ${
              paymentMethod === 'WALLET'
                ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-extrabold shadow-md ring-2 ring-emerald-500/20'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300'
            }`}
          >
            <WalletIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-bold leading-tight">PrintHub Wallet</span>
            <span className="text-[10px] text-slate-400 font-medium">Bal: ₹{walletBalance.toFixed(0)}</span>
          </button>
        </div>

        {/* Tab 1: Shop PhonePe / UPI QR Standee Card */}
        {paymentMethod === 'SHOP_UPI_QR' && (
          <div className="space-y-3 mb-4 animate-in fade-in">
            <div className="p-4 rounded-3xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 flex flex-col items-center text-center relative overflow-hidden">
              {/* PhonePe Verified Badge & Shop Identifier */}
              <div className="flex items-center justify-between w-full mb-3">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-600 text-white text-[10px] font-extrabold tracking-wide uppercase shadow-sm">
                  <span>PhonePe QR Verified</span>
                </div>
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                  {selectedShop?.name}
                </span>
              </div>

              {/* QR Code Presentation */}
              {hasCustomQrImage && qrViewMode === 'AUTO' ? (
                <div className="space-y-2 mb-2">
                  <div className="p-2 bg-white rounded-2xl shadow-md border border-purple-200 max-w-[200px] mx-auto">
                    <img
                      src={selectedShop!.qrImageUrl!}
                      alt={`${selectedShop?.name} PhonePe QR Standee`}
                      className="w-full h-auto max-h-[200px] object-contain rounded-xl"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setQrViewMode('DYNAMIC')}
                    className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline font-semibold"
                  >
                    Switch to Dynamic High-Res QR
                  </button>
                </div>
              ) : (
                <div className="space-y-2 mb-2">
                  <div className="p-3.5 bg-white rounded-2xl shadow-md border border-purple-200 inline-block">
                    <QRCodeSVG
                      value={upiUri}
                      size={150}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                  {hasCustomQrImage && (
                    <div>
                      <button
                        type="button"
                        onClick={() => setQrViewMode('AUTO')}
                        className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline font-semibold"
                      >
                        View Shop's Original Standee QR Card
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Exact Amount Tag */}
              <div className="mb-2 px-3.5 py-1.5 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-purple-900 dark:text-purple-200 text-xs font-bold">
                Scan to Pay: <span className="font-mono text-sm font-black">₹{subtotal.toFixed(2)}</span>
              </div>

              {/* 1-Tap Mobile Payment: Direct Universal UPI Link & App Launchers */}
              <div className="w-full space-y-2.5 pt-1">
                {/* Universal 1-Tap UPI Launch Link */}
                <a
                  href={upiUri}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 hover:from-purple-700 hover:to-indigo-700 transition-all active:scale-[0.98]"
                >
                  <Zap className="w-4 h-4 text-amber-300 fill-amber-300 animate-pulse" />
                  <span>1-Tap Pay ₹{subtotal.toFixed(2)} via Any UPI App</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </a>

                {/* Specific App Launchers: PhonePe, GPay, Paytm */}
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenUpiApp('phonepe')}
                    className="py-2.5 px-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold flex items-center justify-center gap-1 transition-colors shadow-sm"
                  >
                    <span>💜 PhonePe</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenUpiApp('gpay')}
                    className="py-2.5 px-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold flex items-center justify-center gap-1 transition-colors shadow-sm"
                  >
                    <span>🔵 GPay</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenUpiApp('paytm')}
                    className="py-2.5 px-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-bold flex items-center justify-center gap-1 transition-colors shadow-sm"
                  >
                    <span>🔷 Paytm</span>
                  </button>
                </div>

                {/* Shop Mobile Number & UPI ID Details Box */}
                <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-purple-200 dark:border-purple-800 text-left space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-purple-600" />
                      <span>Shop Mobile Number:</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{shopPhoneNumber}</span>
                      <button
                        type="button"
                        onClick={handleCopyPhone}
                        className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold text-[10px] flex items-center gap-1"
                      >
                        {copiedPhone ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedPhone ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400 font-semibold">Shop UPI ID:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{shopUpiId}</span>
                      <button
                        type="button"
                        onClick={handleCopyUpiId}
                        className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold text-[10px] flex items-center gap-1"
                      >
                        {copiedUpi ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Helpful Instruction Note */}
                <div className="p-2.5 rounded-xl bg-purple-100/60 dark:bg-purple-950/40 text-[10px] text-purple-900 dark:text-purple-300 flex items-start gap-1.5 text-left">
                  <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-purple-600" />
                  <span>
                    <strong>How to complete on mobile:</strong> Tap <strong>"Copy & Open PhonePe"</strong> above → paste into PhonePe search bar → transfer ₹{subtotal.toFixed(2)} → tap <strong>"Confirm Payment"</strong> below!
                  </span>
                </div>
              </div>
            </div>

            {/* Upload Payment Screenshot / Photo Proof */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Payment Screenshot / Photo Proof
                </label>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  Recommended
                </span>
              </div>

              <input
                ref={screenshotInputRef}
                type="file"
                accept="image/*"
                onChange={handleScreenshotChange}
                className="hidden"
              />

              {!screenshotPreview ? (
                <div
                  onClick={() => screenshotInputRef.current?.click()}
                  className="p-4 rounded-2xl border-2 border-dashed border-purple-200 dark:border-purple-800/80 bg-purple-50/40 dark:bg-purple-950/20 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-1.5 group"
                >
                  <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-300 flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center justify-center gap-1">
                      <span>Click to upload payment screenshot</span>
                      <UploadCloud className="w-3.5 h-3.5" />
                    </span>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Upload PhonePe / GPay success screen or counter receipt photo
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-3 animate-in fade-in">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <img
                      src={screenshotPreview}
                      alt="Payment Proof"
                      className="w-12 h-12 rounded-xl object-cover border border-emerald-300 dark:border-emerald-700 flex-shrink-0 shadow-sm"
                    />
                    <div className="overflow-hidden">
                      <div className="flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {screenshotFile?.name || 'Payment Proof'}
                        </span>
                      </div>
                      <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">
                        Photo proof attached ({(screenshotFile ? screenshotFile.size / 1024 : 0).toFixed(0)} KB)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => screenshotInputRef.current?.click()}
                      className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-[11px] font-bold border border-slate-200 dark:border-slate-700 shadow-sm"
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveScreenshot}
                      className="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900"
                      title="Remove Photo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Optional UTR / Reference ID Field for Counter Verification */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                UPI Reference / UTR Number (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. 423891238910 or last 4 digits of UPI transaction"
                value={upiRef}
                onChange={(e) => setUpiRef(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs focus:border-purple-600 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Tab 2: PrintHub Wallet */}
        {paymentMethod === 'WALLET' && (
          <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 mb-4 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <WalletIcon className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">PrintHub Digital Wallet</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Available Balance: <strong className="font-mono text-slate-800 dark:text-slate-200">₹{walletBalance.toFixed(2)}</strong>
                  </p>
                </div>
              </div>

              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                1-Click Pay
              </span>
            </div>

            {!isWalletSufficient && (
              <p className="text-xs text-rose-500 dark:text-rose-400 font-semibold bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900">
                Insufficient balance. You need ₹{(subtotal - walletBalance).toFixed(2)} more. You can top up or use PhonePe QR above.
              </p>
            )}
          </div>
        )}

        {/* Way 1: Online Gateway (Razorpay: Instant UPI, Cards & NetBanking) */}
        {paymentMethod === 'RAZORPAY' && (
          <div className="p-4 sm:p-5 rounded-3xl bg-indigo-50/60 dark:bg-indigo-950/40 border-2 border-indigo-200 dark:border-indigo-800/80 mb-4 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-600 text-white font-extrabold text-[10px] tracking-wider uppercase shadow-sm">
                  Way 1: Recommended
                </span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  RBI-Authorized Gateway
                </span>
              </div>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> 100% Verified
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Instant UPI (GPay, PhonePe, Paytm), Cards & NetBanking
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Tapping the button below opens the official <strong>Razorpay Checkout window</strong>. 
                Pay via any UPI app or card with zero security decline and no ₹2,000 limits.
              </p>
            </div>

            {/* Supported App Badges */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-800 dark:text-slate-200 shadow-sm">
                🔵 Google Pay
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-purple-700 dark:text-purple-300 shadow-sm">
                💜 PhonePe
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-sky-700 dark:text-sky-300 shadow-sm">
                🔷 Paytm
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300 shadow-sm">
                💳 All Cards
              </span>
            </div>

            <div className="p-3 bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-indigo-100 dark:border-indigo-900 text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between">
              <span>Amount payable:</span>
              <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-sm">
                ₹{subtotal.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Optional Notes */}
        <div className="mb-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            Special Instructions / Pickup Note (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Please staple top-left or punch holes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs sm:text-sm focus:border-purple-600 focus:outline-none"
          />
        </div>

        {errorMessage && (
          <div className="mb-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Submit Action Button */}
        <button
          type="button"
          onClick={handleCheckout}
          disabled={isProcessing || (paymentMethod === 'WALLET' && !isWalletSufficient)}
          className={`w-full py-3.5 px-5 rounded-2xl text-white font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 ${
            paymentMethod === 'RAZORPAY'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-indigo-500/25 hover:shadow-indigo-500/35'
              : paymentMethod === 'SHOP_UPI_QR'
              ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/25 hover:shadow-purple-500/35'
              : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25 hover:shadow-emerald-500/35'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isProcessing ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" />
              <span>
                {paymentMethod === 'RAZORPAY'
                  ? `🚀 Pay ₹${subtotal.toFixed(2)} with Razorpay (Instant UPI)`
                  : paymentMethod === 'SHOP_UPI_QR'
                  ? `📸 Submit Order with Payment Proof (₹${subtotal.toFixed(2)})`
                  : `👛 Pay ₹${subtotal.toFixed(2)} from PrintHub Wallet`}
              </span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <p className="text-[11px] text-center text-slate-400 dark:text-slate-500 mt-2.5 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          {paymentMethod === 'RAZORPAY'
            ? '100% Encrypted & Verified by Razorpay Payment Gateway'
            : `Direct Settlement to ${selectedShop?.name}'s Account (${selectedShop?.upiId})`}
        </p>
      </div>
    </div>
  );
};
