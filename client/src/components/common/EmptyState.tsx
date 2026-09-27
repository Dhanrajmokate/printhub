import React from 'react';
import { LucideIcon, FileText } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  zeroStat?: string;
  zeroStatLabel?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = FileText,
  title,
  description,
  actionText,
  onAction,
  zeroStat,
  zeroStatLabel
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
      <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 shadow-sm">
        <Icon className="w-7 h-7" />
      </div>
      
      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-4">{description}</p>

      {zeroStat && (
        <div className="my-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
          <span className="text-xl font-extrabold text-slate-700 dark:text-slate-300 font-mono">{zeroStat}</span>
          {zeroStatLabel && (
            <span className="text-xs text-slate-400 dark:text-slate-500 ml-2 uppercase tracking-wider font-semibold">
              {zeroStatLabel}
            </span>
          )}
        </div>
      )}

      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-3 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
