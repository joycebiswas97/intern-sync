import React from 'react';

// TODO: Wire this up to /api/admin/analytics/summary when backend is ready
const MOCK_STATS = [
  { label: 'Active Listings', value: '1,250+' },
  { label: 'Companies Hiring', value: '450+' },
  { label: 'Students Placed', value: '5,000+' },
  { label: 'Avg. Time to Hire', value: '12 Days' },
];

export function StatsBar() {
  return (
    <div className="bg-primary-900 py-8 sm:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {MOCK_STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-extrabold text-white sm:text-4xl">{stat.value}</div>
              <div className="mt-1 text-xs font-medium text-primary-200 uppercase tracking-wider sm:text-sm">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
