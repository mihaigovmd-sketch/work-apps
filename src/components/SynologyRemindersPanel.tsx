import React, { useState, useMemo } from 'react';
import { ReminderNote, ReminderColor, CalendarEventItem } from '../types';
import {
  Pin,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  FileText,
  Clock,
  Search,
  Check,
  AlertCircle,
  Share2,
  X,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface SynologyRemindersPanelProps {
  reminders: ReminderNote[];
  onAddReminder: (note: Omit<ReminderNote, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateReminder: (id: string, updates: Partial<ReminderNote>) => void;
  onDeleteReminder: (id: string) => void;
  onInsertIntoDailyNote: (reminder: ReminderNote) => void;
  onScheduleInCalendar: (reminder: ReminderNote) => void;
  isSyncing?: boolean;
}

const COLOR_CLASSES: Record<ReminderColor, {
  bg: string;
  border: string;
  header: string;
  text: string;
  badge: string;
  dot: string;
}> = {
  amber: {
    bg: 'bg-amber-50/90 hover:bg-amber-50 dark:bg-amber-950/30 dark:hover:bg-amber-950/40',
    border: 'border-amber-200/80 dark:border-amber-800/60',
    header: 'bg-amber-100/70 dark:bg-amber-900/50',
    text: 'text-amber-950 dark:text-amber-200',
    badge: 'bg-amber-200/70 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300',
    dot: 'bg-amber-500',
  },
  emerald: {
    bg: 'bg-emerald-50/90 hover:bg-emerald-50 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/40',
    border: 'border-emerald-200/80 dark:border-emerald-800/60',
    header: 'bg-emerald-100/70 dark:bg-emerald-900/50',
    text: 'text-emerald-950 dark:text-emerald-200',
    badge: 'bg-emerald-200/70 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
  sky: {
    bg: 'bg-sky-50/90 hover:bg-sky-50 dark:bg-sky-950/30 dark:hover:bg-sky-950/40',
    border: 'border-sky-200/80 dark:border-sky-800/60',
    header: 'bg-sky-100/70 dark:bg-sky-900/50',
    text: 'text-sky-950 dark:text-sky-200',
    badge: 'bg-sky-200/70 text-sky-800 dark:bg-sky-900/60 dark:text-sky-300',
    dot: 'bg-sky-500',
  },
  indigo: {
    bg: 'bg-indigo-50/90 hover:bg-indigo-50 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/40',
    border: 'border-indigo-200/80 dark:border-indigo-800/60',
    header: 'bg-indigo-100/70 dark:bg-indigo-900/50',
    text: 'text-indigo-950 dark:text-indigo-200',
    badge: 'bg-indigo-200/70 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300',
    dot: 'bg-indigo-500',
  },
  rose: {
    bg: 'bg-rose-50/90 hover:bg-rose-50 dark:bg-rose-950/30 dark:hover:bg-rose-950/40',
    border: 'border-rose-200/80 dark:border-rose-800/60',
    header: 'bg-rose-100/70 dark:bg-rose-900/50',
    text: 'text-rose-950 dark:text-rose-200',
    badge: 'bg-rose-200/70 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300',
    dot: 'bg-rose-500',
  },
  slate: {
    bg: 'bg-slate-50/90 hover:bg-slate-50 dark:bg-slate-850 dark:hover:bg-slate-800',
    border: 'border-slate-200/80 dark:border-slate-700',
    header: 'bg-slate-100/70 dark:bg-slate-800',
    text: 'text-slate-950 dark:text-slate-200',
    badge: 'bg-slate-200/70 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
    dot: 'bg-slate-500',
  },
};

const COLOR_NAMES: Record<ReminderColor, string> = {
  amber: 'Yellow Sticky',
  emerald: 'Sage Green',
  sky: 'Sky Blue',
  indigo: 'Soft Indigo',
  rose: 'Rose Coral',
  slate: 'Neutral Slate',
};

export const SynologyRemindersPanel: React.FC<SynologyRemindersPanelProps> = ({
  reminders,
  onAddReminder,
  onUpdateReminder,
  onDeleteReminder,
  onInsertIntoDailyNote,
  onScheduleInCalendar,
  isSyncing,
}) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'pinned' | 'completed'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // New reminder form state
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newColor, setNewColor] = useState<ReminderColor>('amber');
  const [newIsPinned, setNewIsPinned] = useState(false);
  const [newPriority, setNewPriority] = useState<'normal' | 'medium' | 'high'>('normal');

  // Filtered and sorted reminders (pinned first, then by date/updated)
  const filteredReminders = useMemo(() => {
    return reminders
      .filter((r) => {
        if (filter === 'active') return !r.isCompleted;
        if (filter === 'pinned') return r.isPinned && !r.isCompleted;
        if (filter === 'completed') return r.isCompleted;
        return true;
      })
      .filter((r) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return r.title.toLowerCase().includes(q) || r.content.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [reminders, filter, searchQuery]);

  const activeCount = reminders.filter((r) => !r.isCompleted).length;
  const pinnedCount = reminders.filter((r) => r.isPinned && !r.isCompleted).length;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    onAddReminder({
      title: newTitle.trim(),
      content: newContent.trim(),
      dueDate: newDueDate || undefined,
      color: newColor,
      isPinned: newIsPinned,
      isCompleted: false,
      priority: newPriority,
    });

    setNewTitle('');
    setNewContent('');
    setNewDueDate('');
    setNewColor('amber');
    setNewIsPinned(false);
    setNewPriority('normal');
    setIsCreating(false);
  };

  const getDueStatus = (dueDate?: string) => {
    if (!dueDate) return null;
    const now = new Date();
    const due = new Date(dueDate.includes('T') ? dueDate : `${dueDate}T23:59:59`);
    const isToday =
      now.getFullYear() === due.getFullYear() &&
      now.getMonth() === due.getMonth() &&
      now.getDate() === due.getDate();

    if (due < now && !isToday) {
      return { label: 'Overdue', color: 'text-rose-700 bg-rose-100 border-rose-200' };
    }
    if (isToday) {
      return { label: 'Due Today', color: 'text-amber-800 bg-amber-100 border-amber-200' };
    }
    return {
      label: due.toLocaleDateString([], { month: 'short', day: 'numeric' }),
      color: 'text-slate-700 bg-slate-100 border-slate-200',
    };
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col transition-colors">
      {/* Header Banner */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-linear-to-r from-amber-500/10 dark:from-amber-500/5 via-indigo-500/5 dark:via-indigo-500/5 to-transparent flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                  Quick Reminders &amp; Sticky Notes
                </h2>
                {isSyncing && (
                  <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-800">
                    Syncing...
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Persistent reminder shelf • Synced to Google Drive &amp; ready when you open
              </p>
            </div>
          </div>

          <button
            id="btn-new-reminder"
            onClick={() => setIsCreating(!isCreating)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-medium hover:bg-indigo-700 shadow-xs transition-colors cursor-pointer shrink-0"
          >
            {isCreating ? (
              <>
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>New Reminder</span>
              </>
            )}
          </button>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/80 p-1 rounded-xl text-xs font-medium self-start">
            <button
              onClick={() => setFilter('active')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                filter === 'active'
                  ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setFilter('pinned')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                filter === 'pinned'
                  ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-300 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Pin className="w-3 h-3 fill-current" />
              <span>Pinned ({pinnedCount})</span>
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                filter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              All ({reminders.length})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                filter === 'completed'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Done
            </button>
          </div>

          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search reminder notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* New Reminder Creation Card */}
      {isCreating && (
        <form onSubmit={handleCreate} className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border-b border-amber-200/70 dark:border-amber-800/40">
          <div className="bg-white dark:bg-slate-850 p-4 rounded-xl border border-amber-200 dark:border-slate-700 shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Add Reminder Note
              </span>
              <div className="flex items-center gap-1.5">
                {(['amber', 'emerald', 'sky', 'indigo', 'rose', 'slate'] as ReminderColor[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    title={COLOR_NAMES[c]}
                    onClick={() => setNewColor(c)}
                    className={`w-5 h-5 rounded-full ${COLOR_CLASSES[c].dot} transition-transform ${
                      newColor === c ? 'ring-2 ring-offset-2 ring-slate-700 dark:ring-slate-300 scale-110' : 'opacity-70 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
            </div>

            <input
              type="text"
              placeholder="Reminder Title (e.g. Follow up on server contract)..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              autoFocus
              className="text-sm font-medium px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500/20"
            />

            <textarea
              placeholder="Reminder details, checklist notes, links, or action items..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={2}
              className="text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500/20"
            />

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                  <CalendarIcon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="bg-transparent text-slate-700 dark:text-slate-300 text-xs focus:outline-hidden"
                  />
                </div>

                <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700">
                  <input
                    type="checkbox"
                    checked={newIsPinned}
                    onChange={(e) => setNewIsPinned(e.target.checked)}
                    className="w-3.5 h-3.5 text-amber-600 rounded"
                  />
                  <span>Pin to top</span>
                </label>

                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as any)}
                  className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-lg text-slate-700 dark:text-slate-300 text-xs focus:outline-hidden"
                >
                  <option value="normal">Normal priority</option>
                  <option value="medium">Medium priority</option>
                  <option value="high">Urgent priority</option>
                </select>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim()}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-medium shadow-xs cursor-pointer"
                >
                  Save Reminder
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Reminders List & Grid */}
      <div className="p-4 flex-1 overflow-y-auto max-h-[480px] 2xl:max-h-[620px]">
        {filteredReminders.length === 0 ? (
          <div className="py-12 px-4 text-center flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              {searchQuery ? 'No matching reminder notes found' : 'No reminder notes in this view'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
              {searchQuery
                ? 'Try clearing the search query or changing filters'
                : 'Create quick sticky notes and reminders that stay accessible whenever you open the app.'}
            </p>
            {!searchQuery && !isCreating && (
              <button
                onClick={() => setIsCreating(true)}
                className="mt-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create your first reminder</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-3">
            {filteredReminders.map((note) => {
              const colorStyle = COLOR_CLASSES[note.color] || COLOR_CLASSES.amber;
              const dueStatus = getDueStatus(note.dueDate);

              return (
                <div
                  key={note.id}
                  id={`reminder-${note.id}`}
                  className={`relative p-3.5 rounded-xl border ${colorStyle.border} ${colorStyle.bg} transition-all duration-150 flex flex-col justify-between gap-2.5 shadow-xs group`}
                >
                  {/* Note Header */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1">
                        <button
                          title={note.isCompleted ? 'Mark active' : 'Mark completed'}
                          onClick={() =>
                            onUpdateReminder(note.id, {
                              isCompleted: !note.isCompleted,
                              updatedAt: new Date().toISOString(),
                            })
                          }
                          className="mt-0.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer shrink-0"
                        >
                          {note.isCompleted ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Circle className="w-4 h-4 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" />
                          )}
                        </button>
                        <span
                          className={`text-xs font-semibold leading-snug break-words ${
                            note.isCompleted
                              ? 'line-through text-slate-500 dark:text-slate-500'
                              : colorStyle.text
                          }`}
                        >
                          {note.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {/* Pin Button */}
                        <button
                          title={note.isPinned ? 'Unpin' : 'Pin to top'}
                          onClick={() =>
                            onUpdateReminder(note.id, {
                              isPinned: !note.isPinned,
                              updatedAt: new Date().toISOString(),
                            })
                          }
                          className={`p-1 rounded-md transition-colors cursor-pointer ${
                            note.isPinned
                              ? 'text-amber-600 dark:text-amber-400 bg-amber-100/80 dark:bg-amber-950/80'
                              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                          }`}
                        >
                          <Pin
                            className={`w-3.5 h-3.5 ${
                              note.isPinned ? 'fill-current' : ''
                            }`}
                          />
                        </button>

                        {/* Delete Button */}
                        <button
                          title="Delete reminder note"
                          onClick={() => onDeleteReminder(note.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md transition-colors cursor-pointer opacity-80 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Note Content */}
                    {note.content && (
                      <p
                        className={`text-[12px] leading-relaxed mt-1.5 pl-6 whitespace-pre-wrap ${
                          note.isCompleted ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {note.content}
                      </p>
                    )}
                  </div>

                  {/* Note Footer with Due Date & Integration Actions */}
                  <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-1 text-[11px]">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {dueStatus && (
                        <span
                          className={`px-1.5 py-0.5 rounded-md border text-[10px] font-medium flex items-center gap-1 ${dueStatus.color}`}
                        >
                          <Clock className="w-3 h-3" />
                          {dueStatus.label}
                        </span>
                      )}
                      {note.priority === 'high' && (
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                          Urgent
                        </span>
                      )}
                    </div>

                    {/* Synergy Actions: Insert into Daily Note & Google Calendar */}
                    <div className="flex items-center gap-1">
                      <button
                        title="Add this reminder into Today's Daily Note"
                        onClick={() => onInsertIntoDailyNote(note)}
                        className="p-1 px-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-white/80 dark:hover:bg-slate-800/80 transition-colors flex items-center gap-1 font-medium cursor-pointer"
                      >
                        <FileText className="w-3 h-3" />
                        <span className="hidden sm:inline">To Note</span>
                      </button>

                      <button
                        title="Schedule this reminder in Google Calendar"
                        onClick={() => onScheduleInCalendar(note)}
                        className="p-1 px-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-white/80 dark:hover:bg-slate-800/80 transition-colors flex items-center gap-1 font-medium cursor-pointer"
                      >
                        <CalendarIcon className="w-3 h-3" />
                        <span className="hidden sm:inline">Calendar</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
