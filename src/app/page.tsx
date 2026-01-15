'use client';

import { useState, useEffect } from 'react';
import StepWelcome from '@/components/scheduler/StepWelcome';
import StepDetails from '@/components/scheduler/StepDetails';
import StepQualification from '@/components/scheduler/StepQualification';
import StepCalendar from '@/components/scheduler/StepCalendar';
import StepSuccess from '@/components/scheduler/StepSuccess';
import ProgressBar from '@/components/scheduler/ProgressBar';

// Form data types
export interface FormData {
  // Step 1
  firstName: string;
  lastName: string;
  email: string;
  website: string;
  industry: string;
  heardFrom: string;
  // Step 2
  objective: string;
  budget: string;
  roleType: string;
  // Step 3
  date: string;
  time: string;
  timezone: string;
}

const initialFormData: FormData = {
  firstName: '',
  lastName: '',
  email: '',
  website: '',
  industry: '',
  heardFrom: '',
  objective: '',
  budget: '',
  roleType: '',
  date: '',
  time: '',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
};

export default function SchedulerPage() {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [hubspotId, setHubspotId] = useState<string | null>(null);
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [bookingResult, setBookingResult] = useState<{
    bookingId: string;
    scheduledDate: string;
    scheduledTime: string;
    googleMeetLink: string | null;
  } | null>(null);

  // Get visitor ID from tracker on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.NexusTracker) {
      setVisitorId(window.NexusTracker.getVisitorId());
    }
  }, []);

  // Track form opened when component mounts
  useEffect(() => {
    if (typeof window !== 'undefined' && window.NexusTracker) {
      window.NexusTracker.trackFormOpened();
    }
  }, []);

  const updateFormData = (data: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const goToStep = (newStep: number) => {
    // Track step change
    if (typeof window !== 'undefined' && window.NexusTracker) {
      if (newStep > step) {
        window.NexusTracker.trackStepCompleted(step);
      }
      window.NexusTracker.trackStepStarted(newStep);
    }
    setStep(newStep);
  };

  const handleStep1Complete = (hsId: string) => {
    setHubspotId(hsId);
    goToStep(2);
  };

  const handleStep2Complete = () => {
    goToStep(3);
  };

  const handleBookingComplete = (result: {
    bookingId: string;
    scheduledDate: string;
    scheduledTime: string;
    googleMeetLink: string | null;
  }) => {
    setBookingResult(result);
    
    // Track form submission
    if (typeof window !== 'undefined' && window.NexusTracker) {
      window.NexusTracker.trackFormSubmitted({
        bookingId: result.bookingId,
        date: result.scheduledDate,
        time: result.scheduledTime,
      });
    }
    
    goToStep(4);
  };

  return (
    <div className="scheduler-container">
      <div className="scheduler-card animate-fade-in">
        {/* Progress bar for steps 1-3 */}
        {step > 0 && step < 4 && <ProgressBar currentStep={step} totalSteps={3} />}
        
        {/* Step content */}
        {step === 0 && (
          <StepWelcome onStart={() => goToStep(1)} />
        )}
        
        {step === 1 && (
          <StepDetails
            formData={formData}
            updateFormData={updateFormData}
            visitorId={visitorId}
            onComplete={handleStep1Complete}
            onBack={() => goToStep(0)}
          />
        )}
        
        {step === 2 && (
          <StepQualification
            formData={formData}
            updateFormData={updateFormData}
            hubspotId={hubspotId}
            visitorId={visitorId}
            onComplete={handleStep2Complete}
            onBack={() => goToStep(1)}
          />
        )}
        
        {step === 3 && (
          <StepCalendar
            formData={formData}
            updateFormData={updateFormData}
            hubspotId={hubspotId}
            visitorId={visitorId}
            onComplete={handleBookingComplete}
            onBack={() => goToStep(2)}
          />
        )}
        
        {step === 4 && bookingResult && (
          <StepSuccess
            formData={formData}
            bookingResult={bookingResult}
          />
        )}
      </div>
    </div>
  );
}

// Type declaration for window.NexusTracker
declare global {
  interface Window {
    NexusTracker?: {
      track: (event: string, data?: Record<string, unknown>) => void;
      trackFormOpened: () => void;
      trackStepStarted: (step: number) => void;
      trackStepCompleted: (step: number, data?: Record<string, unknown>) => void;
      trackFormSubmitted: (data?: Record<string, unknown>) => void;
      trackFormAbandoned: (step: number) => void;
      getVisitorId: () => string;
      getSessionId: () => string;
      getFingerprint: () => string;
      getFirstTouchUTM: () => Record<string, string>;
      getLandingPage: () => string;
      getDeviceInfo: () => Record<string, string>;
      getAttribution: () => Record<string, unknown>;
      version: string;
    };
  }
}
