import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Mic,
  Square,
  Video,
  Plus,
  CalendarCheck,
  Send,
} from 'lucide-react';
import { useVoiceDictation } from '../hooks/useVoiceDictation';
import { formatDateDayMonthYear } from '../utils/dateTemplates';

interface QuickTaskSchedulerProps {
  currentDate: string; // YYYY-MM-DD
  onScheduleEvent: (payload: {
    summary: string;
    description?: string;
    date: string;
    time: string;
    durationMinutes: number;
    addGoogleMeet?: boolean;
  }) => Promise<void>;
  isScheduling?: boolean;
  onJumpToDate?: (date: string) => void;
}

export const QuickTaskScheduler: React.FC<QuickTaskSchedulerProps> = ({
  currentDate,
  onScheduleEvent,
  isScheduling = false,
  onJumpToDate,
}) => {
  // Compute Tomorrow and Day After Tomorrow strings
  const todayStr = useMemo(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  const tomorrowStr = useMemo(() => {
    const d = new Date(`${currentDate}T12:00:00`);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, [currentDate]);

  const dayAfterTomorrowStr = useMemo(() => {
    const d = new Date(`${currentDate}T12:00:00`);
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  }, [currentDate]);

  // State
  const [taskName, setTaskName] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(tomorrowStr);
  const [selectedTime, setSelectedTime] = useState<string>('10:00'); // default 10:00 as requested
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [addGoogleMeet, setAddGoogleMeet] = useState(false);
  const [lastScheduled, setLastScheduled] = useState<{
    summary: string;
    date: string;
    time: string;
    durationMinutes: number;
  } | null>(null);

  // Keep tomorrow synced if currentDate changes and user hasn't typed custom date
  React.useEffect(() => {
    setSelectedDate(tomorrowStr);
  }, [tomorrowStr]);

  // Microphone voice dictation
  const {
    isListening: isVoiceListening,
    error: voiceError,
    clearError: clearVoiceError,
    toggleListening: toggleVoiceListening,
    stopListening,
  } = useVoiceDictation({
    onTranscript: (text) => {
      if (text.trim()) {
        setTaskName(text.trim());
      }
    },
  });

  const formattedSelectedDate = useMemo(() => {
    return formatDateDayMonthYear(selectedDate);
  }, [selectedDate]);

  const isSelectedTomorrow = selectedDate === tomorrowStr;
  const isSelectedToday = selectedDate === currentDate || selectedDate === todayStr;

  const handleQuickTime = (time: string) => {
    setSelectedTime(time);
  };

  const handleQuickDate = (date: string) => {
    setSelectedDate(date);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!taskName.trim()) return;

    if (isVoiceListening) {
      stopListening();
    }

    const payload = {
      summary: taskName.trim(),
      date: selectedDate,
      time: selectedTime,
      durationMinutes,
      addGoogleMeet,
    };

    await onScheduleEvent(payload);

    setLastScheduled(payload);
    setTaskName('');
  };

  return (
    <div
      id="quick-task-scheduler-card"
      className="bg-linear-to-br from-indigo-50/70 via-white to-blue-50/70 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/30 rounded-2xl border border-indigo-200/80 dark:border-indigo-800/80 shadow-md p-4 sm:p-5 transition-all"
    >
      {/* Department Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-indigo-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <CalendarCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm tracking-tight">
                Schedule Task in Calendar
              </h3>
              <span className="text-[10px] font-semibold bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                Auto-Sync to Google Calendar
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Schedule for tomorrow or today — automatically puts it into your calendar agenda
            </p>
          </div>
        </div>

        {isSelectedTomorrow && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 self-start sm:self-center border border-indigo-200 dark:border-indigo-800">
            Scheduling for Tomorrow
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-3.5 space-y-3.5">
        {/* Task Name Input with Microphone */}
        <div>
          <label
            htmlFor="scheduler-task-input"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
          >
            What is the task or meeting?
          </label>
          <div className="relative flex items-center">
            <input
              id="scheduler-task-input"
              type="text"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder={
                isVoiceListening
                  ? 'Listening to your voice... Speak task name'
                  : 'e.g., Call accountant, Client sync, Review project roadmap...'
              }
              className="w-full pl-3.5 pr-11 py-2.5 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950/50 shadow-2xs transition-all"
            />
            <button
              type="button"
              onClick={toggleVoiceListening}
              className={`absolute right-2 p-1.5 rounded-lg transition-colors cursor-pointer ${
                isVoiceListening
                  ? 'bg-rose-600 text-white animate-pulse ring-2 ring-rose-400'
                  : 'text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title={isVoiceListening ? 'Stop voice recording' : 'Speak task name with microphone'}
            >
              {isVoiceListening ? (
                <Square className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Mic className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          {voiceError && (
            <div className="mt-1.5 px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-[11px] text-rose-700 dark:text-rose-300 flex items-center justify-between gap-2">
              <span>{voiceError}</span>
              <button
                type="button"
                onClick={clearVoiceError}
                className="font-semibold hover:underline cursor-pointer shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>

        {/* Date Selector Row */}
        <div>
          <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            When do you want to schedule it?
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickDate(tomorrowStr)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                selectedDate === tomorrowStr
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs ring-2 ring-indigo-200 dark:ring-indigo-900'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-750'
              }`}
            >
              ⭐ Tomorrow ({tomorrowStr.slice(5)})
            </button>

            <button
              type="button"
              onClick={() => handleQuickDate(currentDate)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                selectedDate === currentDate
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs ring-2 ring-indigo-200 dark:ring-indigo-900'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-750'
              }`}
            >
              Today ({currentDate.slice(5)})
            </button>

            <button
              type="button"
              onClick={() => handleQuickDate(dayAfterTomorrowStr)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer hidden sm:inline-flex ${
                selectedDate === dayAfterTomorrowStr
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs ring-2 ring-indigo-200 dark:ring-indigo-900'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-750'
              }`}
            >
              In 2 Days
            </button>

            {/* Custom Date Input */}
            <div className="relative flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs">
              <CalendarIcon className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
              <input
                id="scheduler-custom-date"
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) setSelectedDate(e.target.value);
                }}
                className="bg-transparent text-slate-700 dark:text-slate-200 text-xs focus:outline-hidden cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Time Selector Row */}
        <div>
          <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            What time?
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {(['10:00', '09:00', '11:00', '14:00', '16:00'] as string[]).map((timePreset) => {
              const displayTime =
                timePreset === '10:00'
                  ? '10:00 AM'
                  : timePreset === '09:00'
                  ? '09:00 AM'
                  : timePreset === '11:00'
                  ? '11:00 AM'
                  : timePreset === '14:00'
                  ? '02:00 PM'
                  : '04:00 PM';
              const isSelected = selectedTime === timePreset;
              return (
                <button
                  key={timePreset}
                  type="button"
                  onClick={() => handleQuickTime(timePreset)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-bold'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                  }`}
                >
                  {displayTime}
                </button>
              );
            })}

            {/* Custom Time Picker */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <input
                id="scheduler-custom-time"
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="bg-transparent text-slate-700 dark:text-slate-200 text-xs focus:outline-hidden cursor-pointer"
              />
            </div>

            {/* Duration Selector */}
            <select
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer"
            >
              <option value={15}>15 mins</option>
              <option value={30}>30 mins</option>
              <option value={45}>45 mins</option>
              <option value={60}>1 hour</option>
              <option value={90}>1.5 hours</option>
            </select>
          </div>
        </div>

        {/* Video / Google Meet check */}
        <div className="flex items-center justify-between text-xs pt-1">
          <label className="flex items-center gap-2 text-slate-600 dark:text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={addGoogleMeet}
              onChange={(e) => setAddGoogleMeet(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
            />
            <span className="flex items-center gap-1">
              <Video className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              Add Google Meet video link
            </span>
          </label>

          <span className="text-[11px] text-slate-400 font-mono">
            {formattedSelectedDate.formattedLong} @ {selectedTime}
          </span>
        </div>

        {/* Submit Button */}
        <div>
          <button
            id="btn-confirm-schedule-calendar"
            type="submit"
            disabled={!taskName.trim() || isScheduling}
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer ${
              taskName.trim() && !isScheduling
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 dark:shadow-none hover:scale-[1.01]'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isScheduling ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Adding to Google Calendar...</span>
              </>
            ) : (
              <>
                <CalendarCheck className="w-4 h-4" />
                <span>
                  Schedule in Calendar for{' '}
                  {isSelectedTomorrow ? 'Tomorrow' : isSelectedToday ? 'Today' : selectedDate} at{' '}
                  {selectedTime}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Instant Success Feedback Card */}
      {lastScheduled && (
        <div
          id="scheduler-success-feedback"
          className="mt-3.5 p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs animate-in fade-in"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <p className="font-bold text-emerald-900 dark:text-emerald-200">
                Scheduled on Google Calendar!
              </p>
              <p className="text-emerald-700 dark:text-emerald-300 text-[11px]">
                <strong>"{lastScheduled.summary}"</strong> for {lastScheduled.date} at{' '}
                {lastScheduled.time} ({lastScheduled.durationMinutes} min)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {onJumpToDate && lastScheduled.date !== currentDate && (
              <button
                type="button"
                onClick={() => onJumpToDate(lastScheduled.date)}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-[11px] shadow-2xs transition-colors cursor-pointer"
              >
                Go to {lastScheduled.date === tomorrowStr ? 'Tomorrow' : lastScheduled.date}
              </button>
            )}
            <button
              type="button"
              onClick={() => setLastScheduled(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
