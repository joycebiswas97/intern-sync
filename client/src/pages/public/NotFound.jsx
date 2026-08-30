import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="text-primary-600 font-bold text-9xl mb-4">404</div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Page Not Found</h1>
      <p className="text-gray-600 mb-8 max-w-md">
        We couldn't find the page you're looking for. It might have been removed, renamed, or doesn't exist.
      </p>
      <div className="flex gap-4">
        <Button variant="outline" onClick={() => window.history.back()}>
          Go Back
        </Button>
        <Link to="/">
          <Button variant="primary">
            Return Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
