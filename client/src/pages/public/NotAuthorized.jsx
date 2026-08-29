import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';

export default function NotAuthorized() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="text-red-500 font-bold text-9xl mb-4">403</div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Access Denied</h1>
      <p className="text-gray-600 mb-8 max-w-md">
        You do not have permission to view this page. Please make sure you are logged in with the correct account type.
      </p>
      <div className="flex gap-4">
        <Link to="/login">
          <Button variant="outline">
            Switch Accounts
          </Button>
        </Link>
        <Link to="/">
          <Button variant="primary">
            Return Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
