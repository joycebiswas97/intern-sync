import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getMyListings, closeListing } from '../../api/listings';

import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { Toast } from '../../components/ui/Toast';

export default function EmployerListings() {
  const queryClient = useQueryClient();
  const [toast, setToast] = useState(null);
  const [listingToClose, setListingToClose] = useState(null);

  const { data: listings, isLoading, isError, refetch } = useQuery({
    queryKey: ['employerListings', 'mine'],
    queryFn: getMyListings,
    initialData: () => {
      // Mock data for dev
      if (process.env.NODE_ENV === 'development') {
        return [
          {
            id: 'list-1',
            title: 'Frontend React Intern',
            type: 'INTERNSHIP',
            status: 'ACTIVE',
            applicationDeadline: '2026-12-31T00:00:00Z',
            createdAt: '2026-08-20T00:00:00Z',
          },
          {
            id: 'list-2',
            title: 'Backend Engineer',
            type: 'JOB',
            status: 'PENDING_REVIEW',
            applicationDeadline: '2026-11-15T00:00:00Z',
            createdAt: '2026-08-25T00:00:00Z',
          },
          {
            id: 'list-3',
            title: 'UI/UX Designer',
            type: 'INTERNSHIP',
            status: 'DRAFT',
            applicationDeadline: '2026-10-01T00:00:00Z',
            createdAt: '2026-08-28T00:00:00Z',
          }
        ];
      }
      return undefined;
    }
  });

  const { mutate: closeListingMutation, isPending: isClosing } = useMutation({
    mutationFn: closeListing,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employerListings', 'mine'] });
      setToast({ message: 'Listing closed successfully', type: 'success' });
      setListingToClose(null);
    },
    onError: (error) => {
      setToast({ 
        message: error.response?.data?.message || 'Failed to close listing', 
        type: 'error' 
      });
      setListingToClose(null);
    }
  });

  const confirmClose = () => {
    if (listingToClose) {
      closeListingMutation(listingToClose.id);
    }
  };

  if (isLoading) return <LoadingSpinner fullPage />;
  
  if (isError) return <ErrorState title="Failed to load listings" onRetry={refetch} className="mt-8" />;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Listings Dashboard</h1>
          <p className="mt-2 text-sm text-gray-500">
            Manage your job and internship postings, view applicants, and track status.
          </p>
        </div>
        <div>
          <Link to="/employer/listings/new">
            <Button variant="primary">Post New Listing</Button>
          </Link>
        </div>
      </div>

      {!listings || listings.length === 0 ? (
        <EmptyState
          title="No listings found"
          description="You haven't posted any jobs or internships yet."
          action={
            <Link to="/employer/listings/new">
              <Button variant="primary">Post your first listing</Button>
            </Link>
          }
          icon={
            <svg className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5L16.5 5.5M9 11l3 3L22 4" />
            </svg>
          }
        />
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.Head>Title</Table.Head>
              <Table.Head>Type</Table.Head>
              <Table.Head>Status</Table.Head>
              <Table.Head>Deadline</Table.Head>
              <Table.Head>Actions</Table.Head>
            </Table.Row>
          </Table.Header>
          <tbody>
            {listings.map((listing) => (
              <Table.Row key={listing.id}>
                <Table.Cell>
                  <div className="font-medium text-gray-900">{listing.title}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Posted on {new Date(listing.createdAt).toLocaleDateString()}
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <Badge variant="default">{listing.type}</Badge>
                </Table.Cell>
                <Table.Cell>
                  <Badge status={listing.status}>{listing.status.replace('_', ' ')}</Badge>
                </Table.Cell>
                <Table.Cell>
                  <span className="text-sm text-gray-700">
                    {listing.applicationDeadline ? new Date(listing.applicationDeadline).toLocaleDateString() : 'N/A'}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex items-center space-x-3">
                    <Link 
                      to={`/employer/listings/${listing.id}/edit`}
                      className="text-primary-600 hover:text-primary-900 text-sm font-medium"
                    >
                      Edit
                    </Link>
                    
                    {(listing.status === 'ACTIVE' || listing.status === 'EXPIRED') && (
                      <>
                        <span className="text-gray-300">|</span>
                        <Link 
                          to={`/employer/listings/${listing.id}/applicants`}
                          className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                        >
                          Applicants
                        </Link>
                      </>
                    )}

                    {(listing.status === 'ACTIVE' || listing.status === 'PENDING_REVIEW') && (
                      <>
                        <span className="text-gray-300">|</span>
                        <button
                          onClick={() => setListingToClose(listing)}
                          className="text-red-600 hover:text-red-900 text-sm font-medium focus:outline-none"
                        >
                          Close
                        </button>
                      </>
                    )}
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
          </tbody>
        </Table>
      )}

      {/* Confirmation Modal for Closing a Listing */}
      <Modal
        isOpen={!!listingToClose}
        onClose={() => setListingToClose(null)}
        title="Close Listing"
      >
        <p className="text-sm text-gray-500 mb-6">
          Are you sure you want to close "{listingToClose?.title}"? You will not receive any new applications, but you can still view existing applicants. This action cannot be undone.
        </p>
        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={() => setListingToClose(null)} disabled={isClosing}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmClose} isLoading={isClosing}>
            Close Listing
          </Button>
        </div>
      </Modal>

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
