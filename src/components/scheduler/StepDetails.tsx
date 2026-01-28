'use client';

import { useState } from 'react';
import { useTranslation } from '@/lib/i18n/TranslationContext';
import type { FormData } from '@/app/page';

interface StepDetailsProps {
  formData: FormData;
  updateFormData: (data: Partial<FormData>) => void;
  visitorId: string | null;
  onComplete: (hubspotId: string) => void;
  onBack: () => void;
}

export default function StepDetails({
  formData,
  updateFormData,
  visitorId,
  onComplete,
  onBack,
}: StepDetailsProps) {
  const { translations: t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Map translation keys to original values for API
  const industries = [
    { key: 'financeFintech', value: 'Finance & Fintech' },
    { key: 'gaming', value: 'Gaming' },
    { key: 'saasTech', value: 'SaaS & Tech' },
    { key: 'aiTech', value: 'AI & Emerging Tech' },
    { key: 'blockchainCrypto', value: 'Blockchain & Crypto' },
    { key: 'iGaming', value: 'iGaming' },
    { key: 'regulated', value: 'Regulated Industries' },
    { key: 'other', value: 'Other' },
  ];

  const sources = [
    { key: 'google', value: 'Google/Search Engines' },
    { key: 'social', value: 'Social Media (LinkedIn, Twitter/X)' },
    { key: 'ai', value: 'ChatGPT/Perplexity (Other AI Tools)' },
    { key: 'website', value: 'Another Website/Third Party Article' },
    { key: 'referral', value: 'Friend or Colleague Referral' },
    { key: 'other', value: 'Other' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/scheduler/api/submit/step1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            website: formData.website,
            industry: formData.industry,
            heardFrom: formData.heardFrom,
          },
          visitorId,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to submit');
      }

      onComplete(result.data.hubspotId);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-slide-in">
      <form onSubmit={handleSubmit}>
        {/* Name row */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="form-label">{t.details.firstName}</label>
            <input
              type="text"
              className="form-input"
              value={formData.firstName}
              onChange={(e) => updateFormData({ firstName: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="form-label">{t.details.lastName}</label>
            <input
              type="text"
              className="form-input"
              value={formData.lastName}
              onChange={(e) => updateFormData({ lastName: e.target.value })}
              required
            />
          </div>
        </div>

        {/* Email */}
        <div className="form-group">
          <label className="form-label">{t.details.email}</label>
          <input
            type="email"
            className="form-input"
            value={formData.email}
            onChange={(e) => updateFormData({ email: e.target.value })}
            required
          />
        </div>

        {/* Website */}
        <div className="form-group">
          <label className="form-label">{t.details.website}</label>
          <input
            type="text"
            className="form-input"
            placeholder={t.details.websitePlaceholder}
            value={formData.website}
            onChange={(e) => updateFormData({ website: e.target.value })}
            required
          />
        </div>

        {/* Industry & Source row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="form-label">{t.details.industry}</label>
            <select
              className="form-select"
              value={formData.industry}
              onChange={(e) => updateFormData({ industry: e.target.value })}
              required
            >
              <option value="" disabled>{t.details.select}</option>
              {industries.map((industry) => (
                <option key={industry.key} value={industry.value}>
                  {t.industries[industry.key as keyof typeof t.industries]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">{t.details.heardFrom}</label>
            <select
              className="form-select"
              value={formData.heardFrom}
              onChange={(e) => updateFormData({ heardFrom: e.target.value })}
              required
            >
              <option value="" disabled>{t.details.select}</option>
              {sources.map((source) => (
                <option key={source.key} value={source.value}>
                  {t.sources[source.key as keyof typeof t.sources]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary"
        >
          {isSubmitting ? (
            <>
              <span className="spinner" />
              {t.details.processing}
            </>
          ) : (
            t.details.continue
          )}
        </button>
      </form>
    </div>
  );
}
