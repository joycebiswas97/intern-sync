import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';

export function HeroSearch() {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/listings?search=${encodeURIComponent(search.trim())}`);
    } else {
      navigate('/listings');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4 sm:py-28">
      <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl max-w-4xl mx-auto">
        <span className="block">Launch Your Career with</span>
        <span className="block text-primary-600">InternSync</span>
      </h1>
      <p className="mt-4 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-6 md:text-xl md:max-w-3xl">
        The ultimate platform connecting ambitious students with top employers. Find internships, jobs, and kickstart your future.
      </p>

      {/* Search Bar */}
      <div className="mt-10 max-w-2xl w-full mx-auto">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-lg px-4 py-3 border"
            placeholder="Search for 'Software Engineering', 'Marketing', etc..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button type="submit" variant="primary" size="lg" className="px-8 shadow-sm">
            Search
          </Button>
        </form>
      </div>

      <div className="mt-10 flex gap-4 justify-center">
        <Button variant="primary" size="lg" onClick={() => navigate('/register')}>Get Started</Button>
        <Button variant="outline" size="lg" onClick={() => navigate('/listings')}>Browse Listings</Button>
      </div>
    </div>
  );
}
