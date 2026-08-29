import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getListingApplications, updateApplicationStatus } from '../../api/applications';

import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Select';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { Toast } from '../../components/ui/Toast';

const STATUS_OPTIONS = [
  'APPLIED',
  'SHORTLISTED',
  'INTERVIEW',
  'OFFERED',
  'REJECTED',
  'WITHDRAWN'
];

export default function Applicants() {
  const { id: listingId } = useParams();
  const queryClient = useQueryClient();
  const [toast, setToast] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');

  const { data: applicants, isLoading, isError, refetch } = useQuery({
    queryKey: ['applications', 'listing', listingId, filterStatus],
    queryFn: () => getListingApplications({ listingId, status: filterStatus }),
    initialData: () => {
      if (process.env.NODE_ENV === 'development') {
        let results = [
          {
            id: 'app-1',
            student: { id: 's-1', fullName: 'Alice Smith', email: 'alice@example.com' },
            coverLetter: 'I love React and would love to work here.',
            status: 'APPLIED',
            appliedAt: '2026-08-28T10:00:00Z'
          },
          {
            id: 'app-2',
            student: { id: 's-2', fullName: 'Bob Jones', email: 'bob@example.com' },
            coverLetter: 'I have 2 years of experience with Node.js.',
            status: 'SHORTLISTED',
            appliedAt: '2026-08-25T14:30:00Z'
          },
          {
            id: 'app-3',
            student: { id: 's-3', fullName: 'Charlie Davis', email: 'charlie@example.com' },
            coverLetter: '',
            status: 'REJECTED',
            appliedAt: '2026-08-15T09:15:00Z'
          }
        ];
        if (filterStatus) results = results.filter(r => r.status === filterStatus);
        return results;
      }
      return undefined;
    }
  });

  const { mutate: updateStatus } = useMutation({
    mutationFn: updateApplicationStatus,
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['applications', 'listing', listingId, filterStatus] });
      const previousApplicants = queryClient.getQueryData(['applications', 'listing', listingId, filterStatus]);
      
      queryClient.setQueryData(['applications', 'listing', listingId, filterStatus], old => 
        old?.map(app => app.id === id ? { ...app, status } : app)
      );
      
      return { previousApplicants };
    },
    onSuccess: () => {
      setToast({ message: 'Status updated', type: 'success' });
    },
    onError: (error, variables, context) => {
      queryClient.setQueryData(['applications', 'listing', listingId, filterStatus], context.previousApplicants);
      setToast({ message: 'Failed to update status', type: 'error' });
    }
  });

  const handleStatusChange = (appId, newStatus) => {
    updateStatus({ id: appId, status: newStatus });
  };

  // Enforces state transitions per PRD: APPLIED -> SHORTLISTED -> INTERVIEW -> OFFERED/REJECTED
  const getAvailableTransitions = (currentStatus) => {
    if (currentStatus === 'REJECTED' || currentStatus === 'WITHDRAWN') {
      return [currentStatus]; // Terminal states
    }
    
    if (currentStatus === 'APPLIED') return ['APPLIED', 'SHORTLISTED', 'REJECTED'];
    if (currentStatus === 'SHORTLISTED') return ['SHORTLISTED', 'INTERVIEW', 'REJECTED'];
    if (currentStatus === 'INTERVIEW') return ['INTERVIEW', 'OFFERED', 'REJECTED'];
    if (currentStatus === 'OFFERED') return ['OFFERED', 'REJECTED'];
    
    return [currentStatus];
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          {/* Back link */}
          <Link to="/employer/dashboard" className="text-sm font-medium text-primary-600 hover:text-primary-800 flex items-center mb-4">
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Manage Applicants</h1>
          <p className="mt-2 text-sm text-gray-500">
            Review and manage candidates who have applied to your listing.
          </p>
        </div>
        
        <div className="w-48">
          <Select
            label="Filter Status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            options={[
              { value: '', label: 'All Statuses' },
              ...STATUS_OPTIONS.map(status => ({ value: status, label: status }))
            ]}
          />
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner fullPage />
      ) : isError ? (
        <ErrorState title="Failed to load applicants" onRetry={refetch} />
      ) : !applicants || applicants.length === 0 ? (
        <EmptyState
          title={filterStatus ? `No ${filterStatus.toLowerCase()} applicants` : "No applicants yet"}
          description={filterStatus ? "Try changing your filter to see more candidates." : "When students apply to your listing, they will appear here."}
        />
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.Head>Candidate</Table.Head>
              <Table.Head>Applied Date</Table.Head>
              <Table.Head>Cover Letter</Table.Head>
              <Table.Head>Status</Table.Head>
              <Table.Head>Action</Table.Head>
            </Table.Row>
          </Table.Header>
          <tbody>
            {applicants.map((app) => {
              const allowedStates = getAvailableTransitions(app.status);
              
              return (
                <Table.Row key={app.id}>
                  <Table.Cell>
                    <div className="font-medium text-gray-900">{app.student.fullName}</div>
                    <div className="text-sm text-gray-500">{app.student.email}</div>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-sm text-gray-700">
                      {new Date(app.appliedAt).toLocaleDateString()}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="text-sm text-gray-600 max-w-xs truncate" title={app.coverLetter}>
                      {app.coverLetter || <span className="italic text-gray-400">None provided</span>}
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge status={app.status}>{app.status}</Badge>
                  </Table.Cell>
                  <Table.Cell>
                    {app.status === 'WITHDRAWN' ? (
                      <span className="text-sm text-gray-500 italic">Withdrawn by candidate</span>
                    ) : (
                      <select
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        value={app.status}
                        onChange={(e) => handleStatusChange(app.id, e.target.value)}
                        disabled={app.status === 'REJECTED'}
                      >
                        {STATUS_OPTIONS.map(option => (
                          <option 
                            key={option} 
                            value={option}
                            disabled={!allowedStates.includes(option) && option !== app.status}
                          >
                            {option}
                          </option>
                        ))}
                      </select>
                    )}
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </tbody>
        </Table>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
