import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { searchListings } from '../../api/listings';
import { ListingCard } from '../listings/ListingCard';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { EmptyState } from '../ui/EmptyState';
import { Button } from '../ui/Button';

// Mock listings fallback for development mode / before backend is live
const MOCK_FEATURED = [
  { id: 'f1', title: 'Software Engineering Intern', type: 'INTERNSHIP', workMode: 'REMOTE', companyName: 'TechCorp', location: '', stipendOrSalaryMin: 8000, currency: 'USD', createdAt: new Date().toISOString(), skillsRequired: ['React', 'Node.js'] },
  { id: 'f2', title: 'Data Analyst New Grad', type: 'JOB', workMode: 'HYBRID', companyName: 'DataSys', location: 'New York, NY', stipendOrSalaryMin: 90000, currency: 'USD', createdAt: new Date().toISOString(), skillsRequired: ['Python', 'SQL'] },
  { id: 'f3', title: 'Product Design Intern', type: 'INTERNSHIP', workMode: 'ONSITE', companyName: 'Designify', location: 'London, UK', stipendOrSalaryMin: 4000, currency: 'GBP', createdAt: new Date().toISOString(), skillsRequired: ['Figma', 'UI/UX'] },
  { id: 'f4', title: 'Marketing Coordinator', type: 'JOB', workMode: 'REMOTE', companyName: 'MarketPro', location: '', stipendOrSalaryMin: 65000, currency: 'USD', createdAt: new Date().toISOString(), skillsRequired: ['SEO', 'Content'] }
];

export function FeaturedListings() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['listings', 'featured'],
    queryFn: async () => {
      if (process.env.NODE_ENV === 'development') {
        // Client-side mock for featured
        await new Promise(resolve => setTimeout(resolve, 500));
        return { results: MOCK_FEATURED, total: 4 };
      }
      return searchListings({ limit: 4, sort: 'newest' });
    }
  });

  return (
    <div className="py-16 sm:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-3xl font-extrabold text-gray-900">Featured Opportunities</h2>
            <p className="mt-2 text-lg text-gray-500">Discover the latest internships and entry-level roles.</p>
          </div>
          <Link to="/listings" className="hidden sm:block">
            <Button variant="outline">View All</Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="py-12">
            <LoadingSpinner />
          </div>
        ) : isError || !data?.results?.length ? (
          <EmptyState 
            title="No listings found" 
            description="Check back later for new opportunities, or browse all listings." 
            action={
              <Link to="/listings">
                <Button variant="primary">Browse Listings</Button>
              </Link>
            } 
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {data.results.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
        
        <div className="mt-8 text-center sm:hidden">
          <Link to="/listings">
            <Button variant="outline" className="w-full">View All Listings</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
