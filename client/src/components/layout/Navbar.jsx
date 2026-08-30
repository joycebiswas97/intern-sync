import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../ui/Button';
import { NotificationBell } from './NotificationBell';

export function Navbar() {
  const { isAuthenticated, role, user, logout } = useAuthStore();

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-xl font-bold text-primary-600">
                InternSync
              </Link>
            </div>
            
            {/* Desktop Nav Links */}
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {!isAuthenticated && (
                <>
                  <Link to="/listings" className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
                    Find Opportunities
                  </Link>
                </>
              )}
              
              {isAuthenticated && role === 'STUDENT' && (
                <>
                  <Link to="/listings" className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
                    Browse Listings
                  </Link>
                  <Link to="/saved-listings" className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
                    Saved
                  </Link>
                  <Link to="/applications" className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
                    My Applications
                  </Link>
                </>
              )}
              
              {isAuthenticated && role === 'EMPLOYER' && (
                <>
                  <Link to="/employer/dashboard" className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
                    Dashboard
                  </Link>
                  <Link to="/employer/listings/new" className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
                    Post Listing
                  </Link>
                </>
              )}
              
              {isAuthenticated && role === 'ADMIN' && (
                <>
                  <Link to="/admin" className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
                    Dashboard
                  </Link>
                  <Link to="/admin/users" className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
                    Users
                  </Link>
                  <Link to="/admin/analytics" className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
                    Analytics
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Right side actions */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-4">
            {!isAuthenticated ? (
              <>
                <Link to="/login">
                  <Button variant="ghost">Log in</Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary">Sign up</Button>
                </Link>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <NotificationBell />
                <span className="text-sm text-gray-500 hidden sm:block">
                  {user?.fullName || user?.companyName || user?.email}
                </span>
                <Link to={role === 'EMPLOYER' ? '/employer/profile' : '/profile'}>
                  <Button variant="outline" size="sm">Profile</Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={logout}>
                  Log out
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
