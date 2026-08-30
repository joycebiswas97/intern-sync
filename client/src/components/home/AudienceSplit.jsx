import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';

export function AudienceSplit() {
  const navigate = useNavigate();

  return (
    <div className="py-16 sm:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:gap-12">
          {/* Student Panel */}
          <div className="bg-gray-50 rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12 flex flex-col items-start transition-all hover:-translate-y-1 hover:shadow-md">
            <h2 className="text-3xl font-bold text-gray-900">Built for Students</h2>
            <p className="mt-4 text-lg text-gray-600 flex-1">
              Stand out to top companies, track your applications in one place, and land the internship or new grad role that kickstarts your career. Create your profile and let opportunities find you.
            </p>
            <Button 
              variant="primary" 
              size="lg" 
              className="mt-8 w-full sm:w-auto"
              onClick={() => navigate('/register?role=student')}
            >
              I'm a Student
            </Button>
          </div>

          {/* Employer Panel */}
          <div className="bg-primary-50 rounded-2xl shadow-sm border border-primary-100 p-8 sm:p-12 flex flex-col items-start transition-all hover:-translate-y-1 hover:shadow-md">
            <h2 className="text-3xl font-bold text-primary-900">Built for Employers</h2>
            <p className="mt-4 text-lg text-primary-700 flex-1">
              Source verified talent from top universities. Post your openings, manage applicants efficiently, and build your early-career pipeline with our streamlined hiring tools.
            </p>
            <Button 
              variant="primary" 
              size="lg" 
              className="mt-8 w-full sm:w-auto"
              onClick={() => navigate('/register?role=employer')}
            >
              I'm an Employer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
