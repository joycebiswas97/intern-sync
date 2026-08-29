import React from 'react';
import PropTypes from 'prop-types';
import { Card } from '../../../components/ui/Card';

export function ProfileCompletion({ profile }) {
  // PRD 5.2: 8 key fields = 12.5% each
  const keyFields = [
    'fullName',
    'headline',
    'bio',
    'college',
    'degree',
    'graduationYear',
    'skills',
    'resumeUrl'
  ];

  const calculateCompletion = () => {
    if (!profile) return 0;
    let filled = 0;
    keyFields.forEach(field => {
      if (field === 'skills') {
        if (profile.skills && profile.skills.length > 0) filled++;
      } else if (profile[field]) {
        filled++;
      }
    });
    return Math.round((filled / keyFields.length) * 100);
  };

  const percentage = calculateCompletion();

  return (
    <Card className="mb-6 bg-gradient-to-r from-primary-50 to-white">
      <Card.Content className="py-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-900">Profile Completion</h3>
          <span className="text-sm font-bold text-primary-600">{percentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-primary-600 h-2.5 rounded-full transition-all duration-500 ease-in-out" 
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        {percentage < 100 && (
          <p className="text-xs text-gray-500 mt-2">
            Complete your profile to stand out to employers!
          </p>
        )}
      </Card.Content>
    </Card>
  );
}

ProfileCompletion.propTypes = {
  profile: PropTypes.object
};
