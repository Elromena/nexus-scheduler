'use client';

import { useState, useEffect } from 'react';

interface Booking {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  scheduledDate: string;
  scheduledTime: string;
  timezone: string;
  googleMeetLink: string | null;
  status: string;
}

type Step = 'email' | 'code' | 'bookings' | 'reschedule';

export default function ManageBookingPage() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // For reschedule
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Get base URL for API calls
  const getApiBase = () => {
    if (typeof window === 'undefined') return '';
    // Check if we're embedded or on the scheduler domain
    const path = window.location.pathname;
    if (path.startsWith('/scheduler')) {
      return '/scheduler';
    }
    return '';
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${getApiBase()}/api/manage/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send code');
      }

      setSuccess('Verification code sent! Check your email.');
      setStep('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${getApiBase()}/api/manage/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid code');
      }

      setSessionToken(data.sessionToken);
      setBookings(data.bookings || []);
      setStep('bookings');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  const handleReschedule = (booking: Booking) => {
    setSelectedBooking(booking);
    setNewDate('');
    setNewTime('');
    setAvailableSlots([]);
    setStep('reschedule');
  };

  const fetchSlots = async (date: string) => {
    setLoadingSlots(true);
    try {
      const response = await fetch(`${getApiBase()}/api/slots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      });

      const data = await response.json();
      setAvailableSlots(data.slots || []);
    } catch (err) {
      console.error('Failed to fetch slots:', err);
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    if (newDate) {
      fetchSlots(newDate);
    }
  }, [newDate]);

  const handleConfirmReschedule = async () => {
    if (!selectedBooking || !newDate || !newTime) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${getApiBase()}/api/manage/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          sessionToken,
          newDate,
          newTime,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reschedule');
      }

      // Update local state
      setBookings(prev =>
        prev.map(b =>
          b.id === selectedBooking.id
            ? { ...b, scheduledDate: newDate, scheduledTime: newTime }
            : b
        )
      );

      setSuccess('Booking rescheduled successfully!');
      setStep('bookings');
      setSelectedBooking(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reschedule');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (booking: Booking) => {
    if (!confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${getApiBase()}/api/manage/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          sessionToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel');
      }

      // Remove from local state
      setBookings(prev => prev.filter(b => b.id !== booking.id));
      setSuccess('Booking cancelled successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Get minimum date (Original date + 2 days OR Tomorrow, whichever is later)
  const getMinDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const minFromToday = new Date(today);
    minFromToday.setDate(today.getDate() + 1);

    if (selectedBooking) {
      const originalDate = new Date(selectedBooking.scheduledDate + 'T00:00:00');
      const minFromOriginal = new Date(originalDate);
      minFromOriginal.setDate(originalDate.getDate() + 2);
      
      // Return the later of the two dates
      const finalMin = minFromOriginal > minFromToday ? minFromOriginal : minFromToday;
      return finalMin.toISOString().split('T')[0];
    }
    
    return minFromToday.toISOString().split('T')[0];
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Manage Your Booking</h1>
          <p className="text-slate-500 mt-2">Reschedule or cancel your upcoming meeting</p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            {success}
          </div>
        )}

        {/* Step 1: Email */}
        {step === 'email' && (
          <form onSubmit={handleSendCode}>
            <div className="mb-6">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="form-input"
                required
              />
              <p className="text-xs text-slate-500 mt-2">
                We&apos;ll send a verification code to this email.
              </p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Sending...' : 'Send Verification Code'}
            </button>
          </form>
        )}

        {/* Step 2: Code Verification */}
        {step === 'code' && (
          <form onSubmit={handleVerifyCode}>
            <div className="mb-6">
              <label className="form-label">Verification Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit code"
                className="form-input text-center text-2xl tracking-widest"
                maxLength={6}
                required
              />
              <p className="text-xs text-slate-500 mt-2">
                Check your email for the verification code.
              </p>
            </div>
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="btn-primary w-full"
            >
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>
            <button
              type="button"
              onClick={() => { setStep('email'); setError(''); setSuccess(''); }}
              className="btn-secondary w-full mt-3"
            >
              ← Back to Email
            </button>
          </form>
        )}

        {/* Step 3: Bookings List */}
        {step === 'bookings' && (
          <div>
            {bookings.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-500">No upcoming bookings found.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="border border-slate-200 rounded-lg p-4"
                  >
                    <div className="mb-3">
                      <div className="font-semibold text-slate-900">
                        {formatDate(booking.scheduledDate)}
                      </div>
                      <div className="text-lg text-primary-600 font-medium">
                        {formatTime(booking.scheduledTime)}
                      </div>
                      {booking.timezone && (
                        <div className="text-xs text-slate-500">
                          {booking.timezone}
                        </div>
                      )}
                    </div>

                    {booking.googleMeetLink && (
                      <a
                        href={booking.googleMeetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary-600 hover:underline block mb-3"
                      >
                        Join Google Meet →
                      </a>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReschedule(booking)}
                        className="flex-1 py-2 px-4 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        Reschedule
                      </button>
                      <button
                        onClick={() => handleCancel(booking)}
                        disabled={loading}
                        className="flex-1 py-2 px-4 border border-red-300 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Reschedule */}
        {step === 'reschedule' && selectedBooking && (
          <div>
            <button
              onClick={() => { setStep('bookings'); setSelectedBooking(null); setError(''); }}
              className="text-sm text-slate-500 hover:text-slate-700 mb-4"
            >
              ← Back to bookings
            </button>

            <div className="mb-6 p-4 bg-slate-50 rounded-lg">
              <div className="text-sm text-slate-500">Current booking:</div>
              <div className="font-semibold text-slate-900">
                {formatDate(selectedBooking.scheduledDate)} at {formatTime(selectedBooking.scheduledTime)}
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label">New Date</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                min={getMinDate()}
                className="form-input"
              />
            </div>

            {newDate && (
              <div className="mb-6">
                <label className="form-label">Available Times</label>
                {loadingSlots ? (
                  <div className="text-center py-4 text-slate-500">Loading available times...</div>
                ) : availableSlots.length === 0 ? (
                  <div className="text-center py-4 text-slate-500">No available times on this date.</div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setNewTime(slot)}
                        className={`py-2 px-3 border rounded-lg text-sm font-medium transition-colors ${
                          newTime === slot
                            ? 'border-primary-500 bg-primary-600 text-white'
                            : 'border-slate-200 text-slate-700 hover:border-primary-300'
                        }`}
                      >
                        {formatTime(slot)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleConfirmReschedule}
              disabled={loading || !newDate || !newTime}
              className="btn-primary w-full"
            >
              {loading ? 'Rescheduling...' : 'Confirm New Time'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
