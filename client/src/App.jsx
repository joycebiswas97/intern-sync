import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { Button } from './components/ui/Button';
import Profile from './pages/student/Profile';
import EmployerProfile from './pages/employer/Profile';
import CreateListing from './pages/employer/CreateListing';
import EmployerListings from './pages/employer/Listings';
import EditListing from './pages/employer/EditListing';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import VerifyEmail from './pages/auth/VerifyEmail';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

import BrowseListings from './pages/public/BrowseListings';
import ListingDetail from './pages/public/ListingDetail';
import SavedListings from './pages/student/SavedListings';
import StudentApplications from './pages/student/Applications';
import EmployerApplicants from './pages/employer/Applicants';

import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminAnalytics from './pages/admin/Analytics';

import NotFound from './pages/public/NotFound';
import NotAuthorized from './pages/public/NotAuthorized';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

import Home from './pages/public/Home';

function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Home />} />
        
        {/* Public / Common Routes */}
        <Route path="/listings" element={<BrowseListings />} />
        <Route path="/listings/:id" element={<ListingDetail />} />
        <Route path="/unauthorized" element={<NotAuthorized />} />
        
        {/* Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/signup" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Student Routes */}
        <Route element={<ProtectedRoute allowedRoles={['STUDENT']} />}>
          <Route path="/profile" element={<Profile />} />
          <Route path="/saved-listings" element={<SavedListings />} />
          <Route path="/applications" element={<StudentApplications />} />
        </Route>

        {/* Employer Routes */}
        <Route element={<ProtectedRoute allowedRoles={['EMPLOYER']} />}>
          <Route path="/employer/profile" element={<EmployerProfile />} />
          <Route path="/employer/dashboard" element={<EmployerListings />} />
          <Route path="/employer/listings/new" element={<CreateListing />} />
          <Route path="/employer/listings/:id/edit" element={<EditListing />} />
          <Route path="/employer/listings/:id/applicants" element={<EmployerApplicants />} />
        </Route>

        {/* Admin Routes */}
        <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
        </Route>

        {/* 404 Catch All */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppShell>
  );
}

export default App;
