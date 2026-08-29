import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getPendingEmployers, verifyEmployer, 
  getPendingListings, reviewListing, 
  getReports, resolveReport 
} from '../../api/admin';

import { Card } from '../../components/ui/Card';
import { Table } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';
import { TextArea } from '../../components/ui/TextArea';
import { Toast } from '../../components/ui/Toast';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('EMPLOYERS'); // EMPLOYERS, LISTINGS, REPORTS
  const queryClient = useQueryClient();
  const [toast, setToast] = useState(null);
  
  // Rejection modal state
  const [rejectModal, setRejectModal] = useState({ isOpen: false, type: '', id: '', reason: '' });

  // -- Queries --
  
  const { data: employers, isLoading: isLoadingEmp } = useQuery({
    queryKey: ['admin', 'pending-employers'],
    queryFn: getPendingEmployers,
    initialData: () => (process.env.NODE_ENV === 'development' ? [
      { id: 'emp-1', companyName: 'StartupX', industry: 'Software', createdAt: '2026-08-29T10:00:00Z', status: 'PENDING' }
    ] : [])
  });

  const { data: listings, isLoading: isLoadingList } = useQuery({
    queryKey: ['admin', 'pending-listings'],
    queryFn: getPendingListings,
    initialData: () => (process.env.NODE_ENV === 'development' ? [
      { id: 'list-1', title: 'Data Analyst Intern', companyName: 'DataSys', type: 'INTERNSHIP', createdAt: '2026-08-28T14:00:00Z', status: 'PENDING_REVIEW' }
    ] : [])
  });

  const { data: reports, isLoading: isLoadingRep } = useQuery({
    queryKey: ['admin', 'reports'],
    queryFn: getReports,
    initialData: () => (process.env.NODE_ENV === 'development' ? [
      { id: 'rep-1', reporterEmail: 'student@test.com', type: 'SPAM', target: 'TechCorp Job', description: 'Looks like a fake job posting.', status: 'OPEN', createdAt: '2026-08-25T09:00:00Z' }
    ] : [])
  });

  // -- Mutations --

  const handleSuccess = (msg) => {
    setToast({ message: msg, type: 'success' });
    setRejectModal({ isOpen: false, type: '', id: '', reason: '' });
    queryClient.invalidateQueries({ queryKey: ['admin'] });
  };

  const { mutate: mutateEmployer } = useMutation({
    mutationFn: verifyEmployer,
    onSuccess: () => handleSuccess('Employer verification updated.')
  });

  const { mutate: mutateListing } = useMutation({
    mutationFn: reviewListing,
    onSuccess: () => handleSuccess('Listing status updated.')
  });

  const { mutate: mutateReport } = useMutation({
    mutationFn: resolveReport,
    onSuccess: () => handleSuccess('Report resolved.')
  });

  // -- Handlers --

  const handleApprove = (type, id) => {
    if (type === 'EMPLOYER') mutateEmployer({ id, status: 'APPROVED' });
    if (type === 'LISTING') mutateListing({ id, status: 'ACTIVE' });
  };

  const handleRejectSubmit = () => {
    if (rejectModal.type === 'EMPLOYER') mutateEmployer({ id: rejectModal.id, status: 'REJECTED', rejectionReason: rejectModal.reason });
    if (rejectModal.type === 'LISTING') mutateListing({ id: rejectModal.id, status: 'REJECTED', rejectionReason: rejectModal.reason });
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Console</h1>
        <p className="mt-2 text-sm text-gray-500">Manage queues and resolve reports.</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {['EMPLOYERS', 'LISTINGS', 'REPORTS'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab 
                  ? 'border-primary-500 text-primary-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Pending {tab.charAt(0) + tab.slice(1).toLowerCase()}
              {tab === 'EMPLOYERS' && employers?.length > 0 && <span className="ml-2 bg-red-100 text-red-600 py-0.5 px-2 rounded-full text-xs">{employers.length}</span>}
              {tab === 'LISTINGS' && listings?.length > 0 && <span className="ml-2 bg-red-100 text-red-600 py-0.5 px-2 rounded-full text-xs">{listings.length}</span>}
              {tab === 'REPORTS' && reports?.length > 0 && <span className="ml-2 bg-red-100 text-red-600 py-0.5 px-2 rounded-full text-xs">{reports.length}</span>}
            </button>
          ))}
        </nav>
      </div>

      {/* Queue Content */}
      <Card>
        <Card.Content className="p-0">
          
          {/* EMPLOYERS QUEUE */}
          {activeTab === 'EMPLOYERS' && (
            isLoadingEmp ? <div className="p-8"><LoadingSpinner /></div> : 
            employers?.length === 0 ? <div className="p-8 text-center text-gray-500">No pending employers.</div> :
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.Head>Company</Table.Head>
                  <Table.Head>Industry</Table.Head>
                  <Table.Head>Submitted</Table.Head>
                  <Table.Head>Actions</Table.Head>
                </Table.Row>
              </Table.Header>
              <tbody>
                {employers.map(emp => (
                  <Table.Row key={emp.id}>
                    <Table.Cell className="font-medium text-gray-900">{emp.companyName}</Table.Cell>
                    <Table.Cell>{emp.industry}</Table.Cell>
                    <Table.Cell>{new Date(emp.createdAt).toLocaleDateString()}</Table.Cell>
                    <Table.Cell className="space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleApprove('EMPLOYER', emp.id)}>Approve</Button>
                      <Button variant="danger" size="sm" onClick={() => setRejectModal({ isOpen: true, type: 'EMPLOYER', id: emp.id, reason: '' })}>Reject</Button>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </tbody>
            </Table>
          )}

          {/* LISTINGS QUEUE */}
          {activeTab === 'LISTINGS' && (
            isLoadingList ? <div className="p-8"><LoadingSpinner /></div> : 
            listings?.length === 0 ? <div className="p-8 text-center text-gray-500">No pending listings.</div> :
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.Head>Title</Table.Head>
                  <Table.Head>Company</Table.Head>
                  <Table.Head>Type</Table.Head>
                  <Table.Head>Submitted</Table.Head>
                  <Table.Head>Actions</Table.Head>
                </Table.Row>
              </Table.Header>
              <tbody>
                {listings.map(list => (
                  <Table.Row key={list.id}>
                    <Table.Cell className="font-medium text-gray-900">{list.title}</Table.Cell>
                    <Table.Cell>{list.companyName}</Table.Cell>
                    <Table.Cell><Badge>{list.type}</Badge></Table.Cell>
                    <Table.Cell>{new Date(list.createdAt).toLocaleDateString()}</Table.Cell>
                    <Table.Cell className="space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleApprove('LISTING', list.id)}>Approve</Button>
                      <Button variant="danger" size="sm" onClick={() => setRejectModal({ isOpen: true, type: 'LISTING', id: list.id, reason: '' })}>Reject</Button>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </tbody>
            </Table>
          )}

          {/* REPORTS QUEUE */}
          {activeTab === 'REPORTS' && (
            isLoadingRep ? <div className="p-8"><LoadingSpinner /></div> : 
            reports?.length === 0 ? <div className="p-8 text-center text-gray-500">No open reports.</div> :
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.Head>Type</Table.Head>
                  <Table.Head>Target</Table.Head>
                  <Table.Head>Description</Table.Head>
                  <Table.Head>Reported By</Table.Head>
                  <Table.Head>Actions</Table.Head>
                </Table.Row>
              </Table.Header>
              <tbody>
                {reports.map(rep => (
                  <Table.Row key={rep.id}>
                    <Table.Cell><Badge variant="danger">{rep.type}</Badge></Table.Cell>
                    <Table.Cell className="font-medium">{rep.target}</Table.Cell>
                    <Table.Cell className="max-w-xs truncate" title={rep.description}>{rep.description}</Table.Cell>
                    <Table.Cell>{rep.reporterEmail}</Table.Cell>
                    <Table.Cell className="space-x-2">
                      <Button variant="outline" size="sm" onClick={() => mutateReport({ id: rep.id, resolution: 'Action Taken' })}>Resolve</Button>
                      <Button variant="ghost" size="sm" onClick={() => mutateReport({ id: rep.id, resolution: 'Dismissed' })}>Dismiss</Button>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Content>
      </Card>

      {/* Rejection Modal */}
      <Modal 
        isOpen={rejectModal.isOpen} 
        onClose={() => setRejectModal({ ...rejectModal, isOpen: false })}
        title={`Reject ${rejectModal.type}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Please provide a reason for rejection. This will be sent to the user.</p>
          <TextArea 
            label="Rejection Reason" 
            value={rejectModal.reason} 
            onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })} 
            rows={4}
          />
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => setRejectModal({ ...rejectModal, isOpen: false })}>Cancel</Button>
            <Button variant="danger" disabled={!rejectModal.reason.trim()} onClick={handleRejectSubmit}>Submit Rejection</Button>
          </div>
        </div>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
