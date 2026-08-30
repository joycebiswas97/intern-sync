import React, { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../utils/cn';

export function FileUpload({ 
  onFileSelect, 
  accept = ".pdf,.doc,.docx", 
  maxSizeMB = 5,
  label = "Upload File",
  helperText = "PDF, DOC, DOCX up to 5MB"
}) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const validateFile = (file) => {
    setError(null);
    if (!file) return false;

    // Check size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      setError(`File is too large. Maximum size is ${maxSizeMB}MB.`);
      return false;
    }

    // Check type (rudimentary check using extension since mime types can be varied)
    const allowedExtensions = accept.split(',').map(ext => ext.trim().toLowerCase());
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension) && file.type !== 'application/pdf') {
       // Allow pdf mime explicitly or if extension matches
       if (!allowedExtensions.includes(fileExtension)) {
         setError(`Unsupported file type. Allowed types: ${accept}`);
         return false;
       }
    }

    return true;
  };

  const handleFiles = (files) => {
    if (files && files[0]) {
      const file = files[0];
      if (validateFile(file)) {
        onFileSelect(file);
      } else {
        onFileSelect(null);
      }
    }
  };

  const onDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleChange = (e) => {
    e.preventDefault();
    handleFiles(e.target.files);
  };

  return (
    <div className="w-full">
      <div 
        className={cn(
          "border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center transition-colors cursor-pointer",
          dragActive ? "border-primary-500 bg-primary-50" : "border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100",
          error && "border-red-500 bg-red-50 hover:border-red-600 hover:bg-red-50"
        )}
        onDragEnter={onDrag}
        onDragLeave={onDrag}
        onDragOver={onDrag}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') inputRef.current?.click() }}
      >
        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="flex text-sm text-gray-600 mt-4">
          <label
            htmlFor="file-upload"
            className="relative cursor-pointer bg-transparent rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
          >
            <span>{label}</span>
            <input
              id="file-upload"
              name="file-upload"
              type="file"
              className="sr-only"
              ref={inputRef}
              accept={accept}
              onChange={handleChange}
            />
          </label>
          <p className="pl-1">or drag and drop</p>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {helperText}
        </p>
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600 font-medium">{error}</p>
      )}
    </div>
  );
}

FileUpload.propTypes = {
  onFileSelect: PropTypes.func.isRequired,
  accept: PropTypes.string,
  maxSizeMB: PropTypes.number,
  label: PropTypes.string,
  helperText: PropTypes.string,
};
