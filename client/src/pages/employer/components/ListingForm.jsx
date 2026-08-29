import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { TextArea } from '../../../components/ui/TextArea';
import { TagInput } from '../../../components/ui/TagInput';
import { Button } from '../../../components/ui/Button';

// Validate deadline is not in the past
const futureDateString = z.string().min(1, "Deadline is required").refine((val) => {
  if (!val) return true; // Let the required check handle missing values if needed
  const date = new Date(val);
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Ignore time part for simple date comparison
  return date >= now;
}, {
  message: "Deadline cannot be in the past",
});

const listingSchema = z.object({
  title: z.string().min(3, "Title is required"),
  type: z.enum(["INTERNSHIP", "JOB"], { errorMap: () => ({ message: "Select a type" }) }),
  description: z.string().min(10, "Description must be at least 10 characters"),
  responsibilities: z.array(z.string()).default([]),
  skillsRequired: z.array(z.string()).default([]),
  workMode: z.enum(["REMOTE", "ONSITE", "HYBRID"], { errorMap: () => ({ message: "Select a work mode" }) }),
  location: z.string().optional().or(z.literal('')),
  stipendOrSalaryMin: z.preprocess((v) => (v === '' ? undefined : Number(v)), z.number().nonnegative().optional()),
  stipendOrSalaryMax: z.preprocess((v) => (v === '' ? undefined : Number(v)), z.number().nonnegative().optional()),
  currency: z.string().default("INR"),
  durationMonths: z.preprocess((v) => (v === '' ? undefined : Number(v)), z.number().int().positive().optional()),
  openings: z.preprocess((v) => (v === '' ? 1 : Number(v)), z.number().int().positive().default(1)),
  applicationDeadline: futureDateString,
  perks: z.array(z.string()).default([]),
}).refine(data => {
  if (data.stipendOrSalaryMin !== undefined && data.stipendOrSalaryMax !== undefined) {
    return data.stipendOrSalaryMax >= data.stipendOrSalaryMin;
  }
  return true;
}, {
  message: "Max salary must be greater than or equal to Min salary",
  path: ["stipendOrSalaryMax"],
}).refine(data => {
  if (data.workMode !== 'REMOTE' && !data.location) {
    return false;
  }
  return true;
}, {
  message: "Location is required for Onsite/Hybrid roles",
  path: ["location"],
});

export function ListingForm({ initialData, onSubmit, isSubmitting }) {
  const [submitType, setSubmitType] = useState('DRAFT'); // 'DRAFT' or 'PENDING_REVIEW'

  // Helper to format date for input type="date" (YYYY-MM-DD)
  const formatDateForInput = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (isNaN(date)) return '';
    return date.toISOString().split('T')[0];
  };

  const { register, handleSubmit, control, formState: { errors }, watch } = useForm({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      title: initialData?.title || '',
      type: initialData?.type || 'INTERNSHIP',
      description: initialData?.description || '',
      responsibilities: initialData?.responsibilities || [],
      skillsRequired: initialData?.skillsRequired || [],
      workMode: initialData?.workMode || 'REMOTE',
      location: initialData?.location || '',
      stipendOrSalaryMin: initialData?.stipendOrSalaryMin || '',
      stipendOrSalaryMax: initialData?.stipendOrSalaryMax || '',
      currency: initialData?.currency || 'INR',
      durationMonths: initialData?.durationMonths || '',
      openings: initialData?.openings || 1,
      applicationDeadline: formatDateForInput(initialData?.applicationDeadline) || '',
      perks: initialData?.perks || [],
    }
  });

  const watchType = watch("type");
  const watchWorkMode = watch("workMode");

  const submitHandler = (data) => {
    // Append the chosen status based on which button was clicked
    onSubmit({ ...data, status: submitType });
  };

  return (
    <form onSubmit={handleSubmit(submitHandler)}>
      {initialData?.status === 'REJECTED' && initialData?.rejectionReason && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded-r-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Listing Rejected</h3>
              <p className="mt-1 text-sm text-red-700">Reason: {initialData.rejectionReason}</p>
              <p className="mt-2 text-sm text-red-700">Please fix the issues below and re-submit for review.</p>
            </div>
          </div>
        </div>
      )}

      <Card className="mb-6">
        <Card.Header>
          <Card.Title>Basic Information</Card.Title>
        </Card.Header>
        <Card.Content className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Listing Title *"
              placeholder="e.g. Frontend Engineering Intern"
              {...register('title')}
              error={errors.title?.message}
            />
            <Select
              label="Type *"
              options={[
                { value: 'INTERNSHIP', label: 'Internship' },
                { value: 'JOB', label: 'Full-time Job' }
              ]}
              {...register('type')}
              error={errors.type?.message}
            />
          </div>

          <TextArea
            label="Description *"
            placeholder="Describe the role in detail..."
            rows={5}
            {...register('description')}
            error={errors.description?.message}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Controller
              name="responsibilities"
              control={control}
              render={({ field }) => (
                <TagInput
                  label="Responsibilities"
                  placeholder="Type and press Enter"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.responsibilities?.message}
                />
              )}
            />
            <Controller
              name="skillsRequired"
              control={control}
              render={({ field }) => (
                <TagInput
                  label="Skills Required"
                  placeholder="Type and press Enter (e.g. React)"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.skillsRequired?.message}
                />
              )}
            />
          </div>
        </Card.Content>
      </Card>

      <Card className="mb-6">
        <Card.Header>
          <Card.Title>Logistics & Compensation</Card.Title>
        </Card.Header>
        <Card.Content className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Select
              label="Work Mode *"
              options={[
                { value: 'REMOTE', label: 'Remote' },
                { value: 'HYBRID', label: 'Hybrid' },
                { value: 'ONSITE', label: 'Onsite' }
              ]}
              {...register('workMode')}
              error={errors.workMode?.message}
            />
            
            <div className="md:col-span-2">
              <Input
                label={`Location ${watchWorkMode !== 'REMOTE' ? '*' : '(Optional for Remote)'}`}
                placeholder="e.g. New York, NY"
                {...register('location')}
                error={errors.location?.message}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="md:col-span-2 flex space-x-4">
                <div className="flex-1">
                  <Input
                    label={watchType === 'INTERNSHIP' ? "Min Stipend / Month" : "Min Salary / Year"}
                    type="number"
                    {...register('stipendOrSalaryMin')}
                    error={errors.stipendOrSalaryMin?.message}
                  />
                </div>
                <div className="flex-1">
                  <Input
                    label="Max (Optional)"
                    type="number"
                    {...register('stipendOrSalaryMax')}
                    error={errors.stipendOrSalaryMax?.message}
                  />
                </div>
             </div>
             <div>
                <Select
                  label="Currency"
                  options={[
                    { value: 'INR', label: 'INR (₹)' },
                    { value: 'USD', label: 'USD ($)' },
                    { value: 'EUR', label: 'EUR (€)' }
                  ]}
                  {...register('currency')}
                  error={errors.currency?.message}
                />
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Input
              label="Openings"
              type="number"
              min="1"
              {...register('openings')}
              error={errors.openings?.message}
            />
            <Input
              label="Application Deadline *"
              type="date"
              {...register('applicationDeadline')}
              error={errors.applicationDeadline?.message}
            />
            {watchType === 'INTERNSHIP' && (
              <Input
                label="Duration (Months)"
                type="number"
                min="1"
                {...register('durationMonths')}
                error={errors.durationMonths?.message}
              />
            )}
          </div>
          
          <div>
            <Controller
              name="perks"
              control={control}
              render={({ field }) => (
                <TagInput
                  label="Perks / Benefits"
                  placeholder="e.g. Free snacks, Gym membership"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.perks?.message}
                />
              )}
            />
          </div>
        </Card.Content>
      </Card>

      <div className="flex items-center justify-end space-x-4">
        <Button 
          type="submit" 
          variant="outline" 
          onClick={() => setSubmitType('DRAFT')}
          isLoading={isSubmitting && submitType === 'DRAFT'}
          disabled={isSubmitting}
        >
          Save as Draft
        </Button>
        <Button 
          type="submit" 
          variant="primary" 
          onClick={() => setSubmitType('PENDING_REVIEW')}
          isLoading={isSubmitting && submitType === 'PENDING_REVIEW'}
          disabled={isSubmitting}
        >
          Submit for Review
        </Button>
      </div>
    </form>
  );
}

ListingForm.propTypes = {
  initialData: PropTypes.object,
  onSubmit: PropTypes.func.isRequired,
  isSubmitting: PropTypes.bool
};
