import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getMyApplications, withdrawApplication } from '../../api/applications';

import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { Toast } from '../../components/ui/Toast';

export default function StudentApplications() {
  const queryClient = useQueryClient();
  const [toast, setToast] = useState(null);
  const [appToWithdraw, setAppToWithdraw] = useState(null);

  const { data: applications, isLoading, isError, refetch } = useQuery({
    queryKey: ['applications', 'mine'],
    queryFn: getMyApplications,
    initialData: () => {
      if (process.env.NODE_ENV === 'development') {
        return [
          {
            id: 'app-1',
            listing: { id: 'list-1', title: 'Frontend Engineer Intern', companyName: 'TechCorp' },
            status: 'APPLIED',
            appliedAt: '2026-08-25T10:00:00Z'
          },
          {
            id: 'app-2',
            listing: { id: 'list-2', title: 'Backend Intern', companyName: 'DataSys' },
            status: 'SHORTLISTED',
            appliedAt: '2026-08-20T14:30:00Z'
          },
          {
            id: 'app-3',
            listing: { id: 'list-3', title: 'UX Designer', companyName: 'Designify' },
            status: 'REJECTED',
            appliedAt: '2026-08-15T09:15:00Z'
          },
          {
            id: 'app-4',
            listing: { id: 'list-4', title: 'Product Manager Intern', companyName: 'InnovateInc' },
            status: 'OFFERED',
            appliedAt: '2026-08-01T11:00:00Z'
          }
        ];
      }
      return undefined;
    }
  });

  const { mutate: withdrawMut, isPending: isWithdrawing } = useMutation({
    mutationFn: withdrawApplication,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications', 'mine'] });
      setToast({ message: 'Application withdrawn successfully', type: 'success' });
      setAppToWithdraw(null);
    },
    onError: (error) => {
      setToast({ 
        message: error.response?.data?.message || 'Failed to withdraw application', 
        type: 'error' 
      });
      setAppToWithdraw(null);
    }
  });

  const confirmWithdraw = () => {
    if (appToWithdraw) {
      withdrawMut(appToWithdraw.id);
    }
  };

  const canWithdraw = (status) => {
    return !['OFFERED', 'REJECTED', 'WITHDRAWN'].includes(status);
  };

  if (isLoading) return <LoadingSpinner fullPage />;
  if (isError) return <ErrorState title="Failed to load applications" onRetry={refetch} className="mt-8" />;

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Applications</h1>
        <p className="mt-2 text-sm text-gray-500">
          Track the status of your internship and job applications.
        </p>
      </div>

      {!applications || applications.length === 0 ? (
        <EmptyState
          title="No applications yet"
          description="You haven't applied to any opportunities yet."
          action={
            <Link to="/listings">
              <Button variant="primary">Find Opportunities</Button>
            </Link>
          }
        />
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.Head>Role</Table.Head>
              <Table.Head>Company</Table.Head>
              <Table.Head>Applied Date</Table.Head>
              <Table.Head>Status</Table.Head>
              <Table.Head>Actions</Table.Head>
            </Table.Row>
          </Table.Header>
          <tbody>
            {applications.map((app) => (
              <Table.Row key={app.id}>
                <Table.Cell>
                  <Link to={`/listings/${app.listing.id}`} className="font-medium text-primary-600 hover:text-primary-900">
                    {app.listing.title}
                  </Link>
                </Table.Cell>
                <Table.Cell>
                  <span className="text-gray-900">{app.listing.companyName}</span>
                </Table.Cell>
                <Table.Cell>
                  <span className="text-sm text-gray-700">
                    {new Date(app.appliedAt).toLocaleDateString()}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <Badge status={app.status}>{app.status}</Badge>
                </Table.Cell>
                <Table.Cell>
                  {canWithdraw(app.status) ? (
                    <button
                      onClick={() => setAppToWithdraw(app)}
                      className="text-red-600 hover:text-red-900 text-sm font-medium focus:outline-none"
                    >
                      Withdraw
                    </button>
                  ) : (
                    <span className="text-gray-400 text-sm font-medium cursor-not-allowed">
                      Withdraw
                    </span>
                  )}
                </Table.Cell>
              </Table.Row>
            ))}
          </tbody>
        </Table>
      )}

      <Modal
        isOpen={!!appToWithdraw}
        onClose={() => setAppToWithdraw(null)}
        title="Withdraw Application"
      >
        <p className="text-sm text-gray-500 mb-6">
          Are you sure you want to withdraw your application for "{appToWithdraw?.listing.title}" at {appToWithdraw?.listing.companyName}? This action cannot be undone.
        </p>
        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={() => setAppToWithdraw(null)} disabled={isWithdrawing}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmWithdraw} isLoading={isWithdrawing}>
            Confirm Withdrawal
          </Button>
        </div>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
