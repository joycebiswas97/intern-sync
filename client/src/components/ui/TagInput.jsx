import React, { useState, forwardRef } from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../utils/cn';

export const TagInput = forwardRef(({ value = [], onChange, label, error, id, placeholder = "Type and press Enter", ...props }, ref) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = inputValue.trim();
      if (newTag && !value.includes(newTag)) {
        onChange([...value, newTag]);
      }
      setInputValue('');
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      e.preventDefault();
      onChange(value.slice(0, -1));
    }
  };

  const removeTag = (indexToRemove) => {
    onChange(value.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div 
        className={cn(
          "flex flex-wrap items-center gap-2 min-h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent transition-colors",
          error && "border-red-500 focus-within:ring-red-500",
          props.disabled && "cursor-not-allowed opacity-50 bg-gray-50"
        )}
      >
        {value.map((tag, index) => (
          <span 
            key={index} 
            className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary-100 text-primary-800"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(index)}
              disabled={props.disabled}
              className="ml-1 text-primary-600 hover:text-primary-900 focus:outline-none"
              aria-label={`Remove ${tag}`}
            >
              &times;
            </button>
          </span>
        ))}
        <input
          id={id}
          ref={ref}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ''}
          disabled={props.disabled}
          className="flex-grow bg-transparent border-none focus:outline-none text-sm p-0 min-w-[120px] placeholder:text-gray-400"
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
});

TagInput.displayName = 'TagInput';

TagInput.propTypes = {
  value: PropTypes.arrayOf(PropTypes.string),
  onChange: PropTypes.func.isRequired,
  label: PropTypes.string,
  error: PropTypes.string,
  id: PropTypes.string,
  placeholder: PropTypes.string,
  disabled: PropTypes.bool,
};
