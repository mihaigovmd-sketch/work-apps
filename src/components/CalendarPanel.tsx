import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  MapPin,
  Video,
  Users,
  ExternalLink,
  Trash2,
  FilePlus2,
  ChevronRight,
  Sparkles,
  CalendarCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { CalendarEventItem } from '../types';
import { QuickTaskScheduler } from './QuickTaskScheduler';

interface CalendarPanelProps {
  currentDate: string; // YYYY-MM-DD
  events: CalendarEventItem[];
  upcomingEvents?: CalendarEventItem[];
  isLoading: boolean;
  onOpenNewEventModal: () => void;
  onDeleteEvent: (event: CalendarEventItem) => void;
  onInsertEventToNote: (event: CalendarEventItem) => void;
  onQuickScheduleEvent?: (payload: {
    summary: string;
    description?: string;
    date: string;
    time: string;
    durationMinutes: number;
    addGoogleMeet?: boolean;
  }) => Promise<void>;
  isScheduling?: boolean;
  onDateChange?: (date: string) => void;
}

export const CalendarPanel: React.FC<CalendarPanelProps> = ({
  currentDate,
  events,
  upcomingEvents = [],
  isLoading,
  onOpenNewEventModal,
  onDeleteEvent,
  onInsertEventToNote,
  onQuickScheduleEvent,
  isScheduling = false,
  onDateChange,
}) => {
  const [viewMode, setViewMode] = useState<'scheduler' | 'day' | 'week'>('day');
  const [isSchedulerOpen, setIsSchedulerOpen] = useState(true);

  const displayedEvents = viewMode === 'day' ? events : upcomingEvents;

  const formatEventTime = (event: CalendarEventItem) => {
    if (event.start.date) {
      return 'All Day';
    }
    if (event.start.dateTime) {
      const start = new Date(event.start.dateTime).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      if (event.end.dateTime) {
        const end = new Date(event.end.dateTime).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
        return `${start} - ${end}`;
      }
      return start;
    }
    return 'Time unspecified';
  };

  const formatEventDate = (event: CalendarEventItem) => {
    const dStr = event.start.dateTime || event.start.date;
    if (!dStr) return '';
    const d = new Date(dStr);
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div
      id="calendar-agenda-panel"
      className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col h-[calc(100vh-130px)] min-h-[580px] 2xl:min-h-[720px] 3xl:min-h-[850px] overflow-hidden transition-colors"
    >
      {/* Panel Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-100/70 dark:bg-blue-950/70 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 id="calendar-panel-title" className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              Appointments &amp; Meetings
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Google Calendar</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onQuickScheduleEvent && (
            <button
              id="btn-toggle-quick-scheduler"
              type="button"
              onClick={() => setIsSchedulerOpen(!isSchedulerOpen)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                isSchedulerOpen
                  ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 shadow-2xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
              title="Schedule a task for tomorrow or today automatically in Google Calendar"
            >
              <CalendarCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline">Schedule for Tomorrow</span>
              <span className="sm:hidden">Schedule</span>
              {isSchedulerOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}

          <button
            id="new-appointment-btn"
            onClick={onOpenNewEventModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
            title="Create detailed calendar meeting or event"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Meeting</span>
          </button>
        </div>
      </div>

      {/* Quick Task Scheduler Department ("schedules a task for tomorrow at 10:00") */}
      {onQuickScheduleEvent && isSchedulerOpen && (
        <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40">
          <QuickTaskScheduler
            currentDate={currentDate}
            onScheduleEvent={onQuickScheduleEvent}
            isScheduling={isScheduling}
            onJumpToDate={onDateChange}
          />
        </div>
      )}

      {/* Filter Tabs */}
      <div className="px-4 py-2 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-medium">
          <button
            id="view-day-tab"
            onClick={() => setViewMode('day')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              viewMode === 'day'
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Today ({events.length})
          </button>
          <button
            id="view-week-tab"
            onClick={() => setViewMode('week')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              viewMode === 'week'
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Next 7 Days ({upcomingEvents.length})
          </button>
        </div>

        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
          {viewMode === 'day' ? currentDate : 'Upcoming Week'}
        </span>
      </div>

      {/* Events List Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3 py-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : displayedEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-3">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
              {viewMode === 'day' ? 'No appointments today' : 'No upcoming appointments'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mb-4 leading-relaxed">
              Your Google Calendar is free for this period. Schedule a new meeting or appointment anytime.
            </p>
            <button
              id="empty-schedule-btn"
              onClick={onOpenNewEventModal}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer"
            >
              + Schedule Appointment
            </button>
          </div>
        ) : (
          displayedEvents.map((event) => {
            const timeStr = formatEventTime(event);
            const dateStr = viewMode === 'week' ? formatEventDate(event) : '';

            return (
              <div
                key={event.id}
                id={`calendar-event-${event.id}`}
                className="group relative p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 transition-all hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {dateStr && (
                      <span className="inline-block text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
                        {dateStr}
                      </span>
                    )}
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {event.summary}
                    </h4>

                    {/* Time indicator */}
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-600 dark:text-slate-300 font-medium">
                      <Clock className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 shrink-0" />
                      <span>{timeStr}</span>
                    </div>

                    {/* Location */}
                    {event.location && (
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    )}

                    {/* Video Meeting */}
                    {event.hangoutLink && (
                      <div className="mt-2">
                        <a
                          id={`join-meet-${event.id}`}
                          href={event.hangoutLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800/80 transition-colors"
                        >
                          <Video className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Join Google Meet</span>
                        </a>
                      </div>
                    )}

                    {/* Description preview */}
                    {event.description && (
                      <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {event.description}
                      </p>
                    )}

                    {/* Attendees */}
                    {event.attendees && event.attendees.length > 0 && (
                      <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <Users className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                        <span>{event.attendees.length} attendee{event.attendees.length > 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      id={`insert-to-note-${event.id}`}
                      onClick={() => onInsertEventToNote(event)}
                      title="Insert meeting details into daily note"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
                    >
                      <FilePlus2 className="w-4 h-4" />
                    </button>

                    {event.htmlLink && (
                      <a
                        id={`open-cal-${event.id}`}
                        href={event.htmlLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open in Google Calendar"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}

                    <button
                      id={`delete-event-${event.id}`}
                      onClick={() => onDeleteEvent(event)}
                      title="Delete appointment"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
        <span>Synced with Google Calendar</span>
        <span className="text-slate-400 dark:text-slate-500">Time zone: {Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
      </div>
    </div>
  );
};
