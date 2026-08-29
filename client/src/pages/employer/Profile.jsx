import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMyProfile } from '../../api/employers';

import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorState } from '../../components/ui/ErrorState';
import { VerificationStatusBanner } from './components/VerificationStatusBanner';
import { LogoUploader } from './components/LogoUploader';
import { EmployerProfileForm } from './components/EmployerProfileForm';

export default function EmployerProfile() {
  const { data: profile, isLoading, isError, refetch } = useQuery({
    queryKey: ['employerProfile', 'me'],
    queryFn: getMyProfile,
    initialData: () => {
      // Mock data for dev
      if (process.env.NODE_ENV === 'development') {
        return {
          id: 'emp-123',
          companyName: 'Tech Innovators Inc.',
          industry: 'Software Development',
          verificationStatus: 'REJECTED', // PENDING, APPROVED, REJECTED
          rejectionReason: 'Please provide a valid company website and a detailed description.',
        };
      }
      return undefined;
    }
  });

  if (isLoading) return <LoadingSpinner fullPage />;

  if (isError) {
    return (
      <ErrorState 
        title="Failed to load profile" 
        onRetry={refetch}
        className="mt-8"
      />
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Company Profile</h1>
        <p className="mt-2 text-sm text-gray-500">
          Manage your company's public profile and verification status.
        </p>
      </div>

      <VerificationStatusBanner 
        status={profile?.verificationStatus} 
        rejectionReason={profile?.rejectionReason} 
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <LogoUploader currentLogoUrl={profile?.companyLogoUrl} />
          
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h4 className="text-gray-900 font-semibold mb-2">Verification Process</h4>
            <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
              <li>Fill out all company details accurately.</li>
              <li>Upload a clear, high-resolution company logo.</li>
              <li>Ensure your website URL is valid and active.</li>
            </ul>
          </div>
        </div>

        <div className="lg:col-span-2">
          <EmployerProfileForm initialData={profile} />
        </div>
      </div>
    </div>
  );
}
