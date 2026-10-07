import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Image as ImageIcon, Trash2, Sliders, CheckCircle, AlertCircle } from 'lucide-react';
import { UploadedFileMeta, PrintSettings } from '../../types/index.js';
import { api } from '../../services/api.js';
import { useToast } from '../../context/ToastContext.js';

interface FileUploaderProps {
  files: { meta: UploadedFileMeta; settings: PrintSettings }[];
  onFilesChange: (files: { meta: UploadedFileMeta; settings: PrintSettings }[]) => void;
  onOpenSettings: (index: number) => void;
  onApplyToAll: () => void;
  defaultSettings: PrintSettings;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  files,
  onFilesChange,
  onOpenSettings,
  onApplyToAll,
  defaultSettings
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(Array.from(e.target.files));
    }
  };

  const uploadFiles = async (fileList: File[]) => {
    setIsUploading(true);
    const formData = new FormData();
    fileList.forEach((file) => {
      formData.append('files', file);
    });

    try {
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success && res.data.files) {
        const newUploadedItems = res.data.files.map((f: UploadedFileMeta) => ({
          meta: f,
          settings: { ...defaultSettings }
        }));

        onFilesChange([...files, ...newUploadedItems]);
        showToast('success', 'Upload Successful', `${fileList.length} file(s) analyzed.`);
      }
    } catch (err: any) {
      showToast('error', 'Upload Failed', err.response?.data?.message || 'Failed to upload files.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = (index: number) => {
    const updated = files.filter((_, i) => i !== index);
    onFilesChange(updated);
  };

  return (
    <div className="space-y-4">
      {/* Drag & Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 scale-[1.01]'
            : 'border-slate-300 dark:border-slate-700 bg-white/40 dark:bg-slate-900/40 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-slate-50/60 dark:hover:bg-slate-800/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,.webp,.txt"
          onChange={handleFileInput}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
            {isUploading ? (
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <UploadCloud className="w-8 h-8" />
            )}
          </div>

          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">
            {isUploading ? 'Analyzing documents & counting pages...' : 'Upload your print files'}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 max-w-sm">
            Drag & drop PDF, Word (DOCX), Text, or Images here, or browse from device
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-slate-400 dark:text-slate-500">
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              PDF (Auto Page Count)
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              Word / Docx
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              JPG / PNG / WEBP
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              Max 50MB
            </span>
          </div>
        </div>
      </div>

      {/* Uploaded Files Staging List with Per-File Settings & "Apply to All" */}
      {files.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 dark:text-slate-100">
                Staged Files ({files.length})
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold">
                {files.reduce((sum, f) => sum + f.meta.pageCount * f.settings.copies, 0)} Total Pages
              </span>
            </div>

            {files.length > 1 && (
              <button
                type="button"
                onClick={onApplyToAll}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5"
              >
                <Sliders className="w-3.5 h-3.5" />
                Apply 1st File Settings to All
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3">
            {files.map((item, idx) => {
              const isPdf = item.meta.fileType === 'pdf';
              const isImg = ['jpg', 'jpeg', 'png', 'webp', 'image'].includes(item.meta.fileType);

              return (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 hover:border-slate-300 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isPdf
                        ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                        : isImg
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                        : 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                    }`}>
                      {isImg ? <ImageIcon className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {item.meta.originalFileName}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded">
                          {item.meta.pageCount} {item.meta.pageCount === 1 ? 'Page' : 'Pages'}
                        </span>
                        <span>•</span>
                        <span>{(item.meta.fileSize / (1024 * 1024)).toFixed(2)} MB</span>
                        <span>•</span>
                        <span className="capitalize font-medium">
                          {item.settings.colorMode === 'COLOR' ? '🎨 Color' : '⬛ B&W'} • {item.settings.duplexMode === 'DUPLEX' ? 'Double-sided' : 'Single-sided'} • {item.settings.copies} {item.settings.copies === 1 ? 'copy' : 'copies'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => onOpenSettings(idx)}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-600 flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                      Configure
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemove(idx)}
                      className="p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 transition-colors"
                      title="Remove file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
