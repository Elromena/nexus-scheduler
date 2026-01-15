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
  const thankYouPath = '/thank-you';

  const redirectToThankYou = () => {
    if (window.parent !== window) {
      window.parent.location.href = thankYouPath;
    } else {
      window.location.href = thankYouPath;
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      redirectToThankYou();
    }, 1500);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="text-center animate-fade-in">
      {/* Success icon */}
      <div className="success-icon">
        <svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">
          <circle cx="26" cy="26" r="25" fill="#2563EB" />
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
      <h2 className="text-2xl font-bold text-slate-900 mb-2">You're booked!</h2>
      <p className="text-slate-500 mb-6">
        We've emailed you the invite. See you on the call.
      </p>

      {/* Booking ticket */}
      <div className="booking-ticket text-left">
        <div className="ticket-row">
          <span className="ticket-label">Status</span>
          <span className="ticket-value text-primary-600">Confirmed</span>
        </div>
        <div className="ticket-row">
          <span className="ticket-label">Date</span>
          <span className="ticket-value">
            {formatDisplayDate(bookingResult.scheduledDate)}
          </span>
        </div>
        <div className="ticket-row">
          <span className="ticket-label">Time</span>
          <span className="ticket-value">
            {formatDisplayTime(bookingResult.scheduledTime)}
          </span>
        </div>
        <div className="ticket-row">
          <span className="ticket-label">Email</span>
          <span className="ticket-value">{formData.email}</span>
        </div>
        {bookingResult.googleMeetLink && (
          <div className="ticket-row">
            <span className="ticket-label">Meeting</span>
            <a
              href={bookingResult.googleMeetLink}
              target="_blank"
              rel="noopener noreferrer"
              className="ticket-value text-primary-600 hover:underline"
            >
              Join Google Meet
            </a>
          </div>
        )}
      </div>

      {/* CTA */}
      <button onClick={redirectToThankYou} className="btn-primary max-w-xs mx-auto">
        Continue
      </button>

      {/* Add to calendar hint */}
      <p className="text-xs text-slate-400 mt-4">
        A calendar invite has been sent to {formData.email}
      </p>
    </div>
  );
}
