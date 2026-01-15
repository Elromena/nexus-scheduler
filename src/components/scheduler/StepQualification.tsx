'use client';

import { useState } from 'react';
import type { FormData } from '@/app/page';

interface StepQualificationProps {
  formData: FormData;
  updateFormData: (data: Partial<FormData>) => void;
  hubspotId: string | null;
  visitorId: string | null;
  onComplete: () => void;
  onBack: () => void;
}

const objectives = [
  'Brand Awareness',
  'Website Traffic',
  'Downloads/Sign Ups',
  'Sales/Deposits',
];

const budgets = [
  '500K+',
  '100K-500K',
  '10K-100K',
];

const roles = [
  { value: 'brandadvertiser', label: 'Brand/Advertiser' },
  { value: 'marketing_agency', label: 'Marketing Agency' },
  { value: 'affiliate', label: 'Affiliate' },
];

export default function StepQualification({
  formData,
  updateFormData,
  hubspotId,
  visitorId,
  onComplete,
  onBack,
}: StepQualificationProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/scheduler/api/submit/step2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            objective: formData.objective,
            budget: formData.budget,
            roleType: formData.roleType,
          },
          hubspotId,
          visitorId,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to submit');
      }

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-slide-in">
      <form onSubmit={handleSubmit}>
        {/* Objective & Budget row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="form-label">What is the goal for your company/brand?</label>
            <select
              className="form-select"
              value={formData.objective}
              onChange={(e) => updateFormData({ objective: e.target.value })}
              required
            >
              <option value="" disabled>Select...</option>
              {objectives.map((obj) => (
                <option key={obj} value={obj}>{obj}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Your advertising budget</label>
            <select
              className="form-select"
              value={formData.budget}
              onChange={(e) => updateFormData({ budget: e.target.value })}
              required
            >
              <option value="" disabled>Select...</option>
              {budgets.map((budget) => (
                <option key={budget} value={budget}>{budget}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Role */}
        <div className="form-group">
          <label className="form-label">How would you best describe yourself?</label>
          <select
            className="form-select"
            value={formData.roleType}
            onChange={(e) => updateFormData({ roleType: e.target.value })}
            required
          >
            <option value="" disabled>Select...</option>
            {roles.map((role) => (
              <option key={role.value} value={role.value}>{role.label}</option>
            ))}
          </select>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-4 mt-8">
          <button
            type="button"
            onClick={onBack}
            className="btn-secondary"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary flex-1"
          >
            {isSubmitting ? (
              <>
                <span className="spinner" />
                Processing...
              </>
            ) : (
              'Continue'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
