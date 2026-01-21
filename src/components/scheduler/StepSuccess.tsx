'use client';

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
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Meeting Confirmed</h2>
      <p className="text-sm text-slate-500 mb-8 max-w-[280px] mx-auto">
        A calendar invitation has been sent to <span className="font-semibold text-slate-700">{formData.email}</span>.
      </p>

      {/* Premium Booking Card */}
      <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 shadow-inner text-left mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-12 -mt-12"></div>
        
        <div className="relative z-10 space-y-4">
          <div className="flex justify-between items-start">
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
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 max-w-xs mx-auto">
        <a 
          href="https://www.blockchain-ads.com/case-studies"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all"
        >
          See Success Stories
        </a>

        <a
          href="/scheduler/manage"
          className="w-full py-4 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-[0.98] flex items-center justify-center"
        >
          Manage my booking
        </a>
        
        <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
          Need to change? Reschedule or cancel anytime from <br/>your confirmation email.
        </p>
      </div>
    </div>
  );
}
