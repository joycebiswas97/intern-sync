import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { getAnalytics } from '../../api/admin';

import { Card } from '../../components/ui/Card';
import { Table } from '../../components/ui/Table';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6'];

export default function AdminAnalytics() {
  const { data: rawData, isLoading } = useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: getAnalytics
  });

  if (isLoading) {
    return <LoadingSpinner fullPage />;
  }

  // Safely map data from the single API response
  const summary = {
    totalUsers: (rawData?.summary?.totalStudents || 0) + (rawData?.summary?.totalEmployers || 0),
    totalEmployers: rawData?.summary?.totalEmployers || 0,
    totalListings: rawData?.summary?.totalListings || 0,
    totalApplications: rawData?.summary?.totalApplications || 0,
  };

  const signups = (rawData?.signupsOverTime || []).map(item => ({
    date: item._id,
    students: item.count,
    employers: 0 // Mocked since backend currently only gives total count
  }));

  const appsByStatus = (rawData?.applicationsByStatus || []).map(item => ({
    name: item._id,
    value: item.count
  }));

  const topListings = (rawData?.topListings || []).map(item => ({
    _id: item.listingId,
    title: item.title,
    employer: { companyName: item.companyName },
    applications: item.applicationCount,
    views: 0 // Mock views since backend doesn't track it
  }));

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="mt-2 text-sm text-gray-500">Platform performance and key metrics.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-primary-50 border-primary-100">
          <Card.Content className="p-6">
            <h3 className="text-sm font-medium text-primary-600">Total Users</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">{summary?.totalUsers.toLocaleString()}</p>
          </Card.Content>
        </Card>
        <Card className="bg-green-50 border-green-100">
          <Card.Content className="p-6">
            <h3 className="text-sm font-medium text-green-600">Verified Employers</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">{summary?.totalEmployers.toLocaleString()}</p>
          </Card.Content>
        </Card>
        <Card className="bg-purple-50 border-purple-100">
          <Card.Content className="p-6">
            <h3 className="text-sm font-medium text-purple-600">Active Listings</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">{summary?.totalListings.toLocaleString()}</p>
          </Card.Content>
        </Card>
        <Card className="bg-orange-50 border-orange-100">
          <Card.Content className="p-6">
            <h3 className="text-sm font-medium text-orange-600">Total Applications</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">{summary?.totalApplications.toLocaleString()}</p>
          </Card.Content>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Signups Line Chart */}
        <Card>
          <Card.Header>
            <Card.Title>Signups (Last 7 Days)</Card.Title>
          </Card.Header>
          <Card.Content className="h-80 p-6 pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={signups} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <RechartsTooltip />
                <Legend />
                <Line type="monotone" dataKey="students" stroke="#3b82f6" strokeWidth={3} activeDot={{ r: 8 }} />
                <Line type="monotone" dataKey="employers" stroke="#10b981" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </Card.Content>
        </Card>

        {/* Applications Pie Chart */}
        <Card>
          <Card.Header>
            <Card.Title>Applications by Status</Card.Title>
          </Card.Header>
          <Card.Content className="h-80 p-6 pt-0 flex justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={appsByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {appsByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card.Content>
        </Card>
      </div>

      {/* Top Listings Table */}
      <Card>
        <Card.Header>
          <Card.Title>Top Listings (Most Applied)</Card.Title>
        </Card.Header>
        <Card.Content className="p-0">
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.Head>Listing</Table.Head>
                <Table.Head>Company</Table.Head>
                <Table.Head className="text-right">Views</Table.Head>
                <Table.Head className="text-right">Applications</Table.Head>
              </Table.Row>
            </Table.Header>
            <tbody>
              {topListings.map(listing => (
                <Table.Row key={listing._id}>
                  <Table.Cell className="font-medium text-gray-900">{listing.title}</Table.Cell>
                  <Table.Cell>{listing.employer?.companyName}</Table.Cell>
                  <Table.Cell className="text-right text-gray-500">{listing.views.toLocaleString()}</Table.Cell>
                  <Table.Cell className="text-right font-medium text-primary-600">{listing.applications.toLocaleString()}</Table.Cell>
                </Table.Row>
              ))}
            </tbody>
          </Table>
        </Card.Content>
      </Card>
    </div>
  );
}
