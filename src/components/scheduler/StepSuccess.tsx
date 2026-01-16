'use client';

import { useEffect } from 'react';
import type { FormData } from '@/app/page';
import { formatDisplayDate, formatDisplayTime } from '@/lib/utils/dates';

interface StepSuccessProps {
  formData: FormData;
  bookingResult: {
    bookingId: string;
    scheduledDate: string;
    scheduledTime: string;
    googleMeetLink: string | null;
  };
}

export default function StepSuccess({ formData, bookingResult }: StepSuccessProps) {
  const closePortal = () => {
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'nexus-scheduler-close' }, '*');
    }
  };

  return (
    <div className="text-center animate-fade-in">
      {/* Success icon */}
      <div className="success-icon scale-110 mb-6">
        <svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">
          <circle cx="26" cy="26" r="25" fill="#10b981" />
          <path
            fill="none"
            stroke="#FFF"
            strokeWidth="4"
            strokeLinecap="round"
            strokeMiterlimit="10"
            d="M14.1 27.2l7.1 7.2 16.7-16.8"
          />
        </svg>
      </div>

      {/* Heading */}
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Meeting Confirmed!</h2>
      <p className="text-slate-500 mb-6">
        We've sent a calendar invitation and meeting link to <span className="font-semibold text-slate-700">{formData.email}</span>.
      </p>

      {/* Booking ticket */}
      <div className="booking-ticket text-left bg-slate-50 rounded-xl p-5 border-l-4 border-l-emerald-500">
        <div className="ticket-row border-b border-slate-200/50 pb-2 mb-2">
          <span className="ticket-label">Date & Time</span>
          <span className="ticket-value">
            {formatDisplayDate(bookingResult.scheduledDate)} at {formatDisplayTime(bookingResult.scheduledTime)}
          </span>
        </div>
        <div className="ticket-row border-b border-slate-200/50 pb-2 mb-2">
          <span className="ticket-label">Guest</span>
          <span className="ticket-value">{formData.firstName} {formData.lastName}</span>
        </div>
        {bookingResult.googleMeetLink && (
          <div className="ticket-row">
            <span className="ticket-label">Meeting Link</span>
            <a
              href={bookingResult.googleMeetLink}
              target="_blank"
              rel="noopener noreferrer"
              className="ticket-value text-primary-600 hover:underline flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 100 4v2a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /></svg>
              Google Meet
            </a>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 max-w-xs mx-auto mt-8">
        <button onClick={closePortal} className="btn-primary bg-emerald-600 hover:bg-emerald-700">
          Finish & Close
        </button>
        
        <p className="text-[11px] text-slate-400">
          You can reschedule or cancel this meeting anytime from your confirmation email.
        </p>
      </div>
    </div>
  );
}
