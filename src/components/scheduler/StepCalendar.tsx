'use client';

import { useState, useEffect } from 'react';
import type { FormData } from '@/app/page';
import { getMonthDates, getMonthName, isPastDate, formatDate } from '@/lib/utils/dates';

interface CalendarConfig {
  availableDays: number[]; // 0=Sun, 1=Mon, etc.
  businessHours: { start: string; end: string };
  slotDuration: number;
  bufferTime: number;
  blockedDates: string[];
}

interface StepCalendarProps {
  formData: FormData;
  updateFormData: (data: Partial<FormData>) => void;
  hubspotId: string | null;
  visitorId: string | null;
  onComplete: (result: {
    bookingId: string;
    scheduledDate: string;
    scheduledTime: string;
    googleMeetLink: string | null;
  }) => void;
  onBack: () => void;
}

export default function StepCalendar({
  formData,
  updateFormData,
  hubspotId,
  visitorId,
  onComplete,
  onBack,
}: StepCalendarProps) {
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calendarConfig, setCalendarConfig] = useState<CalendarConfig>({
    availableDays: [1, 2, 3, 4, 5], // Default: Mon-Fri
    businessHours: { start: '09:00', end: '17:00' },
    slotDuration: 30,
    bufferTime: 0,
    blockedDates: [],
  });

  // Fetch calendar config on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/scheduler/api/calendar-config');
        const result = await response.json();
        if (result.success && result.config) {
          setCalendarConfig(result.config);
        }
      } catch (err) {
        console.error('Failed to fetch calendar config:', err);
      }
    };
    fetchConfig();
  }, []);

  const monthDates = getMonthDates(viewDate.getFullYear(), viewDate.getMonth());
  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const navigateMonth = (direction: 'prev' | 'next') => {
    setViewDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const handleDateSelect = async (date: Date) => {
    const dateStr = formatDate(date);
    setSelectedDate(dateStr);
    updateFormData({ date: dateStr, time: '' });
    setAvailableSlots([]);
    setIsLoadingSlots(true);
    setError(null);

    try {
      const response = await fetch('/scheduler/api/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateStr }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch slots');
      }

      setAvailableSlots(result.slots || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load time slots');
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const handleTimeSelect = (time: string) => {
    updateFormData({ time });
  };

  const handleConfirmBooking = async () => {
    if (!formData.date || !formData.time) return;

    const confirmed = window.confirm(
      `Confirm your verification call for ${formData.date} at ${formData.time}?`
    );

    if (!confirmed) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/scheduler/api/submit/step3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: formData,
          hubspotId,
          visitorId,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to complete booking');
      }

      onComplete(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setIsSubmitting(false);
    }
  };

  const isDateDisabled = (date: Date | null): boolean => {
    if (!date) return true;
    const dateStr = formatDate(date);
    
    // Check if past date
    if (isPastDate(dateStr)) return true;
    
    // Check if day of week is available
    const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, etc.
    if (!calendarConfig.availableDays.includes(dayOfWeek)) return true;
    
    // Check if date is blocked
    if (calendarConfig.blockedDates.includes(dateStr)) return true;
    
    return false;
  };

  return (
    <div className="animate-slide-in">
      {/* Header */}
      <div className="mb-6 pb-4 border-b border-slate-100">
        <h2 className="text-xl font-bold text-slate-900">Pick a time for your call</h2>
        <p className="text-sm text-slate-500 mt-1">
          Times are shown in your local timezone ({formData.timezone || 'UTC'})
        </p>
      </div>

      {/* Calendar + Slots */}
      <div className="calendar-container">
        {/* Calendar */}
        <div className="border-r border-slate-100 pr-6">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-lg font-bold text-slate-900">
              {getMonthName(viewDate.getMonth())} {viewDate.getFullYear()}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => navigateMonth('prev')}
                className="calendar-nav"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => navigateMonth('next')}
                className="calendar-nav"
              >
                ›
              </button>
            </div>
          </div>

          {/* Day names */}
          <div className="calendar-grid mb-2">
            {dayNames.map(day => (
              <div key={day} className="calendar-day-name">{day}</div>
            ))}
          </div>

          {/* Calendar dates */}
          <div className="calendar-grid">
            {monthDates.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} />;
              }

              const dateStr = formatDate(date);
              const isSelected = selectedDate === dateStr;
              const disabled = isDateDisabled(date);

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => !disabled && handleDateSelect(date)}
                  disabled={disabled}
                  className={`calendar-day ${isSelected ? 'selected' : ''}`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Time slots */}
        <div>
          {!selectedDate && (
            <div className="text-center text-slate-400 py-8">
              Select a date to view times
            </div>
          )}

          {selectedDate && isLoadingSlots && (
            <div className="text-center text-slate-400 py-8">
              <span className="spinner inline-block border-slate-400 border-t-transparent" />
              <span className="ml-2">Loading...</span>
            </div>
          )}

          {selectedDate && !isLoadingSlots && availableSlots.length === 0 && (
            <div className="text-center text-slate-400 py-8">
              No available slots for this date
            </div>
          )}

          {selectedDate && !isLoadingSlots && availableSlots.length > 0 && (
            <>
              <div className="text-xs font-semibold uppercase text-slate-500 mb-3">
                Available Times
              </div>
              <div className="time-slots">
                {availableSlots.map(time => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => handleTimeSelect(time)}
                    className={`time-slot ${formData.time === time ? 'selected' : ''}`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Confirm button */}
      {formData.date && formData.time && (
        <div className="mt-6 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleConfirmBooking}
            disabled={isSubmitting}
            className="btn-primary"
          >
            {isSubmitting ? (
              <>
                <span className="spinner" />
                Booking...
              </>
            ) : (
              `Confirm ${formData.date} at ${formData.time}`
            )}
          </button>
        </div>
      )}

      {/* Back button */}
      <div className="mt-4">
        <button
          type="button"
          onClick={onBack}
          className="btn-secondary"
        >
          Back
        </button>
      </div>
    </div>
  );
}
