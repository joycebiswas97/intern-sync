import React from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../utils/cn';

export function LoadingSpinner({ size = 'md', className, fullPage = false }) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4',
  };

  const spinner = (
    <div
      className={cn(
        "animate-spin rounded-full border-gray-300 border-t-primary-600",
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );

  if (fullPage) {
    return (
      <div className="flex h-[50vh] min-h-[400px] w-full items-center justify-center">
        {spinner}
      </div>
    );
  }

  return spinner;
}

LoadingSpinner.propTypes = {
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  className: PropTypes.string,
  fullPage: PropTypes.bool,
};
