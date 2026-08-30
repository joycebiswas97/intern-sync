import React from 'react';

export function TrustStrip() {
  return (
    <div className="bg-white py-12 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm font-semibold uppercase text-gray-500 tracking-wide mb-8">
          Trusted by top companies
        </p>
        <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-60 grayscale">
          {/* Placeholder Logos */}
          <div className="flex items-center justify-center h-12 px-6 bg-gray-50 text-gray-400 font-bold text-xl rounded shadow-sm">COMPANY A</div>
          <div className="flex items-center justify-center h-12 px-6 bg-gray-50 text-gray-400 font-bold text-xl rounded shadow-sm">TECH CORP</div>
          <div className="flex items-center justify-center h-12 px-6 bg-gray-50 text-gray-400 font-bold text-xl rounded shadow-sm">STARTUP X</div>
          <div className="flex items-center justify-center h-12 px-6 bg-gray-50 text-gray-400 font-bold text-xl rounded shadow-sm">GLOBAL ORG</div>
          <div className="flex items-center justify-center h-12 px-6 bg-gray-50 text-gray-400 font-bold text-xl rounded shadow-sm">INNOVATE</div>
        </div>
      </div>
    </div>
  );
}
