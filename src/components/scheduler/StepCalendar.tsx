'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/TranslationContext';
import type { FormData } from '@/app/page';
import { getMonthDates, isPastDate, formatDate } from '@/lib/utils/dates';

interface CalendarConfig {
  availableDays: number[]; // 0=Sun, 1=Mon, etc.
  businessHours: { start: string; end: string };
  slotDuration: number;
  bufferTime: number;
  blockedDates: string[];
  hostTimezone: string;
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
  const { translations: t, locale } = useTranslation();
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
    hostTimezone: 'UTC',
  });

  // Day names from translations
  const dayNames = [
    t.days.su, t.days.mo, t.days.tu, t.days.we, t.days.th, t.days.fr, t.days.sa
  ];

  // Month names from translations
  const monthNames = [
    t.months.january, t.months.february, t.months.march, t.months.april,
    t.months.may, t.months.june, t.months.july, t.months.august,
    t.months.september, t.months.october, t.months.november, t.months.december
  ];

  // Fetch calendar config on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/scheduler/api/calendar-config');
        const result = await response.json();
        if (result.success && result.config) {
          const config = { ...result.config, hostTimezone: result.hostTimezone || 'UTC' };
          setCalendarConfig(config);
        }
      } catch (err) {
        console.error('Failed to fetch calendar config:', err);
      }
    };
    fetchConfig();
  }, []);

  const monthDates = getMonthDates(viewDate.getFullYear(), viewDate.getMonth());

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
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const handleTimeSelect = (time: string) => {
    updateFormData({ time });
  };

  const formatSlotForDisplay = (slot: string) => {
    if (!selectedDate) return slot;
    try {
      const [hour, min] = slot.split(':').map(Number);
      
      // Get host offset for the target date
      const dummyDate = new Date(`${selectedDate}T${slot}:00`);
      const hostOffsetStr = new Intl.DateTimeFormat('en-US', {
        timeZone: calendarConfig.hostTimezone,
        timeZoneName: 'shortOffset'
      }).format(dummyDate).split('GMT')[1] || '+00:00';
      
      const formattedOffset = hostOffsetStr.includes(':') 
        ? hostOffsetStr 
        : hostOffsetStr.startsWith('+') || hostOffsetStr.startsWith('-')
          ? hostOffsetStr.charAt(0) + hostOffsetStr.substring(1).padStart(2, '0') + ':00'
          : '+00:00';

      const isoWithOffset = `${selectedDate}T${slot}:00${formattedOffset}`;
      const localDate = new Date(isoWithOffset);

      // Return a 2-line format for the grid: Time + AM/PM
      const timeStr = localDate.toLocaleTimeString(locale === 'en' ? [] : locale, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: locale === 'en' || locale === 'es'
      });

      if (locale === 'en' || locale === 'es') {
        const [time, period] = timeStr.split(' ');
        return (
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold">{time}</span>
            <span className="text-[10px] uppercase opacity-60 font-semibold">{period}</span>
          </div>
        );
      }
      
      return (
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-bold">{timeStr}</span>
        </div>
      );
    } catch (e) {
      return slot;
    }
  };

  const handleConfirmBooking = async () => {
    if (!formData.date || !formData.time) return;

    const confirmMessage = t.calendar.confirmPrompt
      .replace('{date}', formData.date)
      .replace('{time}', formData.time);
    
    const confirmed = window.confirm(confirmMessage);

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
      setError(err instanceof Error ? err.message : t.common.error);
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
        <h2 className="text-xl font-bold text-slate-900">{t.calendar.title}</h2>
        <p className="text-sm text-slate-500 mt-1">
          {t.calendar.timezone} ({formData.timezone || 'UTC'})
        </p>
      </div>

      {/* Calendar + Slots */}
      <div className="calendar-container">
        {/* Calendar */}
        <div className="border-r border-slate-100 pr-6">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-lg font-bold text-slate-900">
              {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
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
              {t.calendar.selectDate}
            </div>
          )}

          {selectedDate && isLoadingSlots && (
            <div className="text-center text-slate-400 py-8">
              <span className="spinner inline-block border-slate-400 border-t-transparent" />
              <span className="ml-2">{t.calendar.loading}</span>
            </div>
          )}

          {selectedDate && !isLoadingSlots && availableSlots.length === 0 && (
            <div className="text-center text-slate-400 py-8">
              {t.calendar.noSlots}
            </div>
          )}

          {selectedDate && !isLoadingSlots && availableSlots.length > 0 && (
            <>
              <div className="text-xs font-semibold uppercase text-slate-500 mb-3">
                {t.calendar.availableTimes}
              </div>
              <div className="time-slots">
                {availableSlots.map(time => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => handleTimeSelect(time)}
                    className={`time-slot ${formData.time === time ? 'selected' : ''}`}
                  >
                    {formatSlotForDisplay(time)}
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
                {t.calendar.booking}
              </>
            ) : (
              `${t.calendar.confirm} ${formData.date} at ${formData.time}`
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
          {t.calendar.back}
        </button>
      </div>
    </div>
  );
}
