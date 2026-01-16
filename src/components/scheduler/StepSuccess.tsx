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
      window.parent.postMessage('close-modal', '*');
    }
  };

  const generateCalendarLink = () => {
    const startTime = toISODateTime(bookingResult.scheduledDate, bookingResult.scheduledTime).replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endTime = toISODateTime(bookingResult.scheduledDate, bookingResult.scheduledTime, 30).replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    const url = new URL('https://calendar.google.com/calendar/render');
    url.searchParams.append('action', 'TEMPLATE');
    url.searchParams.append('text', 'Blockchain-Ads Account Verification');
    url.searchParams.append('details', `Personalized onboarding and assistance for account verification.\n\nMeeting Link: ${bookingResult.googleMeetLink || 'Will be sent via email'}`);
    url.searchParams.append('dates', `${startTime}/${endTime}`);
    
    return url.toString();
  };

  return (
    <div className="text-center animate-fade-in py-2">
      {/* Success icon */}
      <div className="success-icon scale-110 mb-6 drop-shadow-sm">
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
      <p className="text-sm text-slate-500 mb-8 max-w-[280px] mx-auto">
        We've sent a calendar invitation and meeting link to <span className="font-semibold text-slate-700">{formData.email}</span>.
      </p>

      {/* Premium Booking Card */}
      <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 shadow-inner text-left mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-12 -mt-12"></div>
        
        <div className="relative z-10 space-y-4">
          <div className="flex justify-between items-start border-b border-slate-200/50 pb-3">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Date & Time</p>
              <p className="text-sm font-bold text-slate-900">
                {formatDisplayDate(bookingResult.scheduledDate)}
              </p>
              <p className="text-lg font-black text-primary-600">
                {formatDisplayTime(bookingResult.scheduledTime)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Guest</p>
              <p className="text-sm font-bold text-slate-900">{formData.firstName} {formData.lastName}</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center border border-slate-100">
                <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 100 4v2a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /></svg>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Meeting Link</p>
                <p className="text-xs font-bold text-slate-700">Google Meet</p>
              </div>
            </div>
            {bookingResult.googleMeetLink ? (
              <a
                href={bookingResult.googleMeetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-white bg-primary-600 px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
              >
                Join Now
              </a>
            ) : (
              <span className="text-[10px] font-bold text-slate-400 italic">Sent to email</span>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 max-w-xs mx-auto">
        <a 
          href={generateCalendarLink()}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19 4H5C3.89543 4 3 4.89543 3 6V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V6C21 4.89543 20.1046 4 19 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 10H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Add to Google Calendar
        </a>

        <button 
          onClick={closePortal} 
          className="w-full py-4 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-[0.98]"
        >
          Finish & Close
        </button>
        
        <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
          Need to change? Reschedule or cancel anytime from <br/>your confirmation email.
        </p>
      </div>
    </div>
  );
}
