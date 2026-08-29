import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apply } from '../../../api/applications';
import { getMyProfile } from '../../../api/students';

import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { TextArea } from '../../../components/ui/TextArea';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';

export function ApplyModal({ isOpen, onClose, listing }) {
  const [coverLetter, setCoverLetter] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  // Fetch student profile to check for verified email and resume
  const { data: profile, isLoading } = useQuery({
    queryKey: ['studentProfile', 'me'],
    queryFn: getMyProfile,
    enabled: isOpen,
    initialData: () => {
      if (process.env.NODE_ENV === 'development') {
        return {
          resumeUrl: 'https://example.com/resume.pdf',
          emailVerified: true // Set to false to test block
        };
      }
      return undefined;
    }
  });

  const { mutate: submitApplication, isPending } = useMutation({
    mutationFn: apply,
    onSuccess: () => {
      setSuccess(true);
      setErrorMsg('');
    },
    onError: (error) => {
      // Handle 409 Conflict gracefully per PRD
      if (error.response?.status === 409) {
        setErrorMsg('You have already applied for this position.');
      } else {
        setErrorMsg(error.response?.data?.message || 'Failed to submit application. Please try again.');
      }
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    submitApplication({ listingId: listing.id, coverLetter });
  };

  const handleClose = () => {
    // Reset state on close
    setCoverLetter('');
    setErrorMsg('');
    setSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Apply to ${listing?.companyName}`}>
      {isLoading ? (
        <div className="py-8"><LoadingSpinner /></div>
      ) : success ? (
        <div className="text-center py-6">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg leading-6 font-medium text-gray-900">Application Submitted!</h3>
          <p className="mt-2 text-sm text-gray-500">
            You have successfully applied for the {listing?.title} role.
          </p>
          <div className="mt-6">
            <Button variant="primary" onClick={handleClose}>
              Done
            </Button>
          </div>
        </div>
      ) : (!profile?.resumeUrl || !profile?.emailVerified) ? (
        <div className="py-4">
          <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-orange-800">Action Required</h3>
                <div className="mt-2 text-sm text-orange-700">
                  <p>Before you can apply, you must complete your profile:</p>
                  <ul className="list-disc list-inside mt-1">
                    {!profile?.emailVerified && <li>Verify your email address</li>}
                    {!profile?.resumeUrl && <li>Upload a resume</li>}
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            <Link to="/profile">
              <Button variant="primary">Go to Profile</Button>
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="py-2">
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Role</h4>
            <p className="text-gray-700">{listing?.title}</p>
          </div>
          
          <TextArea
            label="Cover Letter (Optional)"
            placeholder="Why are you a great fit for this role? What makes you excited about this company?"
            rows={6}
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            helperText="Your profile and resume will automatically be attached to this application."
          />

          {errorMsg && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
              {errorMsg}
            </div>
          )}

          <div className="mt-8 flex justify-end space-x-3">
            <Button variant="outline" onClick={handleClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isPending}>
              Submit Application
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

ApplyModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  listing: PropTypes.object
};
