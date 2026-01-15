'use client';

interface StepWelcomeProps {
  onStart: () => void;
}

export default function StepWelcome({ onStart }: StepWelcomeProps) {
  return (
    <div className="text-center animate-fade-in">
      {/* Logo */}
      <div className="mb-6">
        <svg 
          className="w-16 h-16 mx-auto text-slate-900"
          viewBox="0 0 100 100" 
          fill="currentColor"
        >
          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="4"/>
          <path d="M30 50 L45 65 L70 35" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      
      {/* Heading */}
      <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
        Get Verified & Access Blockchain-Ads
      </h1>
      
      {/* Description */}
      <div className="text-left max-w-md mx-auto mb-8 text-slate-600 space-y-4">
        <p>
          Access is limited to verified advertisers only that schedule and pass the qualification. 
          Compliance checks and budget thresholds apply.
        </p>
        
        <div>
          <p className="font-semibold text-slate-700 mb-2">This call will:</p>
          <ul className="list-disc list-inside space-y-1 text-slate-600">
            <li>Confirm your campaign goals</li>
            <li>Determine eligibility for access</li>
          </ul>
        </div>
      </div>
      
      {/* CTA Button */}
      <button 
        onClick={onStart}
        className="btn-primary max-w-xs mx-auto"
      >
        Get Verified
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      </button>
    </div>
  );
}
