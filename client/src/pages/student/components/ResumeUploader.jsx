import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadResume } from '../../../api/students';
import { FileUpload } from '../../../components/ui/FileUpload';
import { Card } from '../../../components/ui/Card';
import { Toast } from '../../../components/ui/Toast';
import { Badge } from '../../../components/ui/Badge';

export function ResumeUploader({ currentResumeUrl }) {
  const queryClient = useQueryClient();
  const [toast, setToast] = useState(null);

  const { mutate: uploadFile, isPending } = useMutation({
    mutationFn: uploadResume,
    onSuccess: (data) => {
      // Invalidate profile query to refetch with new resume URL
      queryClient.invalidateQueries({ queryKey: ['studentProfile', 'me'] });
      setToast({ message: 'Resume uploaded successfully!', type: 'success' });
    },
    onError: (error) => {
      setToast({ 
        message: error.response?.data?.message || 'Failed to upload resume.', 
        type: 'error' 
      });
    }
  });

  const handleFileSelect = (file) => {
    if (file) {
      uploadFile(file);
    }
  };

  return (
    <Card className="mb-6">
      <Card.Header>
        <Card.Title>Resume / CV</Card.Title>
      </Card.Header>
      <Card.Content>
        {currentResumeUrl && (
          <div className="mb-4 p-3 bg-gray-50 rounded-md border flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <svg className="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
              </svg>
              <span className="text-sm font-medium text-gray-700 truncate max-w-xs">
                Current Resume Uploaded
              </span>
              <Badge variant="success">Active</Badge>
            </div>
            <a 
              href={currentResumeUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-primary-600 hover:text-primary-800 font-medium"
            >
              View
            </a>
          </div>
        )}
        
        {isPending ? (
          <div className="text-center py-6 text-gray-500">
            <svg className="animate-spin h-8 w-8 mx-auto text-primary-600 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Uploading...
          </div>
        ) : (
          <FileUpload 
            onFileSelect={handleFileSelect}
            label={currentResumeUrl ? "Upload New Resume" : "Upload Resume"}
          />
        )}
      </Card.Content>

      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </Card>
  );
}

ResumeUploader.propTypes = {
  currentResumeUrl: PropTypes.string
};
