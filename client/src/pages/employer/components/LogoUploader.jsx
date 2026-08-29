import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadLogo } from '../../../api/employers';
import { FileUpload } from '../../../components/ui/FileUpload';
import { Card } from '../../../components/ui/Card';
import { Toast } from '../../../components/ui/Toast';

export function LogoUploader({ currentLogoUrl }) {
  const queryClient = useQueryClient();
  const [toast, setToast] = useState(null);

  const { mutate: uploadFile, isPending } = useMutation({
    mutationFn: uploadLogo,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employerProfile', 'me'] });
      setToast({ message: 'Logo uploaded successfully!', type: 'success' });
    },
    onError: (error) => {
      setToast({ 
        message: error.response?.data?.message || 'Failed to upload logo.', 
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
        <Card.Title>Company Logo</Card.Title>
      </Card.Header>
      <Card.Content className="flex flex-col items-center">
        {currentLogoUrl ? (
          <div className="mb-6 flex flex-col items-center">
            <div className="h-32 w-32 rounded-lg border shadow-sm overflow-hidden bg-white flex items-center justify-center">
              <img src={currentLogoUrl} alt="Company Logo" className="max-h-full max-w-full object-contain" />
            </div>
          </div>
        ) : (
          <div className="mb-6 h-32 w-32 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-gray-400">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        
        {isPending ? (
          <div className="text-sm text-gray-500 animate-pulse">Uploading...</div>
        ) : (
          <FileUpload 
            onFileSelect={handleFileSelect}
            accept=".png,.jpg,.jpeg,.webp"
            label="Upload Logo"
            helperText="PNG, JPG up to 5MB"
            maxSizeMB={5}
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

LogoUploader.propTypes = {
  currentLogoUrl: PropTypes.string
};
