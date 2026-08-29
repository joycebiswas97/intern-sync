import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUsers, banUser } from '../../api/admin';
import { useDebounce } from '../../hooks/useDebounce';

import { Card } from '../../components/ui/Card';
import { Table } from '../../components/ui/Table';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Toast } from '../../components/ui/Toast';

export default function AdminUsers() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);
  const queryClient = useQueryClient();
  const [toast, setToast] = useState(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin', 'users', debouncedSearch],
    queryFn: () => getUsers({ search: debouncedSearch }),
    initialData: () => (process.env.NODE_ENV === 'development' ? [
      { id: 'u-1', email: 'alice@student.com', role: 'STUDENT', fullName: 'Alice Smith', createdAt: '2026-08-01T00:00:00Z', isBanned: false },
      { id: 'u-2', email: 'hr@techcorp.com', role: 'EMPLOYER', companyName: 'TechCorp', createdAt: '2026-08-05T00:00:00Z', isBanned: true }
    ] : [])
  });

  const { mutate: toggleBan } = useMutation({
    mutationFn: banUser,
    onSuccess: (data, variables) => {
      setToast({ message: `User ${variables.isBanned ? 'banned' : 'unbanned'} successfully`, type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    }
  });

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="mt-2 text-sm text-gray-500">Search, view, and manage all platform users.</p>
      </div>

      <div className="mb-6">
        <Input 
          placeholder="Search by name, company, or email..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md shadow-sm"
        />
      </div>

      <Card>
        <Card.Content className="p-0">
          {isLoading ? <div className="p-8"><LoadingSpinner /></div> : (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.Head>User</Table.Head>
                  <Table.Head>Role</Table.Head>
                  <Table.Head>Joined Date</Table.Head>
                  <Table.Head>Status</Table.Head>
                  <Table.Head>Action</Table.Head>
                </Table.Row>
              </Table.Header>
              <tbody>
                {users.map(user => (
                  <Table.Row key={user.id}>
                    <Table.Cell>
                      <div className="font-medium text-gray-900">{user.fullName || user.companyName}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge variant={user.role === 'STUDENT' ? 'default' : 'success'}>{user.role}</Badge>
                    </Table.Cell>
                    <Table.Cell>{new Date(user.createdAt).toLocaleDateString()}</Table.Cell>
                    <Table.Cell>
                      {user.isBanned ? <Badge variant="danger">Banned</Badge> : <Badge variant="success">Active</Badge>}
                    </Table.Cell>
                    <Table.Cell>
                      <button
                        onClick={() => toggleBan({ id: user.id, isBanned: !user.isBanned, reason: user.isBanned ? '' : 'Violation of Terms' })}
                        className={`text-sm font-medium focus:outline-none ${user.isBanned ? 'text-green-600 hover:text-green-800' : 'text-red-600 hover:text-red-800'}`}
                      >
                        {user.isBanned ? 'Unban' : 'Ban User'}
                      </button>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Content>
      </Card>
      
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
