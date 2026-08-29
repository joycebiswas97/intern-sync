import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateMyProfile } from '../../../api/students';

import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { TextArea } from '../../../components/ui/TextArea';
import { TagInput } from '../../../components/ui/TagInput';
import { Button } from '../../../components/ui/Button';
import { Toast } from '../../../components/ui/Toast';

// PRD validation mirroring
const profileSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  headline: z.string().max(100, 'Headline is too long').optional().or(z.literal('')),
  bio: z.string().max(1000, 'Bio is too long').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  college: z.string().optional().or(z.literal('')),
  degree: z.string().optional().or(z.literal('')),
  graduationYear: z.preprocess(
    (val) => (val === '' ? undefined : Number(val)),
    z.number().int().min(1900).max(2100).optional()
  ),
  skills: z.array(z.string()).default([]),
  portfolioUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  linkedinUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  location: z.string().optional().or(z.literal('')),
});

export function ProfileForm({ initialData }) {
  const queryClient = useQueryClient();
  const [toast, setToast] = useState(null);

  const { register, handleSubmit, control, formState: { errors } } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: initialData?.fullName || '',
      headline: initialData?.headline || '',
      bio: initialData?.bio || '',
      phone: initialData?.phone || '',
      college: initialData?.college || '',
      degree: initialData?.degree || '',
      graduationYear: initialData?.graduationYear || '',
      skills: initialData?.skills || [],
      portfolioUrl: initialData?.portfolioUrl || '',
      linkedinUrl: initialData?.linkedinUrl || '',
      location: initialData?.location || '',
    }
  });

  const { mutate: updateProfile, isPending } = useMutation({
    mutationFn: updateMyProfile,
    onSuccess: (data) => {
      queryClient.setQueryData(['studentProfile', 'me'], data);
      setToast({ message: 'Profile updated successfully!', type: 'success' });
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
            <Card.Title>Personal Information</Card.Title>
          </Card.Header>
          <Card.Content className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Full Name *"
                {...register('fullName')}
                error={errors.fullName?.message}
              />
              <Input
                label="Headline"
                placeholder="e.g. CS Student @ University"
                {...register('headline')}
                error={errors.headline?.message}
              />
            </div>
            
            <TextArea
              label="Bio"
              placeholder="Tell employers about yourself..."
              {...register('bio')}
              error={errors.bio?.message}
              rows={4}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Phone"
                type="tel"
                {...register('phone')}
                error={errors.phone?.message}
              />
              <Input
                label="Location"
                placeholder="e.g. San Francisco, CA"
                {...register('location')}
                error={errors.location?.message}
              />
            </div>
          </Card.Content>

          <Card.Header className="border-t">
            <Card.Title>Education & Skills</Card.Title>
          </Card.Header>
          <Card.Content className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Input
                label="College / University"
                {...register('college')}
                error={errors.college?.message}
              />
              <Input
                label="Degree"
                placeholder="e.g. B.S. Computer Science"
                {...register('degree')}
                error={errors.degree?.message}
              />
              <Input
                label="Graduation Year"
                type="number"
                {...register('graduationYear')}
                error={errors.graduationYear?.message}
              />
            </div>

            <div className="mt-4">
              <Controller
                name="skills"
                control={control}
                render={({ field }) => (
                  <TagInput
                    label="Skills"
                    placeholder="Type skill and press Enter (e.g. React, Python)"
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.skills?.message}
                  />
                )}
              />
            </div>
          </Card.Content>

          <Card.Header className="border-t">
            <Card.Title>Links</Card.Title>
          </Card.Header>
          <Card.Content className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Portfolio URL"
                type="url"
                placeholder="https://..."
                {...register('portfolioUrl')}
                error={errors.portfolioUrl?.message}
              />
              <Input
                label="LinkedIn URL"
                type="url"
                placeholder="https://linkedin.com/in/..."
                {...register('linkedinUrl')}
                error={errors.linkedinUrl?.message}
              />
            </div>
          </Card.Content>

          <Card.Footer className="justify-end">
            <Button 
              type="submit" 
              variant="primary" 
              isLoading={isPending}
            >
              Save Profile
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

ProfileForm.propTypes = {
  initialData: PropTypes.object
};
