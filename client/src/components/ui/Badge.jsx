import React from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../utils/cn';

const variantStyles = {
  default: 'bg-gray-100 text-gray-800',
  primary: 'bg-primary-100 text-primary-800',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  danger: 'bg-red-100 text-red-800',
};

// Map domain statuses to variants
const statusVariantMap = {
  ACTIVE: 'success',
  APPROVED: 'success',
  PENDING: 'warning',
  PENDING_REVIEW: 'warning',
  DRAFT: 'default',
  REJECTED: 'danger',
  CLOSED: 'default',
  EXPIRED: 'default',
  APPLIED: 'primary',
  SHORTLISTED: 'success',
  INTERVIEW: 'warning',
  OFFERED: 'success',
  WITHDRAWN: 'default',
};

export function Badge({ children, variant, status, className, ...props }) {
  const badgeVariant = status ? (statusVariantMap[status] || 'default') : (variant || 'default');

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        variantStyles[badgeVariant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

Badge.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['default', 'primary', 'success', 'warning', 'danger']),
  status: PropTypes.string, // If provided, overrides variant based on domain mapping
  className: PropTypes.string,
};
