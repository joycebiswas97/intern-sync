import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { searchListings } from '../../api/listings';
import { useDebounce } from '../../hooks/useDebounce';

import { Card } from '../../components/ui/Card';
import { ListingCard } from '../../components/listings/ListingCard';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';

// Helper mock filter until backend is ready
const mockListings = [
  { id: '1', title: 'Frontend Engineer', type: 'JOB', workMode: 'REMOTE', companyName: 'TechCorp', location: 'San Francisco, CA', stipendOrSalaryMin: 80000, currency: 'USD', createdAt: '2026-08-25T00:00:00Z', skillsRequired: ['React', 'JavaScript'] },
  { id: '2', title: 'Backend Intern', type: 'INTERNSHIP', workMode: 'HYBRID', companyName: 'DataSys', location: 'New York, NY', stipendOrSalaryMin: 3000, currency: 'USD', createdAt: '2026-08-20T00:00:00Z', durationMonths: 6, skillsRequired: ['Node.js', 'Python'] },
  { id: '3', title: 'UX Designer', type: 'JOB', workMode: 'ONSITE', companyName: 'Designify', location: 'London, UK', stipendOrSalaryMin: 60000, currency: 'GBP', createdAt: '2026-08-28T00:00:00Z', skillsRequired: ['Figma', 'UI/UX'] },
  { id: '4', title: 'Product Management Intern', type: 'INTERNSHIP', workMode: 'REMOTE', companyName: 'InnovateInc', location: '', stipendOrSalaryMin: 2000, currency: 'USD', createdAt: '2026-08-29T00:00:00Z', durationMonths: 3, skillsRequired: ['Agile', 'Jira'] }
];

export default function BrowseListings() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const [filters, setFilters] = useState({
    type: '',
    workMode: '',
    location: '',
  });

  const [page, setPage] = useState(1);
  const limit = 20;

  // Build query params
  const queryParams = {
    search: debouncedSearchTerm,
    ...filters,
    page,
    limit,
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['listings', 'search', queryParams],
    queryFn: async () => {
      if (process.env.NODE_ENV === 'development') {
        // Client-side mock filtering
        // simulate network delay
        await new Promise(resolve => setTimeout(resolve, 300));
        let results = mockListings;
        if (debouncedSearchTerm) {
          const lower = debouncedSearchTerm.toLowerCase();
          results = results.filter(r => r.title.toLowerCase().includes(lower) || r.companyName.toLowerCase().includes(lower));
        }
        if (filters.type) results = results.filter(r => r.type === filters.type);
        if (filters.workMode) results = results.filter(r => r.workMode === filters.workMode);
        if (filters.location) results = results.filter(r => r.location.toLowerCase().includes(filters.location.toLowerCase()));
        
        return {
          results,
          total: results.length,
          page: 1,
          pages: 1
        };
      }
      return searchListings(queryParams);
    }
  });

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPage(1); // Reset pagination on filter change
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilters({ type: '', workMode: '', location: '' });
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto py-8">
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Filters Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Filters</h2>
            
            <div className="space-y-4">
              <Select
                label="Listing Type"
                name="type"
                value={filters.type}
                onChange={handleFilterChange}
                options={[
                  { value: '', label: 'All Types' },
                  { value: 'INTERNSHIP', label: 'Internship' },
                  { value: 'JOB', label: 'Full-time Job' }
                ]}
              />
              <Select
                label="Work Mode"
                name="workMode"
                value={filters.workMode}
                onChange={handleFilterChange}
                options={[
                  { value: '', label: 'Any Mode' },
                  { value: 'REMOTE', label: 'Remote' },
                  { value: 'HYBRID', label: 'Hybrid' },
                  { value: 'ONSITE', label: 'Onsite' }
                ]}
              />
              <Input
                label="Location"
                name="location"
                placeholder="e.g. San Francisco"
                value={filters.location}
                onChange={handleFilterChange}
              />
            </div>
            
            <div className="mt-6">
              <Button variant="outline" className="w-full" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1">
          <div className="mb-6">
            <Input
              type="text"
              placeholder="Search by title, company, or keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-lg shadow-sm"
            />
          </div>

          {isLoading ? (
            <LoadingSpinner />
          ) : isError ? (
            <ErrorState title="Failed to load listings" onRetry={refetch} />
          ) : data?.results?.length === 0 ? (
            <EmptyState
              title="No listings found"
              description="Try adjusting your filters or search terms to find more results."
              action={<Button variant="outline" onClick={clearFilters}>Clear all filters</Button>}
            />
          ) : (
            <div className="space-y-4">
              {data?.results?.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
              
              {/* Simple Pagination Stub */}
              {data?.pages > 1 && (
                <div className="flex justify-between items-center mt-8 pt-4 border-t">
                  <Button variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                  <span className="text-sm text-gray-500">Page {page} of {data.pages}</span>
                  <Button variant="outline" disabled={page === data.pages} onClick={() => setPage(p => p + 1)}>Next</Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
