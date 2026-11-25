import React, { useState, useMemo } from 'react';
import { DailyTaskItem, CalendarEventItem } from '../types';
import { formatDateDayMonthYear } from '../utils/dateTemplates';
import {
  CheckCircle2,
  Circle,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  Trash2,
  FileText,
  ArrowRight,
  Sparkles,
  CalendarPlus,
  Check,
  RotateCcw,
  ShieldCheck,
  CloudCheck,
  ChevronDown,
  ChevronUp,
  Mic,
  Square,
} from 'lucide-react';
import { useVoiceDictation } from '../hooks/useVoiceDictation';

interface DailyTasksPanelProps {
  currentDate: string; // YYYY-MM-DD
  tasks: DailyTaskItem[];
  onAddTask: (task: Omit<DailyTaskItem, 'id' | 'createdAt'>) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onScheduleInCalendar: (task: DailyTaskItem) => void;
  onInsertTaskIntoNote: (task: DailyTaskItem) => void;
  onCarryOverUnfinishedTasks?: () => void;
  unfinishedYesterdayCount?: number;
  isTodayBackedUp?: boolean;
  onOpenBackupModal?: () => void;
  calendarEvents: CalendarEventItem[];
}

export const DailyTasksPanel: React.FC<DailyTasksPanelProps> = ({
  currentDate,
  tasks,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onScheduleInCalendar,
  onInsertTaskIntoNote,
  onCarryOverUnfinishedTasks,
  unfinishedYesterdayCount = 0,
  isTodayBackedUp = false,
  onOpenBackupModal,
  calendarEvents,
}) => {
  const [taskInput, setTaskInput] = useState('');
  const [taskTime, setTaskTime] = useState('');
  const [isHighPriority, setIsHighPriority] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [isExpanded, setIsExpanded] = useState(true);

  const {
    isListening: isTaskVoiceListening,
    error: taskVoiceError,
    clearError: clearTaskVoiceError,
    toggleListening: toggleTaskVoiceListening,
  } = useVoiceDictation({
    onTranscript: (text) => {
      if (text.trim()) {
        setTaskInput(text.trim());
      }
    },
  });

  const dateInfo = useMemo(() => formatDateDayMonthYear(currentDate), [currentDate]);

  // Tasks for the current date
  const todayTasks = useMemo(() => {
    return tasks.filter((t) => t.date === currentDate);
  }, [tasks, currentDate]);

  const filteredTasks = useMemo(() => {
    return todayTasks.filter((t) => {
      if (filter === 'active') return !t.completed;
      if (filter === 'completed') return t.completed;
      return true;
    });
  }, [todayTasks, filter]);

  const completedCount = todayTasks.filter((t) => t.completed).length;
  const activeCount = todayTasks.filter((t) => !t.completed).length;

  const handleCreateTask = (e?: React.FormEvent, andScheduleInCalendar = false) => {
    if (e) e.preventDefault();
    if (!taskInput.trim()) return;

    const newTask: Omit<DailyTaskItem, 'id' | 'createdAt'> = {
      text: taskInput.trim(),
      completed: false,
      date: currentDate,
      time: taskTime.trim() || undefined,
      priority: isHighPriority ? 'high' : 'normal',
    };

    onAddTask(newTask);

    if (andScheduleInCalendar) {
      // Create temporary item for the schedule modal/handler
      onScheduleInCalendar({
        ...newTask,
        id: 'temp_' + Date.now(),
        createdAt: new Date().toISOString(),
      });
    }

    setTaskInput('');
    setTaskTime('');
    setIsHighPriority(false);
  };

  return (
    <div
      id="daily-tasks-panel"
      className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden transition-colors mb-6"
    >
      {/* Panel Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-linear-to-r from-slate-50/80 to-indigo-50/40 dark:from-slate-900/60 dark:to-indigo-950/20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shadow-indigo-200 dark:shadow-none">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                Daily Tasks &amp; What I Did
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-semibold">
                {completedCount}/{todayTasks.length} done
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {dateInfo.formattedLong}
              </span>{' '}
              • <span className="font-mono text-[11px]">{dateInfo.formattedNumeric}</span>
            </p>
          </div>
        </div>

        {/* Header Right: Synology Backup Badge & Collapse */}
        <div className="flex items-center gap-2">
          {onOpenBackupModal && (
            <button
              onClick={onOpenBackupModal}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-all cursor-pointer ${
                isTodayBackedUp
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80'
                  : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/80'
              }`}
              title="Synology-style Google Drive daily backup"
            >
              <CloudCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">Synology Backup:</span>
              <span>{isTodayBackedUp ? 'Backed Up' : 'Active'}</span>
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={isExpanded ? 'Collapse Tasks Panel' : 'Expand Tasks Panel'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Unfinished Yesterday Tasks Banner */}
          {unfinishedYesterdayCount > 0 && onCarryOverUnfinishedTasks && (
            <div className="px-4 py-2.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200/80 dark:border-amber-900/40 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  You have <strong>{unfinishedYesterdayCount}</strong> unfinished task
                  {unfinishedYesterdayCount === 1 ? '' : 's'} from yesterday.
                </span>
              </div>
              <button
                onClick={onCarryOverUnfinishedTasks}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-md font-semibold text-[11px] shadow-2xs transition-colors cursor-pointer"
              >
                Carry Over to Today
              </button>
            </div>
          )}

          {/* Quick Input Bar: "Input all the tasks or what I do daily" */}
          <form
            onSubmit={(e) => handleCreateTask(e, false)}
            className="p-4 bg-slate-50/50 dark:bg-slate-850/50 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2"
          >
            <div className="flex-1 min-w-[240px] relative">
              <input
                id="daily-task-input"
                type="text"
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                placeholder={
                  isTaskVoiceListening
                    ? 'Listening... Speak your task now'
                    : 'What task or activity are you doing today? (e.g., Morning standup, Send weekly report...)'
                }
                className="w-full pl-3.5 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:border-indigo-500 dark:focus:border-indigo-500 shadow-2xs"
              />
              <button
                type="button"
                onClick={toggleTaskVoiceListening}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isTaskVoiceListening
                    ? 'text-rose-600 bg-rose-100 dark:bg-rose-950/70 animate-pulse ring-2 ring-rose-400'
                    : 'text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title={isTaskVoiceListening ? 'Stop voice dictation' : 'Dictate task by voice'}
              >
                {isTaskVoiceListening ? (
                  <Square className="w-3.5 h-3.5 fill-current" />
                ) : (
                  <Mic className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {/* Optional Time Selector */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 shadow-2xs">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="time"
                value={taskTime}
                onChange={(e) => setTaskTime(e.target.value)}
                className="text-xs bg-transparent text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer"
                title="Optional scheduled time"
              />
            </div>

            {/* Priority Toggle */}
            <button
              type="button"
              onClick={() => setIsHighPriority(!isHighPriority)}
              className={`px-2.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                isHighPriority
                  ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900/50'
                  : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
              title="Toggle High Priority"
            >
              {isHighPriority ? '🔥 High' : 'Priority'}
            </button>

            {/* Add Task Button */}
            <button
              id="btn-add-daily-task"
              type="submit"
              disabled={!taskInput.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs shadow-indigo-200 dark:shadow-none transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Task</span>
            </button>

            {/* Schedule Directly to Calendar Button */}
            <button
              id="btn-add-and-calendar-task"
              type="button"
              onClick={() => handleCreateTask(undefined, true)}
              disabled={!taskInput.trim()}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs shadow-blue-200 dark:shadow-none transition-all cursor-pointer"
              title="Add task & schedule directly on Google Calendar"
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              <span>Make in Calendar</span>
            </button>
          </form>

          {taskVoiceError && (
            <div className="mx-4 mt-2.5 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between gap-2">
              <span>{taskVoiceError}</span>
              <button
                type="button"
                onClick={clearTaskVoiceError}
                className="font-semibold hover:underline cursor-pointer shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Filter Bar & Task Stats */}
          <div className="px-4 py-2 bg-slate-50/30 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  filter === 'all'
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold'
                    : 'hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                All ({todayTasks.length})
              </button>
              <button
                onClick={() => setFilter('active')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  filter === 'active'
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold'
                    : 'hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                To Do ({activeCount})
              </button>
              <button
                onClick={() => setFilter('completed')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  filter === 'completed'
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold'
                    : 'hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                What I Did ({completedCount})
              </button>
            </div>

            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              Synced with Note &amp; Google Drive
            </span>
          </div>

          {/* Tasks List */}
          <div className="p-3 sm:p-4 max-h-[300px] overflow-y-auto space-y-2">
            {filteredTasks.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                {filter === 'completed'
                  ? 'No tasks completed yet today. Check off tasks as you finish them!'
                  : todayTasks.length === 0
                  ? 'No daily tasks added yet today. Type a task above to plan your day!'
                  : 'All tasks completed for today! Great job! 🎉'}
              </div>
            ) : (
              filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className={`group flex items-center justify-between gap-3 p-3 rounded-2xl border transition-all ${
                    task.completed
                      ? 'bg-slate-50/70 dark:bg-slate-850/40 border-slate-200/60 dark:border-slate-800/60 text-slate-400 dark:text-slate-500'
                      : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => onToggleTask(task.id)}
                      className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer shrink-0"
                      title={task.completed ? 'Mark uncompleted' : 'Mark as done (What I did)'}
                    >
                      {task.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300 hover:text-indigo-500 dark:text-slate-600" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs sm:text-sm font-medium leading-snug break-words ${
                          task.completed
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-slate-800 dark:text-slate-100'
                        }`}
                      >
                        {task.text}
                      </p>

                      <div className="flex items-center gap-2 mt-0.5">
                        {task.time && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {task.time}
                          </span>
                        )}

                        {task.priority === 'high' && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                            High Priority
                          </span>
                        )}

                        {task.calendarEventId && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.2 rounded">
                            <CalendarIcon className="w-2.5 h-2.5" />
                            On Calendar
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Task Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Make in Calendar */}
                    <button
                      onClick={() => onScheduleInCalendar(task)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors cursor-pointer"
                      title="Make or schedule in Google Calendar"
                    >
                      <CalendarIcon className="w-3.5 h-3.5" />
                    </button>

                    {/* Insert into Note */}
                    <button
                      onClick={() => onInsertTaskIntoNote(task)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors cursor-pointer"
                      title="Insert into today's daily note"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Task */}
                    <button
                      onClick={() => onDeleteTask(task.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                      title="Delete task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};
