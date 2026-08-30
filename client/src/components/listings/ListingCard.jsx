import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

export function ListingCard({ listing }) {
  return (
    <Link to={`/listings/${listing.id}`} className="block group">
      <Card className="hover:border-primary-300 transition-colors">
        <Card.Content className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
                {listing.title}
              </h3>
              <p className="text-gray-600 font-medium mt-1">{listing.companyName}</p>
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
              {/* Placeholder for company logo */}
              <div className="h-12 w-12 rounded bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-xl">
                {listing.companyName.charAt(0)}
              </div>
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
  );
}
