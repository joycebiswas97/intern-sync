import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateMyProfile } from '../../../api/employers';

import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { TextArea } from '../../../components/ui/TextArea';
import { Button } from '../../../components/ui/Button';
import { Toast } from '../../../components/ui/Toast';

const profileSchema = z.object({
  companyName: z.string().min(2, 'Company name is required'),
  companyWebsite: z.string().url('Invalid URL').optional().or(z.literal('')),
  industry: z.string().optional().or(z.literal('')),
  companySize: z.string().optional().or(z.literal('')),
  aboutCompany: z.string().max(2000, 'Description is too long').optional().or(z.literal('')),
});

const companySizeOptions = [
  { value: '', label: 'Select size...' },
  { value: '1-10', label: '1-10 employees' },
  { value: '11-50', label: '11-50 employees' },
  { value: '51-200', label: '51-200 employees' },
  { value: '201-500', label: '201-500 employees' },
  { value: '500+', label: '500+ employees' },
];

export function EmployerProfileForm({ initialData }) {
  const queryClient = useQueryClient();
  const [toast, setToast] = useState(null);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      companyName: initialData?.companyName || '',
      companyWebsite: initialData?.companyWebsite || '',
      industry: initialData?.industry || '',
      companySize: initialData?.companySize || '',
      aboutCompany: initialData?.aboutCompany || '',
    }
  });

  const { mutate: updateProfile, isPending } = useMutation({
    mutationFn: updateMyProfile,
    onSuccess: (data) => {
      queryClient.setQueryData(['employerProfile', 'me'], data);
      setToast({ message: 'Company profile updated successfully!', type: 'success' });
    },
    onError: (error) => {
      setToast({ 
        message: error.response?.data?.message || 'Failed to update profile.', 
        type: 'error' 
      });
    }
  });

  const onSubmit = (data) => {
    updateProfile(data);
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <Card.Header>
            <Card.Title>Company Information</Card.Title>
          </Card.Header>
          <Card.Content className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Company Name *"
                {...register('companyName')}
                error={errors.companyName?.message}
              />
              <Input
                label="Website URL"
                type="url"
                placeholder="https://..."
                {...register('companyWebsite')}
                error={errors.companyWebsite?.message}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Industry"
                placeholder="e.g. Software, Finance, Healthcare"
                {...register('industry')}
                error={errors.industry?.message}
              />
              <Select
                label="Company Size"
                options={companySizeOptions}
                {...register('companySize')}
                error={errors.companySize?.message}
              />
            </div>

            <TextArea
              label="About Company"
              placeholder="Describe your company, mission, and culture..."
              rows={6}
              {...register('aboutCompany')}
              error={errors.aboutCompany?.message}
            />
          </Card.Content>

          <Card.Footer className="justify-end">
            <Button 
              type="submit" 
              variant="primary" 
              isLoading={isPending}
            >
              Save Changes
            </Button>
          </Card.Footer>
        </Card>
      </form>

      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </>
  );
}

EmployerProfileForm.propTypes = {
  initialData: PropTypes.object
};
