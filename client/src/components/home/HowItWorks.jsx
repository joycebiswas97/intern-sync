import React, { useState } from 'react';

const STUDENT_STEPS = [
  { id: 1, title: 'Create Profile', description: 'Showcase your skills, education, and projects to stand out to employers.' },
  { id: 2, title: 'Apply to Listings', description: 'Browse and apply to thousands of internships and new grad roles.' },
  { id: 3, title: 'Track Status', description: 'Monitor your application status and interview stages all in one place.' }
];

const EMPLOYER_STEPS = [
  { id: 1, title: 'Get Verified', description: 'Complete your company profile and get verified to start hiring on InternSync.' },
  { id: 2, title: 'Post Listings', description: 'Create detailed job or internship postings to attract top student talent.' },
  { id: 3, title: 'Review Applicants', description: 'Easily screen, filter, and manage candidates through our intuitive dashboard.' }
];

export function HowItWorks() {
  const [activeTab, setActiveTab] = useState('student');

  const steps = activeTab === 'student' ? STUDENT_STEPS : EMPLOYER_STEPS;

  return (
    <div className="py-16 sm:py-24 bg-gray-50 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">How It Works</h2>
          <p className="mt-4 max-w-2xl text-xl text-gray-500 mx-auto">
            A simple, streamlined process designed to connect talent with opportunity.
          </p>
        </div>

        {/* Tabs */}
        <div className="mt-12 flex justify-center">
          <div className="bg-white p-1 rounded-lg shadow-sm border border-gray-200 inline-flex">
            <button
              className={`px-8 py-2.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'student'
                  ? 'bg-primary-50 text-primary-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setActiveTab('student')}
            >
              For Students
            </button>
            <button
              className={`px-8 py-2.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'employer'
                  ? 'bg-primary-50 text-primary-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setActiveTab('employer')}
            >
              For Employers
            </button>
          </div>
        </div>

        {/* Steps */}
        <div className="mt-16">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.id} className="relative text-center">
                <div className="flex items-center justify-center w-16 h-16 mx-auto bg-primary-100 text-primary-600 rounded-full text-2xl font-bold mb-6 z-10 relative">
                  {step.id}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-500">{step.description}</p>
                
                {/* Connecting Line (hidden on mobile) */}
                {step.id !== 3 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-full h-0.5 bg-gray-200" style={{ width: 'calc(100% - 4rem)' }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
