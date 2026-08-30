import React from 'react';
import { HeroSearch } from '../../components/home/HeroSearch';
import { StatsBar } from '../../components/home/StatsBar';
import { AudienceSplit } from '../../components/home/AudienceSplit';
import { HowItWorks } from '../../components/home/HowItWorks';
import { FeaturedListings } from '../../components/home/FeaturedListings';
import { TrustStrip } from '../../components/home/TrustStrip';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <HeroSearch />
      <StatsBar />
      <AudienceSplit />
      <HowItWorks />
      <FeaturedListings />
      <TrustStrip />
    </div>
  );
}
