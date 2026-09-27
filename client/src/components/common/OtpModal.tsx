import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Mail, RefreshCw, KeyRound, Copy, Check } from 'lucide-react';
import { api } from '../../services/api.js';

interface OtpModalProps {
  isOpen: boolean;
  email: string;
  debugOtp?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const OtpModal: React.FC<OtpModalProps> = ({
  isOpen,
  email,
  debugOtp: initialDebugOtp,
  onSuccess,
  onCancel
}) => {
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [debugOtp, setDebugOtp] = useState<string | undefined>(initialDebugOtp);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(30);

  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setDebugOtp(initialDebugOtp);
  }, [initialDebugOtp]);

  useEffect(() => {
    if (isOpen) {
      setOtp(['', '', '', '', '', '']);
      setErrorMessage('');
      setResendCooldown(30);
      setTimeout(() => inputsRef.current[0]?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  if (!isOpen) return null;

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setErrorMessage('');

    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setOtp(digits);
      inputsRef.current[5]?.focus();
    }
  };

  const handleAutoFillDevOtp = () => {
    if (debugOtp && debugOtp.length === 6) {
      setOtp(debugOtp.split(''));
      inputsRef.current[5]?.focus();
    }
  };

  const handleCopyDevOtp = () => {
    if (debugOtp) {
      navigator.clipboard.writeText(debugOtp);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fullOtp = otp.join('');
    if (fullOtp.length !== 6) {
      setErrorMessage('Please enter all 6 digits of the verification code.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await api.post('/auth/verify-otp', {
        email,
        otp: fullOtp
      });

      if (res.data.success) {
        if (res.data.token && res.data.user) {
          sessionStorage.setItem('printhub_token', res.data.token);
          sessionStorage.setItem('printhub_user', JSON.stringify(res.data.user));
        }
        onSuccess();
      } else {
        setErrorMessage(res.data.message || 'Invalid code');
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      const res = await api.post('/auth/send-otp', { email });
      if (res.data.success) {
        setResendCooldown(30);
        if (res.data.debugOtp) {
          setDebugOtp(res.data.debugOtp);
        }
      }
    } catch (err) {
      setErrorMessage('Failed to resend code');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto mb-3 shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Verify Your Account</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-center gap-1">
            <Mail className="w-4 h-4 text-indigo-500" />
            <span>Code sent to <strong className="text-slate-700 dark:text-slate-300">{email}</strong></span>
          </p>
        </div>

        {/* On-screen OTP Dev Fallback Box */}
        {debugOtp && (
          <div className="mb-5 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
              <KeyRound className="w-4 h-4 text-amber-600" />
              <span>
                Dev OTP: <strong className="font-mono text-sm tracking-widest font-bold">{debugOtp}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleAutoFillDevOtp}
                className="px-2 py-1 text-xs font-semibold bg-amber-200 dark:bg-amber-800/60 text-amber-900 dark:text-amber-100 rounded-lg hover:bg-amber-300 transition-colors"
              >
                Auto-fill
              </button>
              <button
                type="button"
                onClick={handleCopyDevOtp}
                className="p-1 text-amber-700 dark:text-amber-300 hover:text-amber-900 rounded"
                title="Copy OTP"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center gap-2.5 sm:gap-3" onPaste={handlePaste}>
            {otp.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (inputsRef.current[idx] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-12 h-14 sm:w-13 sm:h-16 text-center text-2xl font-bold font-mono rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:border-indigo-600 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none transition-all shadow-sm"
              />
            ))}
          </div>

          {errorMessage && (
            <p className="text-xs text-rose-500 dark:text-rose-400 text-center font-medium">
              {errorMessage}
            </p>
          )}

          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Didn't receive the code?</span>
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0}
              className={`flex items-center gap-1 font-semibold ${
                resendCooldown > 0
                  ? 'text-slate-400 cursor-not-allowed'
                  : 'text-indigo-600 dark:text-indigo-400 hover:underline'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resendCooldown > 0 ? 'animate-spin' : ''}`} />
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
            </button>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || otp.some((d) => !d)}
              className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Verify & Proceed'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
