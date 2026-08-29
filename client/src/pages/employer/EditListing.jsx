import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getListing, updateListing } from '../../api/listings';
import { getMyProfile } from '../../api/employers';

import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorState } from '../../components/ui/ErrorState';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ListingForm } from './components/ListingForm';
import { Toast } from '../../components/ui/Toast';

export default function EditListing() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [toast, setToast] = useState(null);

  // 1. Check employer verification status
  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['employerProfile', 'me'],
    queryFn: getMyProfile,
    initialData: () => {
      if (process.env.NODE_ENV === 'development') {
        return { verificationStatus: 'APPROVED' };
      }
      return undefined;
    }
  });

  // 2. Fetch listing data
  const { data: listing, isLoading: isListingLoading, isError } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => getListing(id),
    initialData: () => {
      // Mock data for dev
      if (process.env.NODE_ENV === 'development') {
        return {
          id,
          title: 'Frontend React Intern',
          type: 'INTERNSHIP',
          description: 'Looking for a talented frontend intern...',
          responsibilities: ['Build UI components', 'Write tests'],
          skillsRequired: ['React', 'JavaScript'],
          workMode: 'REMOTE',
          stipendOrSalaryMin: 15000,
          stipendOrSalaryMax: 20000,
          currency: 'INR',
          durationMonths: 6,
          openings: 2,
          applicationDeadline: '2026-12-31T00:00:00Z',
          perks: ['Flexible hours'],
          status: 'REJECTED',
          rejectionReason: 'Please increase the minimum stipend to meet platform guidelines.',
        };
      }
      return undefined;
    }
  });

  const { mutate: editListing, isPending } = useMutation({
    mutationFn: updateListing,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employerListings', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['listing', id] });
      setToast({ message: 'Listing updated successfully!', type: 'success' });
      // Short delay before navigating back to listings
      setTimeout(() => navigate('/employer/dashboard'), 1500);
    },
    onError: (error) => {
      setToast({ 
        message: error.response?.data?.message || 'Failed to update listing.', 
        type: 'error' 
      });
    }
  });

  if (isProfileLoading || isListingLoading) return <LoadingSpinner fullPage />;

  if (isError) return <ErrorState title="Failed to load listing" className="max-w-4xl mx-auto mt-8" />;

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
              Your company must be approved to edit active listings.
            </p>
            <Link to="/employer/profile">
              <Button variant="primary">View Profile</Button>
            </Link>
          </Card.Content>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-6">
        <Link to="/employer/dashboard" className="text-sm font-medium text-primary-600 hover:text-primary-800 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Listings
        </Link>
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Edit Listing</h1>
      
      <ListingForm 
        initialData={listing} 
        onSubmit={(data) => editListing({ id, data })}
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
