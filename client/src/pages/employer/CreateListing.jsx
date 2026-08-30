import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getMyProfile } from '../../api/employers';
import { createListing } from '../../api/listings';

import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorState } from '../../components/ui/ErrorState';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ListingForm } from './components/ListingForm';
import { Toast } from '../../components/ui/Toast';

export default function CreateListing() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [toast, setToast] = React.useState(null);

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['employerProfile', 'me'],
    queryFn: getMyProfile,
    initialData: () => {
      // Mock data for dev
      if (process.env.NODE_ENV === 'development') {
        return {
          id: 'emp-123',
          verificationStatus: 'APPROVED', // Mocked to APPROVED so we can test form
        };
      }
      return undefined;
    }
  });

  const { mutate: submitListing, isPending } = useMutation({
    mutationFn: createListing,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employerListings', 'mine'] });
      setToast({ message: 'Listing created successfully!', type: 'success' });
      setTimeout(() => navigate('/employer/dashboard'), 1500);
    },
    onError: (error) => {
      setToast({ 
        message: error.response?.data?.message || 'Failed to create listing.', 
        type: 'error' 
      });
    }
  });

  if (isLoading) return <LoadingSpinner fullPage />;

  if (isError) {
    return <ErrorState title="Failed to verify employer status" />;
  }

  // NOTE: This check is purely UX. The real enforcement must happen on the backend server 
  // where the POST /api/listings endpoint rejects requests from unverified employers.
  if (profile?.verificationStatus !== 'APPROVED') {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <Card className="bg-orange-50 border-orange-200">
          <Card.Content className="text-center py-12">
            <svg className="mx-auto h-16 w-16 text-orange-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-xl font-bold text-orange-900 mb-2">Verification Required</h2>
            <p className="text-orange-800 mb-6 max-w-lg mx-auto">
              You must complete your company profile and be approved by an administrator before you can post new internship or job listings.
            </p>
            <Button variant="primary" onClick={() => window.location.href = '/employer/profile'}>
              Complete Profile
            </Button>
          </Card.Content>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Post a New Listing</h1>
      
      <ListingForm 
        onSubmit={(data) => submitListing(data)}
        isSubmitting={isPending}
      />

      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  );
}
