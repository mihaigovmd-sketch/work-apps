import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  LogOut,
  FolderOpen,
  Cloud,
  CloudCheck,
  RefreshCw,
  Clock,
  CheckSquare,
  Link as LinkIcon,
  Server,
  Download,
  Sun,
  Moon,
  Monitor,
  Sparkles,
  Bell,
  Volume2,
  VolumeX,
  Mail,
  Search,
} from 'lucide-react';
import { GoogleUser, ScreenResolution } from '../types';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Theme } from '../hooks/useTheme';
import { ResolutionSelector } from './ResolutionSelector';
import { NotificationSoundType } from '../services/soundEngine';
import { formatDateDayMonthYear } from '../utils/dateTemplates';

interface NavbarProps {
  user: GoogleUser;
  currentDate: string; // YYYY-MM-DD
  onDateChange: (date: string) => void;
  onOpenArchive: () => void;
  onOpenShortcuts: () => void;
  onOpenSelfHost: () => void;
  onOpenBackup: () => void;
  onOpenNotebookLM?: () => void;
  isTodayBackedUp?: boolean;
  onToggleTasks?: () => void;
  isTasksOpen?: boolean;
  tasksCount?: number;
  onToggleReminders: () => void;
  isRemindersOpen: boolean;
  remindersCount: number;
  onToggleNotifications?: () => void;
  isNotificationsOpen?: boolean;
  notificationsCount?: number;
  isScanningNotifications?: boolean;
  onOpenSearch?: () => void;
  onSignOut: () => void;
  isSavingNote?: boolean;
  notesCount?: number;
  theme?: Theme;
  onToggleTheme?: () => void;
  resolution?: ScreenResolution;
  onSelectResolution?: (res: ScreenResolution) => void;
  maxWidthClass?: string;
  onOpenSoundSettings?: () => void;
  soundType?: NotificationSoundType;
  soundVolume?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  currentDate,
  onDateChange,
  onOpenArchive,
  onOpenShortcuts,
  onOpenSelfHost,
  onOpenBackup,
  onOpenNotebookLM,
  isTodayBackedUp,
  onToggleTasks,
  isTasksOpen,
  tasksCount,
  onToggleReminders,
  isRemindersOpen,
  remindersCount,
  onToggleNotifications,
  isNotificationsOpen,
  notificationsCount,
  isScanningNotifications,
  onOpenSearch,
  onSignOut,
  isSavingNote,
  notesCount,
  theme = 'system',
  onToggleTheme,
  resolution = 'fhd',
  onSelectResolution,
  maxWidthClass = 'max-w-[1920px]',
  onOpenSoundSettings,
  soundType = 'chime',
  soundVolume = 0.5,
}) => {
  const { isInstallable, install } = usePWAInstall();

  // Format current date display strictly in Day, Month, Year
  const dateInfo = formatDateDayMonthYear(currentDate);
  const formattedDate = dateInfo.formattedLong;
  const formattedNumeric = dateInfo.formattedNumeric;

  const isToday = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    return currentDate === todayStr;
  };

  const handleStepDay = (delta: number) => {
    const d = new Date(`${currentDate}T12:00:00`);
    d.setDate(d.getDate() + delta);
    onDateChange(d.toISOString().split('T')[0]);
  };

  const handleJumpToToday = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    onDateChange(todayStr);
  };

  return (
    <header
      id="main-navbar"
      className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 lg:px-8 py-2.5 transition-colors"
    >
      <div className={`${maxWidthClass} mx-auto flex flex-col md:flex-row items-center justify-between gap-3 transition-all duration-300`}>
        {/* Left: Brand / Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-slate-100 text-base">Daily Notes &amp; Calendar</span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/80">
                <CloudCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                Drive Synced
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
              Synology-style quick reminders • Drive notes • Calendar agenda
            </p>
          </div>
        </div>

        {/* Center: Date Navigator */}
        <div
          id="date-navigator-container"
          className="flex items-center bg-slate-100/90 dark:bg-slate-800/90 rounded-2xl p-1 border border-slate-200/80 dark:border-slate-700/80 shadow-xs"
        >
          <button
            id="nav-prev-day-btn"
            title="Previous Day"
            onClick={() => handleStepDay(-1)}
            className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-all cursor-pointer shadow-none hover:shadow-xs"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            id="nav-today-btn"
            onClick={handleJumpToToday}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              isToday()
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400'
            }`}
          >
            Today
          </button>

          <div className="relative flex items-center px-2">
            <div
              id="current-date-label"
              className="flex items-center gap-1.5 select-none cursor-pointer"
              onClick={() => {
                const input = document.getElementById('hidden-date-picker') as HTMLInputElement;
                input?.showPicker?.();
              }}
            >
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 tracking-tight">
                {formattedDate}
              </span>
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 font-mono font-medium hidden sm:inline">
                {formattedNumeric}
              </span>
            </div>
            <input
              id="hidden-date-picker"
              type="date"
              value={currentDate}
              onChange={(e) => {
                if (e.target.value) onDateChange(e.target.value);
              }}
              className="absolute inset-0 opacity-0 cursor-pointer"
              title="Click to select specific date"
            />
          </div>

          <button
            id="nav-next-day-btn"
            title="Next Day"
            onClick={() => handleStepDay(1)}
            className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-all cursor-pointer shadow-none hover:shadow-xs"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Actions & Profile */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Theme Toggle Button */}
          {onToggleTheme && (
            <button
              id="btn-theme-toggle"
              onClick={onToggleTheme}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl transition-all shadow-xs cursor-pointer"
              title={`Current theme: ${theme}. Click to switch (Light, Dark, System)`}
            >
              {theme === 'dark' ? (
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
              ) : theme === 'light' ? (
                <Sun className="w-3.5 h-3.5 text-amber-500" />
              ) : (
                <Monitor className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              )}
              <span className="capitalize text-[11px] hidden sm:inline">{theme}</span>
            </button>
          )}

          {/* Screen Resolution Selector (Full HD / 4K / Fluid / Standard) */}
          {onSelectResolution && (
            <ResolutionSelector
              currentResolution={resolution}
              onSelectResolution={onSelectResolution}
            />
          )}

          {/* Office Notification Sounds Button */}
          {onOpenSoundSettings && (
            <button
              id="btn-sound-settings"
              type="button"
              onClick={onOpenSoundSettings}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl transition-all shadow-xs cursor-pointer"
              title={
                soundType === 'silent' || soundVolume === 0
                  ? 'Notification Sound: Muted (Click to choose tone or volume)'
                  : `Notification Sounds: Active (Click to choose office chimes & beeps)`
              }
            >
              {soundType === 'silent' || soundVolume === 0 ? (
                <VolumeX className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <Bell className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              )}
              <span className="hidden sm:inline text-[11px] font-medium">
                {soundType === 'silent' || soundVolume === 0 ? 'Muted' : 'Sound'}
              </span>
            </button>
          )}

          {/* Daily Tasks Shelf Toggle Button */}
          {onToggleTasks && (
            <button
              id="btn-toggle-tasks"
              onClick={onToggleTasks}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-xl transition-all border cursor-pointer ${
                isTasksOpen
                  ? 'bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700/80 font-semibold shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700'
              }`}
              title="Synology-style Daily Tasks & What I do daily"
            >
              <CheckSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">Daily Tasks</span>
              {tasksCount !== undefined && tasksCount > 0 && (
                <span className="bg-emerald-600 text-white font-bold px-1.5 py-0.2 rounded-full text-[10px]">
                  {tasksCount}
                </span>
              )}
            </button>
          )}

          {/* Reminders Shelf Toggle Button */}
          <button
            id="btn-toggle-reminders"
            onClick={onToggleReminders}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-xl transition-all border cursor-pointer ${
              isRemindersOpen
                ? 'bg-amber-100/80 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700/80 font-semibold shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700'
            }`}
            title="Synology-style Quick Reminders & Sticky Notes"
          >
            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="hidden sm:inline">Reminders</span>
            {remindersCount > 0 && (
              <span className="bg-amber-500 text-white font-bold px-1.5 py-0.2 rounded-full text-[10px]">
                {remindersCount}
              </span>
            )}
          </button>

          {/* Gmail & Notifications Channel Toggle Button */}
          {onToggleNotifications && (
            <button
              id="btn-toggle-notifications"
              onClick={onToggleNotifications}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-xl transition-all border cursor-pointer ${
                isNotificationsOpen
                  ? 'bg-red-100/80 dark:bg-red-950/60 text-red-900 dark:text-red-200 border-red-300 dark:border-red-700/80 font-semibold shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700'
              }`}
              title="Gmail & Workspace Notifications Channel (Auto-scan & display)"
            >
              <Mail className={`w-3.5 h-3.5 ${isScanningNotifications ? 'animate-bounce text-red-500' : 'text-red-600 dark:text-red-400'}`} />
              <span className="hidden sm:inline">Gmail Channel</span>
              {notificationsCount !== undefined && notificationsCount > 0 ? (
                <span className="bg-red-600 text-white font-bold px-1.5 py-0.2 rounded-full text-[10px] animate-pulse">
                  {notificationsCount}
                </span>
              ) : null}
            </button>
          )}

          {/* Daily Backup Button */}
          <button
            id="btn-open-backup"
            onClick={onOpenBackup}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-xl transition-all border shadow-xs cursor-pointer ${
              isTodayBackedUp
                ? 'bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-300 border-slate-200 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-emerald-800'
                : 'bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 font-semibold'
            }`}
            title="Google Drive Daily Backup & Snapshots"
          >
            {isTodayBackedUp ? (
              <CloudCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Cloud className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
            )}
            <span className="hidden sm:inline">Synology Backup</span>
            {isTodayBackedUp && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            )}
          </button>

          {/* Drive Notes archive button */}
          <button
            id="open-drive-archive-btn"
            onClick={onOpenArchive}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-all shadow-xs hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer"
            title="Browse all daily notes saved in Google Drive"
          >
            <FolderOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden md:inline">Drive Archive</span>
            {notesCount !== undefined && notesCount > 0 && (
              <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold px-1.5 py-0.2 rounded-full text-[10px]">
                {notesCount}
              </span>
            )}
          </button>

          {/* Google NotebookLM connection button */}
          {onOpenNotebookLM && (
            <button
              id="btn-open-notebooklm"
              onClick={onOpenNotebookLM}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-linear-to-r from-violet-50 to-indigo-50 dark:from-violet-950/50 dark:to-indigo-950/50 text-violet-700 dark:text-violet-300 hover:from-violet-100 hover:to-indigo-100 dark:hover:from-violet-900/60 dark:hover:to-indigo-900/60 border border-violet-200 dark:border-violet-800/80 rounded-xl transition-all shadow-xs cursor-pointer"
              title="Google NotebookLM Connection: AI Summaries, Podcasts & Q&A"
            >
              <Sparkles className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
              <span className="hidden sm:inline font-semibold">NotebookLM</span>
              <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-violet-200/80 dark:bg-violet-900 text-violet-800 dark:text-violet-200">
                AI
              </span>
            </button>
          )}

          {/* Direct Link & Shortcuts modal button */}
          <button
            id="btn-open-shortcuts"
            onClick={onOpenShortcuts}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-700 dark:hover:text-indigo-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800 rounded-xl transition-all shadow-xs cursor-pointer"
            title="Direct Access URL, Desktop & Home Screen Shortcuts"
          >
            <LinkIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden md:inline">Shortcuts</span>
          </button>

          {/* Self-Host Guide & Export Modal button */}
          <button
            id="btn-open-selfhost"
            onClick={onOpenSelfHost}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700 dark:hover:text-emerald-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-emerald-800 rounded-xl transition-all shadow-xs cursor-pointer"
            title="Synology NAS, Docker & Self-Hosting Guide"
          >
            <Server className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden lg:inline">Self-Host</span>
          </button>

          {/* In-app install button if available */}
          {isInstallable && (
            <button
              onClick={install}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              title="Install app onto your computer or phone"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Install</span>
            </button>
          )}

          {/* Sync indicator */}
          {isSavingNote && (
            <div className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-medium px-2 py-1 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span className="hidden xl:inline text-[11px]">Saving...</span>
            </div>
          )}

          {/* Search Loupe Button (Right-up corner) */}
          {onOpenSearch && (
            <button
              id="btn-open-search"
              type="button"
              onClick={onOpenSearch}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 rounded-xl transition-all shadow-xs cursor-pointer group"
              title="Search everything: notes, tasks, reminders, calendar & notifications (⌘K or /)"
            >
              <Search className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
              <span className="hidden sm:inline text-[11px] font-medium">Search</span>
              <kbd className="hidden md:inline-flex items-center text-[9px] font-mono font-semibold px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600">
                ⌘K
              </kbd>
            </button>
          )}

          {/* User profile pill */}
          <div className="flex items-center gap-2 pl-1 border-l border-slate-200 dark:border-slate-800">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-7 h-7 rounded-full border border-slate-200 dark:border-slate-700 shadow-xs"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-750 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center justify-center">
                {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
              </div>
            )}

            <button
              id="signout-button"
              onClick={onSignOut}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

