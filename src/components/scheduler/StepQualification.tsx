'use client';

import { useState } from 'react';
import { useTranslation } from '@/lib/i18n/TranslationContext';
import type { FormData } from '@/app/page';

interface StepQualificationProps {
  formData: FormData;
  updateFormData: (data: Partial<FormData>) => void;
  hubspotId: string | null;
  visitorId: string | null;
  onComplete: () => void;
  onBack: () => void;
}

export default function StepQualification({
  formData,
  updateFormData,
  hubspotId,
  visitorId,
  onComplete,
  onBack,
}: StepQualificationProps) {
  const { translations: t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const objectives = [
    { key: 'brandAwareness', value: 'Brand Awareness' },
    { key: 'websiteTraffic', value: 'Website Traffic' },
    { key: 'downloads', value: 'Downloads/Sign Ups' },
    { key: 'sales', value: 'Sales/Deposits' },
  ];

  const budgets = [
    { key: 'high', value: '500K+' },
    { key: 'medium', value: '100K-500K' },
    { key: 'low', value: '10K-100K' },
  ];

  const roles = [
    { key: 'brand', value: 'brandadvertiser', label: 'brand' },
    { key: 'agency', value: 'marketing_agency', label: 'agency' },
    { key: 'affiliate', value: 'affiliate', label: 'affiliate' },
  ];

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
      setError(err instanceof Error ? err.message : t.common.error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-slide-in">
      <form onSubmit={handleSubmit}>
        {/* Objective & Budget row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="form-label">{t.qualification.goal}</label>
            <select
              className="form-select"
              value={formData.objective}
              onChange={(e) => updateFormData({ objective: e.target.value })}
              required
            >
              <option value="" disabled>{t.details.select}</option>
              {objectives.map((obj) => (
                <option key={obj.key} value={obj.value}>
                  {t.objectives[obj.key as keyof typeof t.objectives]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">{t.qualification.budget}</label>
            <select
              className="form-select"
              value={formData.budget}
              onChange={(e) => updateFormData({ budget: e.target.value })}
              required
            >
              <option value="" disabled>{t.details.select}</option>
              {budgets.map((budget) => (
                <option key={budget.key} value={budget.value}>
                  {t.budgets[budget.key as keyof typeof t.budgets]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Role */}
        <div className="form-group">
          <label className="form-label">{t.qualification.role}</label>
          <select
            className="form-select"
            value={formData.roleType}
            onChange={(e) => updateFormData({ roleType: e.target.value })}
            required
          >
            <option value="" disabled>{t.details.select}</option>
            {roles.map((role) => (
              <option key={role.key} value={role.value}>
                {t.roles[role.label as keyof typeof t.roles]}
              </option>
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
            {t.qualification.back}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary flex-1"
          >
            {isSubmitting ? (
              <>
                <span className="spinner" />
                {t.qualification.processing}
              </>
            ) : (
              t.qualification.continue
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
