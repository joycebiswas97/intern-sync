import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../utils/cn';

// Simple toast for initial scaffolding. 
// Recommend using react-hot-toast or similar later for managing multiple toasts.
export function Toast({ message, type = 'info', onClose, duration = 3000 }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for fade out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const typeStyles = {
    success: 'bg-green-50 text-green-800 border-green-200',
    error: 'bg-red-50 text-red-800 border-red-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200',
  };

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 flex items-center p-4 mb-4 rounded-lg border shadow-sm transition-opacity duration-300",
        typeStyles[type],
        isVisible ? "opacity-100" : "opacity-0"
      )}
      role="alert"
    >
      <div className="ms-3 text-sm font-medium">
        {message}
      </div>
      <button 
        type="button" 
        onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 300);
        }}
        className={cn(
          "ms-auto -mx-1.5 -my-1.5 rounded-lg p-1.5 inline-flex items-center justify-center h-8 w-8 hover:bg-black/5 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-current",
        )}
        aria-label="Close"
      >
        <span className="sr-only">Close</span>
        <svg className="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
        </svg>
      </button>
    </div>
  );
}

Toast.propTypes = {
  message: PropTypes.string.isRequired,
  type: PropTypes.oneOf(['success', 'error', 'info']),
  onClose: PropTypes.func.isRequired,
  duration: PropTypes.number,
};
