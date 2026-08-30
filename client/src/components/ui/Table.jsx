import React from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../utils/cn';

export function Table({ className, children, ...props }) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
      <table className={cn("w-full text-sm text-left text-gray-500", className)} {...props}>
        {children}
      </table>
    </div>
  );
}

Table.Header = function TableHeader({ className, children, ...props }) {
  return (
    <thead className={cn("text-xs text-gray-700 uppercase bg-gray-50", className)} {...props}>
      {children}
    </thead>
  );
};

Table.Row = function TableRow({ className, children, ...props }) {
  return (
    <tr className={cn("bg-white border-b hover:bg-gray-50 transition-colors", className)} {...props}>
      {children}
    </tr>
  );
};

Table.Head = function TableHead({ className, children, ...props }) {
  return (
    <th scope="col" className={cn("px-6 py-3 font-medium text-gray-900 whitespace-nowrap", className)} {...props}>
      {children}
    </th>
  );
};

Table.Cell = function TableCell({ className, children, ...props }) {
  return (
    <td className={cn("px-6 py-4", className)} {...props}>
      {children}
    </td>
  );
};

Table.propTypes = { className: PropTypes.string, children: PropTypes.node };
Table.Header.propTypes = { className: PropTypes.string, children: PropTypes.node };
Table.Row.propTypes = { className: PropTypes.string, children: PropTypes.node };
Table.Head.propTypes = { className: PropTypes.string, children: PropTypes.node };
Table.Cell.propTypes = { className: PropTypes.string, children: PropTypes.node };
