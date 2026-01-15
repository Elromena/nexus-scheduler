'use client';

import { useState } from 'react';
import type { FormData } from '@/app/page';

interface StepDetailsProps {
  formData: FormData;
  updateFormData: (data: Partial<FormData>) => void;
  visitorId: string | null;
  onComplete: (hubspotId: string) => void;
  onBack: () => void;
}

const industries = [
  'Finance & Fintech',
  'Gaming',
  'SaaS & Tech',
  'AI & Emerging Tech',
  'Blockchain & Crypto',
  'iGaming',
  'Regulated Industries',
  'Other',
];

const sources = [
  'Google/Search Engines',
  'Social Media (LinkedIn, Twitter/X)',
  'ChatGPT/Perplexity (Other AI Tools)',
  'Another Website/Third Party Article',
  'Friend or Colleague Referral',
  'Other',
];

export default function StepDetails({
  formData,
  updateFormData,
  visitorId,
  onComplete,
  onBack,
}: StepDetailsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-slide-in">
      <form onSubmit={handleSubmit}>
        {/* Name row */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="form-label">First name</label>
            <input
              type="text"
              className="form-input"
              value={formData.firstName}
              onChange={(e) => updateFormData({ firstName: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="form-label">Last name</label>
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
          <label className="form-label">Your email address</label>
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
          <label className="form-label">Website URL</label>
          <input
            type="text"
            className="form-input"
            placeholder="https://"
            value={formData.website}
            onChange={(e) => updateFormData({ website: e.target.value })}
            required
          />
        </div>

        {/* Industry & Source row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="form-label">What industry is the brand in?</label>
            <select
              className="form-select"
              value={formData.industry}
              onChange={(e) => updateFormData({ industry: e.target.value })}
              required
            >
              <option value="" disabled>Select...</option>
              {industries.map((industry) => (
                <option key={industry} value={industry}>{industry}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Where did you first hear about us?</label>
            <select
              className="form-select"
              value={formData.heardFrom}
              onChange={(e) => updateFormData({ heardFrom: e.target.value })}
              required
            >
              <option value="" disabled>Select...</option>
              {sources.map((source) => (
                <option key={source} value={source}>{source}</option>
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
              Processing...
            </>
          ) : (
            'Continue'
          )}
        </button>
      </form>
    </div>
  );
}
