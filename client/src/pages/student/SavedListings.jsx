import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getSavedListings } from '../../api/listings';

import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';

export default function SavedListings() {
  const { data: savedListings, isLoading, isError, refetch } = useQuery({
    queryKey: ['listings', 'saved'],
    queryFn: getSavedListings,
    initialData: () => {
      if (process.env.NODE_ENV === 'development') {
        return [
          { id: '1', title: 'Frontend Engineer', type: 'JOB', workMode: 'REMOTE', companyName: 'TechCorp', location: 'San Francisco, CA', stipendOrSalaryMin: 80000, currency: 'USD', createdAt: '2026-08-25T00:00:00Z', skillsRequired: ['React', 'JavaScript'] },
          { id: '4', title: 'Product Management Intern', type: 'INTERNSHIP', workMode: 'REMOTE', companyName: 'InnovateInc', location: '', stipendOrSalaryMin: 2000, currency: 'USD', createdAt: '2026-08-29T00:00:00Z', durationMonths: 3, skillsRequired: ['Agile', 'Jira'] }
        ];
      }
      return undefined;
    }
  });

  if (isLoading) return <LoadingSpinner fullPage />;
  if (isError) return <ErrorState title="Failed to load saved listings" onRetry={refetch} />;

  return (
    <div className="max-w-7xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Saved Opportunities</h1>
        <p className="mt-2 text-sm text-gray-500">
          Listings you've bookmarked for later.
        </p>
      </div>

      {!savedListings || savedListings.length === 0 ? (
        <EmptyState
          title="No saved listings"
          description="You haven't saved any jobs or internships yet."
          action={
            <Link to="/listings">
              <Button variant="primary">Browse Opportunities</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedListings.map((listing) => (
            <Link to={`/listings/${listing.id}`} key={listing.id} className="block group">
              <Card className="h-full hover:border-primary-300 transition-colors flex flex-col">
                <Card.Content className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div className="h-10 w-10 rounded bg-gray-100 flex items-center justify-center text-gray-400 font-bold flex-shrink-0">
                      {listing.companyName.charAt(0)}
                    </div>
                    <Badge variant="default">{listing.type === 'INTERNSHIP' ? 'Internship' : 'Job'}</Badge>
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors mb-1 line-clamp-2">
                    {listing.title}
                  </h3>
                  <p className="text-gray-600 font-medium mb-4">{listing.companyName}</p>
                  
                  <div className="mt-auto pt-4 border-t border-gray-100 space-y-2 text-sm text-gray-500">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                      {listing.workMode} {listing.location && `- ${listing.location}`}
                    </div>
                    {listing.stipendOrSalaryMin && (
                      <div className="flex items-center text-green-600 font-medium">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        {listing.stipendOrSalaryMin.toLocaleString()} {listing.currency}
                      </div>
                    )}
                  </div>
                </Card.Content>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
