import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getListing, saveListing, unsaveListing } from '../../api/listings';
import { useAuthStore } from '../../store/authStore';

import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorState } from '../../components/ui/ErrorState';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Toast } from '../../components/ui/Toast';
import { ApplyModal } from './components/ApplyModal';

export default function ListingDetail() {
  const { id } = useParams();
  const { isAuthenticated, role } = useAuthStore();
  const queryClient = useQueryClient();
  const [toast, setToast] = useState(null);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

  const { data: listing, isLoading, isError, refetch } = useQuery({
    queryKey: ['listing', id],
    queryFn: async () => {
      if (process.env.NODE_ENV === 'development') {
        await new Promise(resolve => setTimeout(resolve, 300));
        return {
          id,
          title: 'Frontend Engineer Intern',
          type: 'INTERNSHIP',
          companyName: 'TechCorp Inc.',
          companyLogoUrl: null,
          description: 'We are looking for a passionate frontend engineer intern to join our core product team. You will be working with React, Tailwind CSS, and TanStack Query to build beautiful user interfaces.',
          responsibilities: ['Build reusable UI components', 'Optimize application performance', 'Collaborate with designers'],
          skillsRequired: ['React', 'JavaScript', 'HTML/CSS', 'Git'],
          workMode: 'REMOTE',
          location: '',
          stipendOrSalaryMin: 4000,
          stipendOrSalaryMax: 5000,
          currency: 'USD',
          durationMonths: 3,
          openings: 2,
          applicationDeadline: '2026-12-31T00:00:00Z',
          perks: ['Flexible hours', 'Mentorship program', 'Free hardware'],
          status: 'ACTIVE',
          createdAt: '2026-08-20T00:00:00Z',
          isSaved: false // Client mock state
        };
      }
      return getListing(id);
    }
  });

  const { mutate: toggleSave, isPending: isSaving } = useMutation({
    mutationFn: () => listing?.isSaved ? unsaveListing(id) : saveListing(id),
    onMutate: async () => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['listing', id] });
      const previousListing = queryClient.getQueryData(['listing', id]);
      queryClient.setQueryData(['listing', id], old => ({ ...old, isSaved: !old.isSaved }));
      return { previousListing };
    },
    onError: (err, newListing, context) => {
      queryClient.setQueryData(['listing', id], context.previousListing);
      setToast({ message: 'Failed to update saved status', type: 'error' });
    }
  });

  if (isLoading) return <LoadingSpinner fullPage />;
  if (isError || !listing) return <ErrorState title="Listing not found" onRetry={refetch} />;

  return (
    <div className="max-w-4xl mx-auto py-8">
      {/* Back button */}
      <div className="mb-6">
        <Link to="/listings" className="text-sm font-medium text-primary-600 hover:text-primary-800 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Search
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header Section */}
        <div className="p-8 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
            <div className="flex items-start gap-6">
              <div className="h-20 w-20 rounded-lg bg-gray-50 border flex items-center justify-center text-gray-400 font-bold text-3xl flex-shrink-0">
                {listing.companyLogoUrl ? (
                  <img src={listing.companyLogoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                ) : (
                  listing.companyName.charAt(0)
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{listing.title}</h1>
                <p className="text-xl text-gray-600 mb-4">{listing.companyName}</p>
                <div className="flex flex-wrap gap-3">
                  <Badge variant="default">{listing.type === 'INTERNSHIP' ? 'Internship' : 'Full-time'}</Badge>
                  <Badge variant="success">{listing.workMode}</Badge>
                  {listing.location && <Badge variant="default">{listing.location}</Badge>}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:items-end gap-3 min-w-[140px]">
              {/* Apply Button */}
              {isAuthenticated && role === 'STUDENT' ? (
                <Button 
                  variant="primary" 
                  className="w-full text-center justify-center"
                  onClick={() => setIsApplyModalOpen(true)}
                >
                  Apply Now
                </Button>
              ) : !isAuthenticated ? (
                <Link to="/login" className="w-full">
                  <Button variant="primary" className="w-full text-center justify-center">
                    Log in to Apply
                  </Button>
                </Link>
              ) : null}

              {/* Save Button (Students Only) */}
              {isAuthenticated && role === 'STUDENT' && (
                <Button 
                  variant="outline" 
                  className="w-full flex justify-center items-center gap-2"
                  onClick={() => toggleSave()}
                  disabled={isSaving}
                >
                  {listing.isSaved ? (
                    <>
                      <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                      </svg>
                      Saved
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                      Save
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Facts Strip */}
        <div className="bg-gray-50 p-6 grid grid-cols-2 md:grid-cols-4 gap-6 border-b border-gray-100">
          <div>
            <p className="text-sm text-gray-500 font-medium mb-1">Compensation</p>
            <p className="font-semibold text-gray-900">
              {listing.stipendOrSalaryMin ? 
                `${listing.stipendOrSalaryMin.toLocaleString()} ${listing.currency}` : 
                'Unpaid'
              }
              {listing.stipendOrSalaryMax ? ` - ${listing.stipendOrSalaryMax.toLocaleString()} ${listing.currency}` : ''}
              {listing.stipendOrSalaryMin && (listing.type === 'INTERNSHIP' ? '/mo' : '/yr')}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium mb-1">Duration</p>
            <p className="font-semibold text-gray-900">{listing.durationMonths ? `${listing.durationMonths} Months` : 'Permanent'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium mb-1">Openings</p>
            <p className="font-semibold text-gray-900">{listing.openings}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium mb-1">Deadline</p>
            <p className="font-semibold text-red-600">{new Date(listing.applicationDeadline).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Detailed Content */}
        <div className="p-8 space-y-10">
          <section>
            <h3 className="text-xl font-bold text-gray-900 mb-4">About the Role</h3>
            <div className="prose prose-primary max-w-none text-gray-600 whitespace-pre-wrap">
              {listing.description}
            </div>
          </section>

          {listing.responsibilities?.length > 0 && (
            <section>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Responsibilities</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                {listing.responsibilities.map((resp, i) => (
                  <li key={i}>{resp}</li>
                ))}
              </ul>
            </section>
          )}

          {listing.skillsRequired?.length > 0 && (
            <section>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Skills Required</h3>
              <div className="flex flex-wrap gap-2">
                {listing.skillsRequired.map(skill => (
                  <span key={skill} className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm font-medium">
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          )}

          {listing.perks?.length > 0 && (
            <section>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Perks & Benefits</h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-gray-600">
                {listing.perks.map((perk, i) => (
                  <li key={i} className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    {perk}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
      
      <ApplyModal 
        isOpen={isApplyModalOpen} 
        onClose={() => setIsApplyModalOpen(false)} 
        listing={listing} 
      />
      
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
