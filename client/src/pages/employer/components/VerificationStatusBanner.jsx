import React from 'react';
import PropTypes from 'prop-types';

export function VerificationStatusBanner({ status, rejectionReason }) {
  if (!status) return null;

  if (status === 'APPROVED') {
    return (
      <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6 rounded-r-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-green-700 font-medium">
              Your company profile is approved. You can now post listings!
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'PENDING') {
    return (
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 rounded-r-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700 font-medium">
              Verification Pending
            </p>
            <p className="text-sm text-blue-600 mt-1">
              Your profile is currently under review by an administrator. You will not be able to post active listings until approved.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'REJECTED') {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded-r-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Verification Rejected</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>Reason: {rejectionReason || "No reason provided."}</p>
            </div>
            <div className="mt-4">
              <p className="text-sm text-red-700 font-semibold">
                Please update your profile information below to automatically request a re-review.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

VerificationStatusBanner.propTypes = {
  status: PropTypes.oneOf(['PENDING', 'APPROVED', 'REJECTED']),
  rejectionReason: PropTypes.string,
};
