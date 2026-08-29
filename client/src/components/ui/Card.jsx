import React from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../utils/cn';

export function Card({ className, children, ...props }) {
  return (
    <div className={cn("bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden", className)} {...props}>
      {children}
    </div>
  );
}

Card.Header = function CardHeader({ className, children, ...props }) {
  return (
    <div className={cn("px-6 py-4 border-b border-gray-200", className)} {...props}>
      {children}
    </div>
  );
};

Card.Title = function CardTitle({ className, children, ...props }) {
  return (
    <h3 className={cn("text-lg font-semibold text-gray-900 leading-none tracking-tight", className)} {...props}>
      {children}
    </h3>
  );
};

Card.Content = function CardContent({ className, children, ...props }) {
  return (
    <div className={cn("p-6", className)} {...props}>
      {children}
    </div>
  );
};

Card.Footer = function CardFooter({ className, children, ...props }) {
  return (
    <div className={cn("px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center", className)} {...props}>
      {children}
    </div>
  );
};

Card.propTypes = { className: PropTypes.string, children: PropTypes.node };
Card.Header.propTypes = { className: PropTypes.string, children: PropTypes.node };
Card.Title.propTypes = { className: PropTypes.string, children: PropTypes.node };
Card.Content.propTypes = { className: PropTypes.string, children: PropTypes.node };
Card.Footer.propTypes = { className: PropTypes.string, children: PropTypes.node };
