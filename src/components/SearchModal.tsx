import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  X,
  FileText,
  CheckSquare,
  Clock,
  Calendar as CalendarIcon,
  Mail,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Command,
} from 'lucide-react';
import {
  DriveNoteFile,
  DailyTaskItem,
  ReminderNote,
  CalendarEventItem,
  GmailNotificationItem,
} from '../types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate: string;
  currentNoteContent: string;
  driveFiles: DriveNoteFile[];
  dailyTasks: DailyTaskItem[];
  reminders: ReminderNote[];
  calendarEvents: CalendarEventItem[];
  notifications: GmailNotificationItem[];
  onSelectDate: (date: string) => void;
  onSelectNotification?: (item: GmailNotificationItem) => void;
  onSelectCalendarEvent?: (event: CalendarEventItem) => void;
}

type SearchCategory = 'all' | 'notes' | 'tasks' | 'reminders' | 'calendar' | 'gmail';

interface SearchResultItem {
  id: string;
  category: 'notes' | 'tasks' | 'reminders' | 'calendar' | 'gmail';
  title: string;
  subtitle: string;
  dateStr?: string;
  badge?: string;
  badgeColor?: string;
  onAction: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  currentDate,
  currentNoteContent,
  driveFiles,
  dailyTasks,
  reminders,
  calendarEvents,
  notifications,
  onSelectDate,
  onSelectNotification,
  onSelectCalendarEvent,
}) => {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SearchCategory>('all');
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setQuery('');
      setSelectedCategory('all');
    }
  }, [isOpen]);

  // Keyboard navigation & Esc key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Aggregate and filter results
  const results = useMemo<SearchResultItem[]>(() => {
    const q = query.trim().toLowerCase();
    const items: SearchResultItem[] = [];

    // 1. Current Note
    if (currentNoteContent) {
      const matchInNote = !q || currentNoteContent.toLowerCase().includes(q);
      if (matchInNote) {
        let snippet = currentNoteContent.slice(0, 140).replace(/\n/g, ' ');
        if (q) {
          const idx = currentNoteContent.toLowerCase().indexOf(q);
          if (idx !== -1) {
            const start = Math.max(0, idx - 40);
            const end = Math.min(currentNoteContent.length, idx + q.length + 60);
            snippet = (start > 0 ? '...' : '') + currentNoteContent.slice(start, end).replace(/\n/g, ' ') + (end < currentNoteContent.length ? '...' : '');
          }
        }
        items.push({
          id: `current-note-${currentDate}`,
          category: 'notes',
          title: `Today's Daily Note (${currentDate})`,
          subtitle: snippet || 'Active daily workspace note',
          dateStr: currentDate,
          badge: 'Active Note',
          badgeColor: 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300',
          onAction: () => {
            onSelectDate(currentDate);
            onClose();
          },
        });
      }
    }

    // 2. Drive Notes Archive
    driveFiles.forEach((file) => {
      if (file.dateKey === currentDate) return; // avoid duplicate
      const matchName = !q || file.name.toLowerCase().includes(q) || file.dateKey.includes(q);
      if (matchName) {
        items.push({
          id: `drive-note-${file.id}`,
          category: 'notes',
          title: file.name.replace('.txt', '').replace('.json', ''),
          subtitle: file.dayFolderName ? `Saved in folder: ${file.dayFolderName}` : 'Google Drive Daily Note',
          dateStr: file.dateKey,
          badge: 'Drive Note',
          badgeColor: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400',
          onAction: () => {
            onSelectDate(file.dateKey);
            onClose();
          },
        });
      }
    });

    // 3. Daily Tasks
    dailyTasks.forEach((task) => {
      const matchTask = !q || task.text.toLowerCase().includes(q);
      if (matchTask) {
        items.push({
          id: `task-${task.id}`,
          category: 'tasks',
          title: task.text,
          subtitle: `${task.completed ? 'Completed' : 'Pending'} • ${task.date}${task.time ? ` at ${task.time}` : ''}`,
          dateStr: task.date,
          badge: task.completed ? 'Completed' : task.priority === 'high' ? 'High Priority' : 'Daily Task',
          badgeColor: task.completed
            ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            : task.priority === 'high'
            ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300'
            : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300',
          onAction: () => {
            if (task.date) onSelectDate(task.date);
            onClose();
          },
        });
      }
    });

    // 4. Synology Reminders & Sticky Notes
    reminders.forEach((rem) => {
      const matchRem =
        !q ||
        rem.title.toLowerCase().includes(q) ||
        rem.content.toLowerCase().includes(q);
      if (matchRem) {
        items.push({
          id: `reminder-${rem.id}`,
          category: 'reminders',
          title: rem.title || 'Untitled Sticky Note',
          subtitle: rem.content.slice(0, 100) || 'Quick reminder note',
          dateStr: rem.dueDate || undefined,
          badge: rem.isPinned ? 'Pinned Reminder' : 'Reminder',
          badgeColor: 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300',
          onAction: () => {
            if (rem.dueDate) {
              const datePart = rem.dueDate.split('T')[0];
              onSelectDate(datePart);
            }
            onClose();
          },
        });
      }
    });

    // 5. Calendar Events
    calendarEvents.forEach((evt) => {
      const matchCal =
        !q ||
        evt.summary.toLowerCase().includes(q) ||
        (evt.description && evt.description.toLowerCase().includes(q));
      if (matchCal) {
        const timeStr = evt.start.dateTime
          ? new Date(evt.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : evt.start.date || '';
        items.push({
          id: `cal-${evt.id}`,
          category: 'calendar',
          title: evt.summary,
          subtitle: evt.description?.slice(0, 90) || `Calendar meeting at ${timeStr}`,
          dateStr: timeStr,
          badge: 'Calendar',
          badgeColor: 'bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300',
          onAction: () => {
            if (onSelectCalendarEvent) {
              onSelectCalendarEvent(evt);
            }
            onClose();
          },
        });
      }
    });

    // 6. Gmail Notifications
    notifications.forEach((notif) => {
      const matchGmail =
        !q ||
        notif.subject.toLowerCase().includes(q) ||
        notif.senderName.toLowerCase().includes(q) ||
        notif.snippet.toLowerCase().includes(q);
      if (matchGmail) {
        items.push({
          id: `gmail-${notif.id}`,
          category: 'gmail',
          title: notif.subject,
          subtitle: `${notif.senderName} • ${notif.snippet.slice(0, 80)}`,
          dateStr: notif.dateStr,
          badge: notif.isUnread ? 'Unread Gmail' : 'Gmail',
          badgeColor: notif.isUnread
            ? 'bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-300'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
          onAction: () => {
            if (onSelectNotification) {
              onSelectNotification(notif);
            }
            onClose();
          },
        });
      }
    });

    return items;
  }, [
    query,
    currentDate,
    currentNoteContent,
    driveFiles,
    dailyTasks,
    reminders,
    calendarEvents,
    notifications,
    onSelectDate,
    onSelectNotification,
    onSelectCalendarEvent,
    onClose,
  ]);

  const filteredResults = useMemo(() => {
    if (selectedCategory === 'all') return results;
    return results.filter((r) => r.category === selectedCategory);
  }, [results, selectedCategory]);

  if (!isOpen) return null;

  const categoryCounts = {
    all: results.length,
    notes: results.filter((r) => r.category === 'notes').length,
    tasks: results.filter((r) => r.category === 'tasks').length,
    reminders: results.filter((r) => r.category === 'reminders').length,
    calendar: results.filter((r) => r.category === 'calendar').length,
    gmail: results.filter((r) => r.category === 'gmail').length,
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'notes':
        return <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
      case 'tasks':
        return <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'reminders':
        return <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case 'calendar':
        return <CalendarIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'gmail':
        return <Mail className="w-4 h-4 text-red-600 dark:text-red-400" />;
      default:
        return <Search className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div
      id="search-modal-backdrop"
      className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 pt-16 sm:pt-24 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="search-modal-card"
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Header with Search Loupe */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
            <Search className="w-4 h-4" />
          </div>

          <input
            ref={inputRef}
            id="global-search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes, tasks, reminders, calendar, and Gmail notifications..."
            className="flex-1 bg-transparent border-none outline-hidden px-3 text-sm sm:text-base text-slate-900 dark:text-slate-100 placeholder-slate-400"
          />

          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md cursor-pointer mr-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center gap-1.5 shrink-0 pl-1 border-l border-slate-200 dark:border-slate-700">
            <span className="hidden sm:inline-flex items-center text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
              ESC
            </span>
            <button
              id="btn-close-search"
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Pills Bar */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-slate-100 dark:border-slate-800 overflow-x-auto text-xs bg-slate-50/30 dark:bg-slate-900/40">
          {(
            [
              { id: 'all', label: 'All Results' },
              { id: 'notes', label: 'Notes' },
              { id: 'tasks', label: 'Tasks' },
              { id: 'reminders', label: 'Reminders' },
              { id: 'calendar', label: 'Calendar' },
              { id: 'gmail', label: 'Gmail' },
            ] as Array<{ id: SearchCategory; label: string }>
          ).map((cat) => {
            const count = categoryCounts[cat.id];
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1 py-0.2 rounded-full ${
                    isActive
                      ? 'bg-indigo-700 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-3 divide-y divide-slate-100 dark:divide-slate-800/80">
          {filteredResults.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {query ? `No matches for "${query}"` : 'Type anything to start searching'}
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Search across all your daily notes, tasks, sticky reminders, calendar meetings, and scanned Gmail notifications.
              </p>
            </div>
          ) : (
            filteredResults.map((item) => (
              <div
                key={item.id}
                onClick={item.onAction}
                className="group flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    {getCategoryIcon(item.category)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {item.title}
                      </h4>
                      {item.badge && (
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.2 rounded shrink-0 ${
                            item.badgeColor || 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {item.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.dateStr && (
                    <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                      {item.dateStr}
                    </span>
                  )}
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {filteredResults.length} result{filteredResults.length === 1 ? '' : 's'}
            </span>
            <span>•</span>
            <span className="hidden sm:inline">Click any item to open or jump to date</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline">Press</span>
            <kbd className="font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1 py-0.2 rounded text-[10px]">
              ESC
            </kbd>
            <span className="hidden sm:inline">to close</span>
          </div>
        </div>
      </div>
    </div>
  );
};
