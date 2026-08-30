import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMyProfile } from '../../api/students';

import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorState } from '../../components/ui/ErrorState';
import { ProfileCompletion } from './components/ProfileCompletion';
import { ResumeUploader } from './components/ResumeUploader';
import { ProfileForm } from './components/ProfileForm';

export default function Profile() {
  const { data: profile, isLoading, isError, refetch } = useQuery({
    queryKey: ['studentProfile', 'me'],
    queryFn: getMyProfile,
    // Stub data for frontend testing since backend isn't ready
    initialData: () => {
      // Remove this when backend is connected
      if (process.env.NODE_ENV === 'development') {
        return {
          id: '123',
          fullName: 'John Doe',
          headline: 'Aspiring Frontend Developer',
          bio: 'Passionate about building intuitive user interfaces.',
          skills: ['React', 'JavaScript', 'Tailwind'],
        };
      }
      return undefined;
    }
  });

  if (isLoading) {
    return <LoadingSpinner fullPage />;
  }

  if (isError) {
    return (
      <ErrorState 
        title="Failed to load profile" 
        message="There was an error fetching your profile information."
        onRetry={refetch}
        className="mt-8"
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="mt-2 text-sm text-gray-500">
          Update your personal details, education, and resume to stand out to employers.
        </p>
      </div>

      <ProfileCompletion profile={profile} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <ProfileForm initialData={profile} />
        </div>
        
        <div className="lg:col-span-1 space-y-6">
          <ResumeUploader currentResumeUrl={profile?.resumeUrl} />
          
          {/* Example of additional sidebar items later on */}
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-100">
            <h4 className="text-blue-800 font-semibold mb-2">Pro Tip</h4>
            <p className="text-sm text-blue-700">
              Profiles with a headline and bio are 3x more likely to be shortlisted by employers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
