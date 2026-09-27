import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'rectangular' | 'circular' | 'text' | 'card';
  count?: number;
}

export const SkeletonShimmer: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  count = 1
}) => {
  const baseClasses = 'relative overflow-hidden bg-slate-200 dark:bg-slate-800 rounded-lg';
  const shimmerOverlay = (
    <div className="absolute inset-0 -translate-x-full shimmer-effect" />
  );

  const getVariantClass = () => {
    switch (variant) {
      case 'circular':
        return 'rounded-full w-10 h-10';
      case 'text':
        return 'h-4 w-full rounded';
      case 'card':
        return 'h-36 w-full rounded-xl';
      default:
        return 'h-10 w-full';
    }
  };

  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className={`${baseClasses} ${getVariantClass()} ${className}`}
        >
          {shimmerOverlay}
        </div>
      ))}
    </>
  );
};
