import React, { useState } from 'react';
import { X, Calendar, Clock, MapPin, Video, Users, AlignLeft } from 'lucide-react';
import { NewEventPayload } from '../services/calendar';

interface NewEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate: string; // YYYY-MM-DD
  initialData?: {
    summary?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    attendeesEmails?: string[];
    description?: string;
    addGoogleMeet?: boolean;
    gmailMessageId?: string;
  };
  onSubmit: (payload: NewEventPayload) => Promise<void>;
}

export const NewEventModal: React.FC<NewEventModalProps> = ({
  isOpen,
  onClose,
  defaultDate,
  initialData,
  onSubmit,
}) => {
  const [summary, setSummary] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [attendeesInput, setAttendeesInput] = useState('');
  const [addGoogleMeet, setAddGoogleMeet] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync initialData or defaultDate when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSummary(initialData?.summary || '');
      setDate(initialData?.date || defaultDate);
      setStartTime(initialData?.startTime || '10:00');
      setEndTime(initialData?.endTime || '11:00');
      setLocation(initialData?.location || '');
      setAttendeesInput(
        initialData?.attendeesEmails ? initialData.attendeesEmails.join(', ') : ''
      );
      setDescription(initialData?.description || '');
      setAddGoogleMeet(
        initialData?.addGoogleMeet !== undefined ? initialData.addGoogleMeet : true
      );
      setError(null);
    }
  }, [isOpen, initialData, defaultDate]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) {
      setError('Please provide a meeting or appointment title.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const startDateTime = new Date(`${date}T${startTime}:00`).toISOString();
      const endDateTime = new Date(`${date}T${endTime}:00`).toISOString();

      const attendeesEmails = attendeesInput
        .split(/[\s,;]+/)
        .map((e) => e.trim())
        .filter((e) => e.includes('@'));

      await onSubmit({
        summary: summary.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        startDateTime,
        endDateTime,
        attendeesEmails: attendeesEmails.length > 0 ? attendeesEmails : undefined,
        addGoogleMeet,
      });

      // Reset form
      setSummary('');
      setDescription('');
      setLocation('');
      setAttendeesInput('');
      onClose();
    } catch (err: any) {
      console.error('Error creating calendar event:', err);
      setError(err.message || 'Failed to schedule event in Google Calendar');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="new-event-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 dark:bg-slate-950/80 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        id="new-event-modal-card"
        className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 my-8 transition-colors"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 id="new-event-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Schedule Appointment / Meeting
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Adds directly to your Google Calendar</p>
            </div>
          </div>
          <button
            id="new-event-modal-close"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/80 text-xs text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Title / Summary *
            </label>
            <input
              id="event-title-input"
              type="text"
              required
              placeholder="e.g. Project Sync, Client Review, Doctor Appointment"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-950/40 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          {/* Date & Times */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                Date
              </label>
              <input
                id="event-date-input"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                Start Time
              </label>
              <input
                id="event-start-time-input"
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                End Time
              </label>
              <input
                id="event-end-time-input"
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              Location (Optional)
            </label>
            <input
              id="event-location-input"
              type="text"
              placeholder="e.g. Conference Room B, Downtown Clinic, Online"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:border-blue-500 dark:focus:border-blue-400 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          {/* Google Meet Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Add Google Meet Video</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Automatically generate a video link</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                id="event-meet-checkbox"
                type="checkbox"
                checked={addGoogleMeet}
                onChange={(e) => setAddGoogleMeet(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Attendees */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              Attendees Emails (Optional)
            </label>
            <input
              id="event-attendees-input"
              type="text"
              placeholder="colleague@example.com, client@partner.com"
              value={attendeesInput}
              onChange={(e) => setAttendeesInput(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:border-blue-500 dark:focus:border-blue-400 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
              <AlignLeft className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              Agenda / Description (Optional)
            </label>
            <textarea
              id="event-description-input"
              rows={3}
              placeholder="Notes, agenda, or background details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:border-blue-500 dark:focus:border-blue-400 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
            <button
              id="event-cancel-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="event-save-btn"
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer shadow-xs shadow-blue-200 dark:shadow-none disabled:opacity-50"
            >
              {isSubmitting ? 'Adding to Calendar...' : 'Schedule Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
