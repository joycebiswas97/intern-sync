import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { searchListings } from '../../api/listings';
import { useDebounce } from '../../hooks/useDebounce';

import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';

// Removed mock data

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
      // Remove empty parameters to clean up URL
      const cleanParams = Object.fromEntries(
        Object.entries(queryParams).filter(([_, v]) => v !== '' && v !== null)
      );
      return searchListings(cleanParams);
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
          ) : data?.listings?.length === 0 ? (
            <EmptyState
              title="No listings found"
              description="Try adjusting your filters or search terms to find more results."
              action={<Button variant="outline" onClick={clearFilters}>Clear all filters</Button>}
            />
          ) : (
            <div className="space-y-4">
              {data?.listings?.map((listing) => (
                <Link to={`/listings/${listing._id}`} key={listing._id} className="block group">
                  <Card className="hover:border-primary-300 transition-colors">
                    <Card.Content className="p-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
                            {listing.title}
                          </h3>
                          <p className="text-gray-600 font-medium mt-1">{listing.employer?.companyName}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-3 text-sm text-gray-500">
                            <span className="flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                              {listing.type === 'INTERNSHIP' ? 'Internship' : 'Full-time'}
                            </span>
                            <span>•</span>
                            <span className="flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                              {listing.workMode} {listing.location && `- ${listing.location}`}
                            </span>
                            {listing.stipendOrSalaryMin && (
                              <>
                                <span>•</span>
                                <span className="flex items-center text-green-600 font-medium">
                                  {listing.stipendOrSalaryMin.toLocaleString()} {listing.currency} {listing.type === 'INTERNSHIP' ? '/mo' : '/yr'}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          {listing.employer?.companyLogoUrl ? (
                            <img src={listing.employer.companyLogoUrl} alt="Logo" className="h-12 w-12 rounded object-cover" />
                          ) : (
                            <div className="h-12 w-12 rounded bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-xl">
                              {listing.employer?.companyName?.charAt(0) || 'C'}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-4 flex flex-wrap gap-2">
                        {listing.skillsRequired?.slice(0, 5).map(skill => (
                          <Badge key={skill} variant="default">{skill}</Badge>
                        ))}
                        {listing.skillsRequired?.length > 5 && (
                          <Badge variant="default">+{listing.skillsRequired.length - 5} more</Badge>
                        )}
                      </div>
                    </Card.Content>
                  </Card>
                </Link>
              ))}
              
              {/* Simple Pagination Stub */}
              {data?.totalPages > 1 && (
                <div className="flex justify-between items-center mt-8 pt-4 border-t">
                  <Button variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                  <span className="text-sm text-gray-500">Page {page} of {data.totalPages}</span>
                  <Button variant="outline" disabled={page === data.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
