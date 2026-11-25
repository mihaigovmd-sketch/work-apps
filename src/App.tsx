import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
} from './services/auth';
import {
  fetchDailyNoteFromDrive,
  saveDailyNoteToDrive,
  listAllDriveDailyNotes,
  deleteDailyNoteFromDrive,
  fetchRemindersFromDrive,
  saveRemindersToDrive,
  fetchDailyTasksFromDrive,
  saveDailyTasksToDrive,
  saveDailyBackupToDrive,
  listDriveBackups,
  getBackupsFolderInfo,
  fetchBackupContentFromDrive,
  deleteDriveBackup,
  saveUnifiedDailyRecordToDrive,
  fetchUnifiedDailyRecordFromDrive,
  getOrCreateDayFolder,
} from './services/drive';
import {
  fetchCalendarEvents,
  createCalendarEvent,
  deleteCalendarEvent,
  NewEventPayload,
} from './services/calendar';
import {
  GoogleUser,
  DriveNoteFile,
  CalendarEventItem,
  ConfirmDialogState,
  ReminderNote,
  DailyTaskItem,
  DriveBackupFile,
  BackupPayload,
  DayFolderInfo,
  GmailNotificationItem,
  GmailScanFilter,
} from './types';
import {
  fetchGmailNotifications,
  markGmailAsRead,
  getOfflineSampleNotifications,
} from './services/gmail';
import { Navbar } from './components/Navbar';
import { NotesEditor } from './components/NotesEditor';
import { CalendarPanel } from './components/CalendarPanel';
import { LoginView } from './components/LoginView';
import { NewEventModal } from './components/NewEventModal';
import { NotesHistoryModal } from './components/NotesHistoryModal';
import { ConfirmModal } from './components/ConfirmModal';
import { SynologyRemindersPanel } from './components/SynologyRemindersPanel';
import { DailyTasksPanel } from './components/DailyTasksPanel';
import { GmailNotificationsPanel } from './components/GmailNotificationsPanel';
import { GmailNotificationDetailModal } from './components/GmailNotificationDetailModal';
import {
  GmailMeetingsModal,
  AttachMeetingItemPayload,
} from './components/GmailMeetingsModal';
import { SearchModal } from './components/SearchModal';
import { ShortcutModal } from './components/ShortcutModal';
import { SelfHostModal } from './components/SelfHostModal';
import { DailyBackupModal } from './components/DailyBackupModal';
import { NotebookLMModal } from './components/NotebookLMModal';
import { createFreshMorningNoteContent, formatDateDayMonthYear } from './utils/dateTemplates';
import { FileText, Calendar as CalendarIcon, CalendarCheck, CheckCircle2, Clock, Mail, X } from 'lucide-react';
import { useTheme } from './hooks/useTheme';
import { useResolution } from './hooks/useResolution';
import { useSoundSettings } from './hooks/useSoundSettings';
import { SoundSettingsModal } from './components/SoundSettingsModal';

const getInitialDateStr = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const { resolution, setResolution, maxWidthClass } = useResolution();
  const {
    settings: soundSettings,
    updateSettings: updateSoundSettings,
    previewSound,
    notifyNoteSaved,
    notifyReminderAction,
    notifyCalendarScheduled,
    soundOptions,
  } = useSoundSettings();

  // Auth state
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isGuestMode, setIsGuestMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('daily_notes_guest_mode') === 'true';
    } catch {
      return false;
    }
  });

  // Active date (YYYY-MM-DD)
  const [currentDate, setCurrentDate] = useState<string>(getInitialDateStr());

  // Mobile active tab ('notes' | 'tasks' | 'reminders' | 'calendar' | 'notifications')
  const [mobileTab, setMobileTab] = useState<'notes' | 'tasks' | 'reminders' | 'calendar' | 'notifications'>('notes');

  // Gmail & Notifications Channel state (Auto-scan, auto-display, alerts)
  const [notifications, setNotifications] = useState<GmailNotificationItem[]>(() => {
    try {
      const cached = localStorage.getItem('daily_notes_gmail_cache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [isNotificationsPanelOpen, setIsNotificationsPanelOpen] = useState(false);
  const [isScanningGmail, setIsScanningGmail] = useState(false);
  const [lastGmailScanTime, setLastGmailScanTime] = useState<Date | null>(null);
  const [selectedNotification, setSelectedNotification] = useState<GmailNotificationItem | null>(null);
  const [isNotificationDetailOpen, setIsNotificationDetailOpen] = useState(false);
  const [autoOpenScanned, setAutoOpenScanned] = useState<boolean>(() => {
    try {
      return localStorage.getItem('daily_notes_auto_open_gmail') !== 'false';
    } catch {
      return true;
    }
  });
  const [attachedMeetingsMap, setAttachedMeetingsMap] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('daily_notes_attached_gmail_meetings');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [isMeetingsChooserOpen, setIsMeetingsChooserOpen] = useState(false);
  const [isAttachingMeetings, setIsAttachingMeetings] = useState(false);
  const [isMeetingsPromptDismissed, setIsMeetingsPromptDismissed] = useState(false);

  // Daily Tasks state ("What I do daily", "Make them in calendar", Synology-style persistent tasks)
  const [dailyTasks, setDailyTasks] = useState<DailyTaskItem[]>(() => {
    try {
      const cached = localStorage.getItem('daily_notes_tasks_cache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [dailyTasksFileId, setDailyTasksFileId] = useState<string | undefined>(undefined);
  const [isTasksPanelOpen, setIsTasksPanelOpen] = useState(false);
  const [isSyncingTasks, setIsSyncingTasks] = useState(false);
  const tasksSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoBackupDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Notes state
  const [noteContent, setNoteContent] = useState('');
  const [noteDriveFileId, setNoteDriveFileId] = useState<string | undefined>(undefined);
  const [noteWebViewLink, setNoteWebViewLink] = useState<string | undefined>(undefined);
  const [currentDayFolder, setCurrentDayFolder] = useState<DayFolderInfo | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isLoadingNote, setIsLoadingNote] = useState(false);

  // Synology-style Quick Reminders state (cached locally & synced with Drive)
  const [reminders, setReminders] = useState<ReminderNote[]>(() => {
    try {
      const cached = localStorage.getItem('daily_notes_reminders_cache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [remindersFileId, setRemindersFileId] = useState<string | undefined>(undefined);
  const [isRemindersOpen, setIsRemindersOpen] = useState(false);
  const [isSyncingReminders, setIsSyncingReminders] = useState(false);

  // Drive archive
  const [driveFiles, setDriveFiles] = useState<DriveNoteFile[]>([]);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [isLoadingArchive, setIsLoadingArchive] = useState(false);

  // Calendar events state
  const [dayEvents, setDayEvents] = useState<CalendarEventItem[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEventItem[]>([]);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [isNewEventModalOpen, setIsNewEventModalOpen] = useState(false);
  const [calendarInitialData, setCalendarInitialData] = useState<
    | {
        summary?: string;
        date?: string;
        startTime?: string;
        endTime?: string;
        location?: string;
        attendeesEmails?: string[];
        description?: string;
        addGoogleMeet?: boolean;
        gmailMessageId?: string;
      }
    | undefined
  >(undefined);

  // Shortcuts & Self-Host & NotebookLM & Search modals
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isShortcutModalOpen, setIsShortcutModalOpen] = useState(false);
  const [isSelfHostModalOpen, setIsSelfHostModalOpen] = useState(false);
  const [isNotebookLMModalOpen, setIsNotebookLMModalOpen] = useState(false);
  const [isSoundModalOpen, setIsSoundModalOpen] = useState(false);

  // Google Drive Backups state
  const [backups, setBackups] = useState<DriveBackupFile[]>([]);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(() => {
    return localStorage.getItem('daily_notes_last_backup_time');
  });
  const [autoBackupEnabled, setAutoBackupEnabled] = useState<boolean>(() => {
    return localStorage.getItem('daily_notes_auto_backup_enabled') !== 'false';
  });
  const [backupsFolderLink, setBackupsFolderLink] = useState<string | undefined>(undefined);
  const [todayBackupDayFolder, setTodayBackupDayFolder] = useState<DayFolderInfo | null>(null);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Destructive operations confirm modal
  const [confirmModal, setConfirmModal] = useState<ConfirmDialogState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remindersSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3500);
  };

  // 1. Initialize Auth on Mount with safety fallback timeout
  useEffect(() => {
    // Safety fallback: ensure initial loading screen never hangs if Firebase or network is sluggish
    const safetyTimer = setTimeout(() => {
      setIsAuthChecking((checking) => {
        if (checking) {
          console.info('Initial auth check timed out after 2s, unlocking UI.');
          return false;
        }
        return false;
      });
    }, 2000);

    let unsubscribe: () => void = () => {};
    try {
      unsubscribe = initAuth(
        (currentUser, accessToken) => {
          clearTimeout(safetyTimer);
          setUser(currentUser);
          setToken(accessToken);
          setIsGuestMode(false);
          setIsAuthChecking(false);
        },
        () => {
          clearTimeout(safetyTimer);
          // Check if previously opted for offline / guest mode
          const wasGuest = (() => {
            try {
              return localStorage.getItem('daily_notes_guest_mode') === 'true';
            } catch {
              return false;
            }
          })();

          if (wasGuest) {
            setUser({
              uid: 'local-workspace',
              displayName: 'Local Workspace',
              email: 'offline@local.device',
              photoURL: null,
            });
            setToken(null);
            setIsGuestMode(true);
          } else {
            setUser(null);
            setToken(null);
          }
          setIsAuthChecking(false);
        }
      );
    } catch (err) {
      console.error('Auth initialization error:', err);
      clearTimeout(safetyTimer);
      setIsAuthChecking(false);
    }

    return () => {
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, []);

  const handleSignIn = async () => {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        setIsGuestMode(false);
        try {
          localStorage.removeItem('daily_notes_guest_mode');
        } catch {}
        showToast('Signed in successfully with Google Workspace');
      }
    } catch (err: any) {
      console.error('Sign-in failed:', err);
      const rawMsg = err.message || '';
      let friendlyMsg = 'Google sign-in was interrupted. Please try again.';
      if (rawMsg.includes('popup') || rawMsg.includes('blocked') || rawMsg.includes('closed')) {
        friendlyMsg = 'The Google sign-in window was closed or blocked by browser popup protection. Please allow popups for this site, or continue in Offline / Local Mode below.';
      } else if (rawMsg.includes('internal-error') || rawMsg.includes('network-request-failed')) {
        friendlyMsg = 'Google authentication encountered a script or connection restriction (often caused by strict ad-blockers or privacy extensions blocking third-party scripts). You can allow Google scripts or continue in Offline / Local Mode below.';
      } else if (rawMsg) {
        friendlyMsg = `Authentication notice: ${rawMsg}`;
      }
      setLoginError(friendlyMsg);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleContinueGuest = () => {
    setIsGuestMode(true);
    try {
      localStorage.setItem('daily_notes_guest_mode', 'true');
    } catch {}
    setUser({
      uid: 'local-workspace',
      displayName: 'Local Workspace',
      email: 'offline@local.device',
      photoURL: null,
    });
    setToken(null);
    setLoginError(null);
    showToast('Switched to Offline / Local Mode');
  };

  const handleSignOut = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setIsGuestMode(false);
    try {
      localStorage.removeItem('daily_notes_guest_mode');
    } catch {}
    setNoteContent('');
    setNoteDriveFileId(undefined);
    setDriveFiles([]);
    setDayEvents([]);
    setUpcomingEvents([]);
    showToast('Signed out of Google account');
  };

  // 2. Load Note from Drive or Local Storage for Current Date
  const loadNoteForDate = useCallback(
    async (dateKey: string, activeToken: string | null) => {
      setIsLoadingNote(true);
      try {
        if (!activeToken) {
          // Local storage note loading
          const localSaved = localStorage.getItem(`daily_notes_local_${dateKey}`);
          if (localSaved && localSaved.trim().length > 0) {
            setNoteContent(localSaved);
            setIsDirty(false);
          } else {
            const freshTemplate = createFreshMorningNoteContent(dateKey);
            setNoteContent(freshTemplate);
            setIsDirty(false);
          }
          setNoteDriveFileId(undefined);
          setNoteWebViewLink(undefined);
          setLastSavedAt(null);
          return;
        }

        const result = await fetchUnifiedDailyRecordFromDrive(activeToken, dateKey);
        if (result && result.content && result.content.trim().length > 0) {
          setNoteContent(result.content);
          setNoteDriveFileId(result.fileId);
          setNoteWebViewLink(result.webViewLink);
          setLastSavedAt(new Date(result.modifiedTime));
          setCurrentDayFolder({
            folderId: result.dayFolderId,
            folderName: result.dayFolderName,
            webViewLink: result.folderWebViewLink,
          });
          if (result.tasks && result.tasks.length > 0) {
            setDailyTasks((prev) => {
              const otherDays = prev.filter((t) => t.date && t.date !== dateKey);
              return [...result.tasks!, ...otherDays];
            });
          }
          setIsDirty(false);
        } else {
          // Automatically start fresh morning note with today's date formatted in Day, Month, Year
          const freshTemplate = createFreshMorningNoteContent(dateKey);
          setNoteContent(freshTemplate);
          setNoteDriveFileId(undefined);
          setNoteWebViewLink(undefined);
          setLastSavedAt(null);
          setIsDirty(true);
          // Pre-fetch day folder info
          getOrCreateDayFolder(activeToken, dateKey)
            .then((df) => setCurrentDayFolder(df))
            .catch(() => {});
        }
      } catch (err) {
        console.error('Failed to load note from Drive:', err);
      } finally {
        setIsLoadingNote(false);
      }
    },
    []
  );

  // 3. Load Drive Archive
  const loadDriveArchive = useCallback(async (activeToken: string) => {
    setIsLoadingArchive(true);
    try {
      const files = await listAllDriveDailyNotes(activeToken);
      setDriveFiles(files);
    } catch (err) {
      console.error('Failed to load Drive archive:', err);
    } finally {
      setIsLoadingArchive(false);
    }
  }, []);

  // 4. Load Calendar Events for Current Date + Next 7 Days
  const loadCalendarEvents = useCallback(
    async (dateKey: string, activeToken: string) => {
      setIsLoadingCalendar(true);
      try {
        // Start of selected day
        const dayStart = new Date(`${dateKey}T00:00:00`);
        const dayEnd = new Date(`${dateKey}T23:59:59.999`);

        // Next 7 days
        const weekEnd = new Date(dayStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        const [currentDayResults, weekResults] = await Promise.all([
          fetchCalendarEvents(activeToken, dayStart.toISOString(), dayEnd.toISOString()),
          fetchCalendarEvents(activeToken, dayStart.toISOString(), weekEnd.toISOString()),
        ]);

        setDayEvents(currentDayResults);
        setUpcomingEvents(weekResults);
      } catch (err) {
        console.error('Failed to load Calendar events:', err);
      } finally {
        setIsLoadingCalendar(false);
      }
    },
    []
  );

  // 5. Load Reminders from Drive
  const loadReminders = useCallback(async (activeToken: string) => {
    setIsSyncingReminders(true);
    try {
      const driveResult = await fetchRemindersFromDrive(activeToken);
      if (driveResult && driveResult.reminders) {
        setReminders(driveResult.reminders);
        setRemindersFileId(driveResult.fileId);
        localStorage.setItem('daily_notes_reminders_cache', JSON.stringify(driveResult.reminders));
      }
    } catch (err) {
      console.error('Failed to load reminders from Drive:', err);
    } finally {
      setIsSyncingReminders(false);
    }
  }, []);

  // 6. Load Backups from Drive
  const loadDriveBackups = useCallback(async (activeToken: string) => {
    setIsLoadingBackups(true);
    try {
      const [driveBackups, folderInfo] = await Promise.all([
        listDriveBackups(activeToken),
        getBackupsFolderInfo(activeToken).catch(() => null),
      ]);
      setBackups(driveBackups);
      if (folderInfo?.webViewLink) {
        setBackupsFolderLink(folderInfo.webViewLink);
      }
    } catch (err) {
      console.warn('Failed to load drive backups:', err);
    } finally {
      setIsLoadingBackups(false);
    }
  }, []);

  // 7. Load Daily Tasks from Drive
  const loadDailyTasks = useCallback(async (activeToken: string) => {
    setIsSyncingTasks(true);
    try {
      const driveResult = await fetchDailyTasksFromDrive(activeToken);
      if (driveResult && driveResult.tasks) {
        setDailyTasks(driveResult.tasks);
        setDailyTasksFileId(driveResult.fileId);
        localStorage.setItem('daily_notes_tasks_cache', JSON.stringify(driveResult.tasks));
      }
    } catch (err) {
      console.warn('Failed to load daily tasks from Drive:', err);
    } finally {
      setIsSyncingTasks(false);
    }
  }, []);

  // Detect date rollover (next day new note, new day - Synology style automatic morning initialization)
  useEffect(() => {
    const checkNewDay = () => {
      const todayStr = getInitialDateStr();
      const storedLastDate = localStorage.getItem('daily_notes_active_system_date');
      if (storedLastDate && storedLastDate !== todayStr) {
        localStorage.setItem('daily_notes_active_system_date', todayStr);
        setCurrentDate(todayStr);
        showToast(`Good morning! Started a fresh note for ${todayStr}`);
      } else if (!storedLastDate) {
        localStorage.setItem('daily_notes_active_system_date', todayStr);
      }
    };

    const interval = setInterval(checkNewDay, 60000);
    window.addEventListener('focus', checkNewDay);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkNewDay);
    };
  }, []);

  // Global search keyboard shortcuts (Cmd+K, Ctrl+K, or '/')
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchModalOpen((prev) => !prev);
      } else if (
        e.key === '/' &&
        !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)
      ) {
        e.preventDefault();
        setIsSearchModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // When date or token changes, reload data
  useEffect(() => {
    if (!token) {
      if (isGuestMode) {
        loadNoteForDate(currentDate, null);
      }
      return;
    }
    loadNoteForDate(currentDate, token);
    loadCalendarEvents(currentDate, token);
    loadDriveArchive(token);
    loadReminders(token);
    loadDailyTasks(token);
    loadDriveBackups(token);
  }, [token, currentDate, isGuestMode, loadNoteForDate, loadCalendarEvents, loadDriveArchive, loadReminders, loadDailyTasks, loadDriveBackups]);

  // Sync Reminders to Google Drive with debounce
  const syncRemindersToDrive = useCallback((updated: ReminderNote[]) => {
    setReminders(updated);
    localStorage.setItem('daily_notes_reminders_cache', JSON.stringify(updated));

    if (remindersSaveTimerRef.current) {
      clearTimeout(remindersSaveTimerRef.current);
    }

    remindersSaveTimerRef.current = setTimeout(async () => {
      const activeToken = await getAccessToken();
      if (!activeToken) return;
      setIsSyncingReminders(true);
      try {
        const res = await saveRemindersToDrive(activeToken, updated, remindersFileId);
        if (res && res.fileId) {
          setRemindersFileId(res.fileId);
        }
      } catch (err) {
        console.warn('Failed to sync reminders to Drive:', err);
      } finally {
        setIsSyncingReminders(false);
      }
    }, 1500);
  }, [remindersFileId]);

  const handleAddReminder = (newNote: Omit<ReminderNote, 'id' | 'createdAt' | 'updatedAt'>) => {
    const note: ReminderNote = {
      ...newNote,
      id: 'rem_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [note, ...reminders];
    syncRemindersToDrive(updated);
    notifyReminderAction();
    showToast(`Saved reminder: "${note.title}"`);
  };

  const handleUpdateReminder = (id: string, updates: Partial<ReminderNote>) => {
    const updated = reminders.map((r) =>
      r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
    );
    syncRemindersToDrive(updated);
    notifyReminderAction();
  };

  const handleDeleteReminder = (id: string) => {
    const toDelete = reminders.find((r) => r.id === id);
    const updated = reminders.filter((r) => r.id !== id);
    syncRemindersToDrive(updated);
    if (toDelete) {
      showToast(`Deleted reminder "${toDelete.title}"`);
    }
  };

  const handleInsertReminderIntoNote = (reminder: ReminderNote) => {
    const check = reminder.isCompleted ? '[x]' : '[ ]';
    const due = reminder.dueDate ? ` *(due ${reminder.dueDate})*` : '';
    const body = reminder.content ? `\n  > ${reminder.content.replace(/\n/g, '\n  > ')}` : '';
    const snippet = `\n- ${check} 📌 **${reminder.title}**${due}${body}\n`;

    handleContentChange(noteContent + snippet);
    setMobileTab('notes');
    notifyReminderAction();
    showToast(`Added reminder "${reminder.title}" to today's note`);
  };

  const handleScheduleReminderInCalendar = (reminder: ReminderNote) => {
    setCalendarInitialData({
      summary: reminder.title,
      date: reminder.dueDate || currentDate,
      description: reminder.content || undefined,
    });
    setIsNewEventModalOpen(true);
  };

  // Synology-style Automatic Daily Snapshot Backup
  const triggerAutoDailyBackup = useCallback(() => {
    if (!autoBackupEnabled) return;
    if (autoBackupDebounceTimerRef.current) {
      clearTimeout(autoBackupDebounceTimerRef.current);
    }

    autoBackupDebounceTimerRef.current = setTimeout(async () => {
      const activeToken = await getAccessToken();
      if (!activeToken) return;

      try {
        const payload: BackupPayload = {
          backupVersion: 1,
          appName: 'Daily Notes & Calendar',
          exportedAt: new Date().toISOString(),
          backupDate: currentDate,
          user: user ? { email: user.email, displayName: user.displayName } : undefined,
          activeNote: {
            date: currentDate,
            content: noteContent,
          },
          dailyTasks,
          reminders,
          driveNotesIndex: driveFiles.map((f) => ({
            id: f.id,
            name: f.name,
            dateKey: f.dateKey,
            modifiedTime: f.modifiedTime,
          })),
        };

        const backupRes = await saveDailyBackupToDrive(activeToken, payload, false);
        const nowIso = new Date().toISOString();
        setLastBackupTime(nowIso);
        localStorage.setItem('daily_notes_last_backup_time', nowIso);
        localStorage.setItem('daily_notes_last_auto_backup_date', currentDate);
        if (backupRes.dayFolderId && backupRes.dayFolderName) {
          setTodayBackupDayFolder({
            folderId: backupRes.dayFolderId,
            folderName: backupRes.dayFolderName,
            webViewLink: backupRes.dayFolderWebViewLink,
          });
        }
        loadDriveBackups(activeToken);
      } catch (err) {
        console.warn('Synology auto-backup background sync error:', err);
      }
    }, 3500);
  }, [autoBackupEnabled, currentDate, user, noteContent, dailyTasks, reminders, driveFiles, loadDriveBackups]);

  // Sync Daily Tasks to Google Drive with debounce
  const syncDailyTasksToDrive = useCallback((updated: DailyTaskItem[]) => {
    setDailyTasks(updated);
    localStorage.setItem('daily_notes_tasks_cache', JSON.stringify(updated));

    if (tasksSaveTimerRef.current) {
      clearTimeout(tasksSaveTimerRef.current);
    }

    tasksSaveTimerRef.current = setTimeout(async () => {
      const activeToken = await getAccessToken();
      if (!activeToken) return;
      setIsSyncingTasks(true);
      try {
        const res = await saveDailyTasksToDrive(activeToken, updated, dailyTasksFileId);
        if (res && res.fileId) {
          setDailyTasksFileId(res.fileId);
        }
        // Also keep today's unified single-file record updated in the day folder
        saveUnifiedDailyRecordToDrive(
          activeToken,
          currentDate,
          {
            noteContent,
            tasks: updated,
            reminders,
            calendarEvents: dayEvents,
          },
          noteDriveFileId
        ).then((unifiedRes) => {
          if (unifiedRes.fileId) setNoteDriveFileId(unifiedRes.fileId);
          setCurrentDayFolder({
            folderId: unifiedRes.dayFolderId,
            folderName: unifiedRes.dayFolderName,
            webViewLink: unifiedRes.folderWebViewLink,
          });
        }).catch((e) => console.warn('Background unified record sync error:', e));

        triggerAutoDailyBackup();
      } catch (err) {
        console.warn('Failed to sync daily tasks to Drive:', err);
      } finally {
        setIsSyncingTasks(false);
      }
    }, 1500);
  }, [dailyTasksFileId, currentDate, noteContent, reminders, dayEvents, noteDriveFileId, triggerAutoDailyBackup]);

  // Daily Tasks Handlers ("Input all the tasks or what I do daily", "Make them in calendar", "Save them")
  const handleAddTask = (newTaskData: Omit<DailyTaskItem, 'id' | 'createdAt'>) => {
    const newTask: DailyTaskItem = {
      ...newTaskData,
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      createdAt: new Date().toISOString(),
    };
    const updated = [newTask, ...dailyTasks];
    syncDailyTasksToDrive(updated);

    // Also append to current note content if it has the tasks section
    const timeBadge = newTask.time ? ` *(⏰ ${newTask.time})*` : '';
    const priorityBadge = newTask.priority === 'high' ? ' 🔥' : '';
    const taskSnippet = `\n- [ ] ${newTask.text}${timeBadge}${priorityBadge}\n`;

    if (noteContent.includes('## 🎯 Daily Tasks')) {
      const updatedNote = noteContent.replace(
        '## 🎯 Daily Tasks & What I Need to Do Today',
        `## 🎯 Daily Tasks & What I Need to Do Today\n- [ ] ${newTask.text}${timeBadge}${priorityBadge}`
      );
      handleContentChange(updatedNote);
    } else {
      handleContentChange(noteContent + taskSnippet);
    }

    notifyReminderAction();
    showToast(`Added daily task: "${newTask.text}"`);
  };

  const handleToggleTask = (id: string) => {
    const task = dailyTasks.find((t) => t.id === id);
    if (!task) return;

    const willBeCompleted = !task.completed;
    const updated = dailyTasks.map((t) =>
      t.id === id ? { ...t, completed: willBeCompleted } : t
    );
    syncDailyTasksToDrive(updated);

    // Update note content checkbox if matching text exists
    const escapedText = task.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (willBeCompleted) {
      const regex = new RegExp(`- \\[ \\] (?:\\*\\*)?${escapedText}`, 'g');
      if (regex.test(noteContent)) {
        handleContentChange(noteContent.replace(regex, `- [x] ${task.text}`));
      }
      notifyReminderAction();
      showToast(`Completed: "${task.text}" (What I did daily)`);
    } else {
      const regex = new RegExp(`- \\[x\\] (?:\\*\\*)?${escapedText}`, 'gi');
      if (regex.test(noteContent)) {
        handleContentChange(noteContent.replace(regex, `- [ ] ${task.text}`));
      }
    }
  };

  const handleDeleteTask = (id: string) => {
    const task = dailyTasks.find((t) => t.id === id);
    const updated = dailyTasks.filter((t) => t.id !== id);
    syncDailyTasksToDrive(updated);
    if (task) {
      showToast(`Deleted task: "${task.text}"`);
    }
  };

  const handleScheduleTaskInCalendar = (task: DailyTaskItem) => {
    setCalendarInitialData({
      summary: task.text,
      date: task.date || currentDate,
      description: `Daily task for ${task.date || currentDate} (Synology style)`,
    });
    setIsNewEventModalOpen(true);
  };

  const handleInsertTaskIntoNote = (task: DailyTaskItem) => {
    const check = task.completed ? '[x]' : '[ ]';
    const time = task.time ? ` *(⏰ ${task.time})*` : '';
    const snippet = `\n- ${check} ${task.text}${time}\n`;
    handleContentChange(noteContent + snippet);
    setMobileTab('notes');
    showToast(`Added task "${task.text}" to daily note`);
  };

  const unfinishedYesterdayCount = dailyTasks.filter(
    (t) => t.date < currentDate && !t.completed
  ).length;

  const handleCarryOverUnfinishedTasks = () => {
    const unfinished = dailyTasks.filter((t) => t.date < currentDate && !t.completed);
    if (unfinished.length === 0) return;

    const carriedOverTasks: DailyTaskItem[] = unfinished.map((t) => ({
      ...t,
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      date: currentDate,
      createdAt: new Date().toISOString(),
    }));

    const updated = [...carriedOverTasks, ...dailyTasks];
    syncDailyTasksToDrive(updated);

    const taskLines = carriedOverTasks.map((t) => `- [ ] ${t.text} *(Carried over)*`).join('\n');
    const snippet = `\n\n### 🔄 Carried Over Tasks from Yesterday\n${taskLines}\n`;
    handleContentChange(noteContent + snippet);
    showToast(`Carried over ${unfinished.length} task${unfinished.length === 1 ? '' : 's'} to today's note`);
  };

  // Gmail & Notifications Channel Handlers (Auto-scan, auto-display, email-to-task/note)
  const handleScanGmail = useCallback(
    async (filter: GmailScanFilter = 'unread', forceOpen = false) => {
      setIsScanningGmail(true);
      try {
        const activeToken = token || (await getAccessToken());
        let items: GmailNotificationItem[] = [];
        if (activeToken && !isGuestMode) {
          try {
            items = await fetchGmailNotifications(activeToken, filter, 15);
          } catch (apiErr: any) {
            console.warn('Gmail API query returned error:', apiErr);
            const errStr = apiErr?.message || '';
            if (
              errStr.includes('403') ||
              errStr.includes('insufficient') ||
              errStr.includes('PERMISSION_DENIED') ||
              errStr.includes('Scope')
            ) {
              showToast('Gmail permissions need to be refreshed. Please sign in to grant Gmail access.');
            }
            items = getOfflineSampleNotifications();
          }
        } else {
          items = getOfflineSampleNotifications();
        }

        setNotifications(items);
        setLastGmailScanTime(new Date());
        try {
          localStorage.setItem('daily_notes_gmail_cache', JSON.stringify(items));
        } catch {}

        // User request: "If it's possible scan Gmail and everything in the notifications. I want you to open it automatically and display it for me."
        if ((autoOpenScanned || forceOpen) && items.length > 0) {
          const target = items.find((n) => n.isUnread) || items[0];
          setSelectedNotification(target);
          setIsNotificationDetailOpen(true);
          previewSound('chime');
        }

        const detectedMeetingsInScan = items.filter((n) => Boolean(n.detectedMeeting));
        if (detectedMeetingsInScan.length > 0) {
          setIsMeetingsPromptDismissed(false);
        }

        showToast(
          detectedMeetingsInScan.length > 0
            ? `Scanned ${items.length} message${items.length === 1 ? '' : 's'} — found ${detectedMeetingsInScan.length} meeting arrangement${detectedMeetingsInScan.length === 1 ? '' : 's'}!`
            : `Scanned ${items.length} notification${items.length === 1 ? '' : 's'} from Gmail`
        );
      } catch (err: any) {
        console.warn('Failed to scan Gmail notifications:', err);
        showToast('Gmail scan finished.');
      } finally {
        setIsScanningGmail(false);
      }
    },
    [token, isGuestMode, autoOpenScanned, previewSound]
  );

  const handleToggleAutoOpen = (enabled: boolean) => {
    setAutoOpenScanned(enabled);
    try {
      localStorage.setItem('daily_notes_auto_open_gmail', enabled ? 'true' : 'false');
    } catch {}
    showToast(enabled ? 'Auto-open newly scanned notifications enabled' : 'Auto-open disabled');
  };

  const handleSelectNotification = (item: GmailNotificationItem) => {
    setSelectedNotification(item);
    setIsNotificationDetailOpen(true);
  };

  const handleMarkNotificationAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isUnread: false } : n))
    );
    try {
      const activeToken = token || (await getAccessToken());
      if (activeToken && !id.startsWith('sample-')) {
        await markGmailAsRead(activeToken, id);
      }
    } catch (err) {
      console.warn('Could not mark read on Gmail API:', err);
    }
    showToast('Marked notification as read');
  };

  const handleInsertNotificationToNote = (text: string) => {
    handleContentChange(noteContent + text);
    notifyNoteSaved();
    showToast("Added notification to today's note");
  };

  const handleConvertNotificationToTask = (taskText: string) => {
    handleAddTask({
      text: taskText,
      completed: false,
      date: currentDate,
      priority: 'high',
    });
    notifyReminderAction();
    showToast('Added to Daily Tasks');
  };

  const handleScheduleNotificationInCalendar = (data: {
    summary: string;
    description: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    attendeesEmails?: string[];
    addGoogleMeet?: boolean;
    gmailMessageId?: string;
  }) => {
    setCalendarInitialData({
      summary: data.summary,
      date: data.date || currentDate,
      startTime: data.startTime,
      endTime: data.endTime,
      location: data.location,
      attendeesEmails: data.attendeesEmails,
      description: data.description,
      addGoogleMeet: data.addGoogleMeet,
      gmailMessageId: data.gmailMessageId,
    });
    setIsNewEventModalOpen(true);
  };

  const handleNavigateNextNotification = () => {
    if (!selectedNotification) return;
    const currentIndex = notifications.findIndex((n) => n.id === selectedNotification.id);
    if (currentIndex >= 0 && currentIndex < notifications.length - 1) {
      setSelectedNotification(notifications[currentIndex + 1]);
    }
  };

  const handleNavigatePrevNotification = () => {
    if (!selectedNotification) return;
    const currentIndex = notifications.findIndex((n) => n.id === selectedNotification.id);
    if (currentIndex > 0) {
      setSelectedNotification(notifications[currentIndex - 1]);
    }
  };

  // Initial and recurring Gmail notification scan
  useEffect(() => {
    if (token || isGuestMode) {
      handleScanGmail('unread');
    }
  }, [token, isGuestMode, handleScanGmail]);

  // Save Note to Google Drive (Unified Daily Record in dedicated Day Folder)
  const handleSaveNote = async () => {
    if (!token) {
      setIsSavingNote(true);
      try {
        localStorage.setItem(`daily_notes_local_${currentDate}`, noteContent);
        setLastSavedAt(new Date());
        setIsDirty(false);
        notifyNoteSaved();
        showToast(`Saved note for ${currentDate} locally in browser storage`);
      } finally {
        setIsSavingNote(false);
      }
      return;
    }
    setIsSavingNote(true);
    try {
      const res = await saveUnifiedDailyRecordToDrive(
        token,
        currentDate,
        {
          noteContent,
          tasks: dailyTasks,
          reminders,
          calendarEvents: dayEvents,
        },
        noteDriveFileId
      );
      setNoteDriveFileId(res.fileId);
      if (res.webViewLink) setNoteWebViewLink(res.webViewLink);
      setCurrentDayFolder({
        folderId: res.dayFolderId,
        folderName: res.dayFolderName,
        webViewLink: res.folderWebViewLink,
      });
      setLastSavedAt(new Date(res.modifiedTime));
      setIsDirty(false);
      notifyNoteSaved();
      showToast(`Daily record saved to folder "${res.dayFolderName}"`);

      // Refresh archive count and trigger auto daily backup
      loadDriveArchive(token);
      triggerAutoDailyBackup();
    } catch (err: any) {
      console.error('Failed to save note:', err);
      showToast('Error saving to Drive: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSavingNote(false);
    }
  };

  // Content change handler with debounced auto-save (Unified Daily Record in Day Folder)
  const handleContentChange = (newContent: string) => {
    setNoteContent(newContent);
    setIsDirty(true);

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Auto-save 2.5 seconds after typing stops
    autoSaveTimerRef.current = setTimeout(async () => {
      const activeToken = await getAccessToken();
      if (!activeToken) {
        // Save locally
        localStorage.setItem(`daily_notes_local_${currentDate}`, newContent);
        setLastSavedAt(new Date());
        setIsDirty(false);
        return;
      }
      setIsSavingNote(true);
      try {
        const res = await saveUnifiedDailyRecordToDrive(
          activeToken,
          currentDate,
          {
            noteContent: newContent,
            tasks: dailyTasks,
            reminders,
            calendarEvents: dayEvents,
          },
          noteDriveFileId
        );
        setNoteDriveFileId(res.fileId);
        if (res.webViewLink) setNoteWebViewLink(res.webViewLink);
        setCurrentDayFolder({
          folderId: res.dayFolderId,
          folderName: res.dayFolderName,
          webViewLink: res.folderWebViewLink,
        });
        setLastSavedAt(new Date(res.modifiedTime));
        setIsDirty(false);
        loadDriveArchive(activeToken);
        triggerAutoDailyBackup();
      } catch (e) {
        console.warn('Auto-save error:', e);
      } finally {
        setIsSavingNote(false);
      }
    }, 2500);
  };

  // Run Daily Drive Backup
  const handleRunDriveBackup = async (isTimestamped = false) => {
    const activeToken = await getAccessToken();
    if (!activeToken) {
      showToast('Authentication required for Drive backup');
      return;
    }

    setIsBackingUp(true);
    try {
      const payload: BackupPayload = {
        backupVersion: 1,
        appName: 'Daily Notes & Calendar',
        exportedAt: new Date().toISOString(),
        backupDate: currentDate,
        user: user ? { email: user.email, displayName: user.displayName } : undefined,
        activeNote: {
          date: currentDate,
          content: noteContent,
        },
        dailyTasks,
        reminders,
        driveNotesIndex: driveFiles.map((f) => ({
          id: f.id,
          name: f.name,
          dateKey: f.dateKey,
          modifiedTime: f.modifiedTime,
        })),
        recentCalendarEventsSummary: dayEvents.concat(upcomingEvents).slice(0, 25).map((e) => ({
          id: e.id,
          summary: e.summary,
          start: e.start?.dateTime || e.start?.date,
          end: e.end?.dateTime || e.end?.date,
        })),
      };

      const result = await saveDailyBackupToDrive(activeToken, payload, isTimestamped);
      const nowIso = new Date().toISOString();
      setLastBackupTime(nowIso);
      localStorage.setItem('daily_notes_last_backup_time', nowIso);
      localStorage.setItem('daily_notes_last_auto_backup_date', currentDate);
      if (result.dayFolderId && result.dayFolderName) {
        setTodayBackupDayFolder({
          folderId: result.dayFolderId,
          folderName: result.dayFolderName,
          webViewLink: result.dayFolderWebViewLink,
        });
      }

      await loadDriveBackups(activeToken);
      showToast(`Daily backup saved inside day map "${result.dayFolderName || result.filename}"`);
    } catch (err: any) {
      console.error('Drive backup failed:', err);
      showToast(`Drive backup failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreDriveBackup = async (fileId: string) => {
    const activeToken = await getAccessToken();
    if (!activeToken) return;

    try {
      const payload = await fetchBackupContentFromDrive(activeToken, fileId);
      if (payload) {
        if (payload.reminders && Array.isArray(payload.reminders)) {
          setReminders(payload.reminders);
          syncRemindersToDrive(payload.reminders);
        }
        if (payload.dailyTasks && Array.isArray(payload.dailyTasks)) {
          setDailyTasks(payload.dailyTasks);
          syncDailyTasksToDrive(payload.dailyTasks);
        }
        if (payload.activeNote && payload.activeNote.content) {
          handleContentChange(payload.activeNote.content);
        }
        showToast(`Successfully restored from backup (${payload.backupDate || 'snapshot'})`);
      }
    } catch (err: any) {
      console.error('Failed to restore backup:', err);
      showToast(`Restore failed: ${err.message || 'Error'}`);
    }
  };

  const handleDeleteDriveBackup = async (fileId: string) => {
    const activeToken = await getAccessToken();
    if (!activeToken) return;

    try {
      await deleteDriveBackup(activeToken, fileId);
      setBackups((prev) => prev.filter((b) => b.id !== fileId));
      showToast('Backup deleted from Google Drive');
    } catch (err: any) {
      console.error('Failed to delete backup:', err);
      showToast(`Delete failed: ${err.message || 'Error'}`);
    }
  };

  const handleToggleAutoBackup = (enabled: boolean) => {
    setAutoBackupEnabled(enabled);
    localStorage.setItem('daily_notes_auto_backup_enabled', String(enabled));
    showToast(enabled ? 'Automatic daily Drive backup enabled' : 'Automatic daily Drive backup paused');
  };

  const handleLocalExportJson = () => {
    const payload: BackupPayload = {
      backupVersion: 1,
      appName: 'Daily Notes & Calendar',
      exportedAt: new Date().toISOString(),
      backupDate: currentDate,
      user: user ? { email: user.email, displayName: user.displayName } : undefined,
      activeNote: {
        date: currentDate,
        content: noteContent,
      },
      dailyTasks,
      reminders,
      driveNotesIndex: driveFiles.map((f) => ({
        id: f.id,
        name: f.name,
        dateKey: f.dateKey,
        modifiedTime: f.modifiedTime,
      })),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DailyNotes_Backup_${currentDate}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Downloaded local JSON backup');
  };

  // Background Auto-backup check: runs daily when enabled and user has token
  useEffect(() => {
    if (!token || !autoBackupEnabled) return;

    const lastAutoBackupDate = localStorage.getItem('daily_notes_last_auto_backup_date');
    if (lastAutoBackupDate !== currentDate) {
      const timer = setTimeout(async () => {
        const activeToken = await getAccessToken();
        if (!activeToken) return;

        try {
          const payload: BackupPayload = {
            backupVersion: 1,
            appName: 'Daily Notes & Calendar',
            exportedAt: new Date().toISOString(),
            backupDate: currentDate,
            user: user ? { email: user.email, displayName: user.displayName } : undefined,
            activeNote: {
              date: currentDate,
              content: noteContent,
            },
            dailyTasks,
            reminders,
            driveNotesIndex: driveFiles.map((f) => ({
              id: f.id,
              name: f.name,
              dateKey: f.dateKey,
              modifiedTime: f.modifiedTime,
            })),
          };

          await saveDailyBackupToDrive(activeToken, payload, false);
          const nowIso = new Date().toISOString();
          setLastBackupTime(nowIso);
          localStorage.setItem('daily_notes_last_backup_time', nowIso);
          localStorage.setItem('daily_notes_last_auto_backup_date', currentDate);
          await loadDriveBackups(activeToken);
        } catch (e) {
          console.warn('Background auto-backup to Drive skipped or error:', e);
        }
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [token, currentDate, autoBackupEnabled, dailyTasks, reminders, noteContent, driveFiles, user, loadDriveBackups]);

  // Handle scheduling new calendar event
  const handleCreateEvent = async (payload: NewEventPayload) => {
    if (!token) return;
    const created = await createCalendarEvent(token, payload);
    notifyCalendarScheduled();
    showToast(`Scheduled: "${created.summary}" in Google Calendar`);
    if (calendarInitialData?.gmailMessageId) {
      const msgId = calendarInitialData.gmailMessageId;
      setAttachedMeetingsMap((prev) => {
        const next = { ...prev, [msgId]: created.id };
        try {
          localStorage.setItem('daily_notes_attached_gmail_meetings', JSON.stringify(next));
        } catch {}
        return next;
      });
    }
    // If matching daily task, link event ID
    const matching = dailyTasks.find(
      (t) => t.text.toLowerCase().trim() === payload.summary.toLowerCase().trim()
    );
    if (matching) {
      const updated = dailyTasks.map((t) =>
        t.id === matching.id ? { ...t, calendarEventId: created.id } : t
      );
      syncDailyTasksToDrive(updated);
    }
    // Reload calendar
    await loadCalendarEvents(currentDate, token);
  };

  // Batch-attach chosen Gmail meetings to Google Calendar together
  const handleAttachGmailMeetingsBatch = async (
    items: AttachMeetingItemPayload[],
    alsoAddToTasks: boolean
  ) => {
    if (items.length === 0) return;
    setIsAttachingMeetings(true);
    try {
      const activeToken = token || (await getAccessToken());
      const isLiveGoogle = Boolean(activeToken && !isGuestMode);

      const newTaskEntries: DailyTaskItem[] = [];
      const newlyAttachedMap: Record<string, string> = {};
      let syncedCalendarCount = 0;

      for (const item of items) {
        const startDateTime = new Date(`${item.date}T${item.startTime}:00`).toISOString();
        let endDate = new Date(`${item.date}T${item.endTime}:00`);
        const startDate = new Date(`${item.date}T${item.startTime}:00`);
        if (isNaN(endDate.getTime()) || endDate <= startDate) {
          endDate = new Date(startDate.getTime() + 30 * 60 * 1000);
        }

        let createdEvent: CalendarEventItem | null = null;
        if (isLiveGoogle && activeToken) {
          createdEvent = await createCalendarEvent(activeToken, {
            summary: item.summary,
            description: item.description,
            location: item.location,
            startDateTime,
            endDateTime: endDate.toISOString(),
            attendeesEmails: item.attendeesEmails,
            addGoogleMeet: item.addGoogleMeet,
          });
          syncedCalendarCount++;
          newlyAttachedMap[item.notificationId] = createdEvent.id;
        }

        if (alsoAddToTasks) {
          newTaskEntries.push({
            id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            text: item.summary,
            completed: false,
            date: item.date,
            time: item.startTime,
            priority: 'high',
            calendarEventId: createdEvent?.id,
            createdAt: new Date().toISOString(),
          });
        }
      }

      if (Object.keys(newlyAttachedMap).length > 0) {
        setAttachedMeetingsMap((prev) => {
          const next = { ...prev, ...newlyAttachedMap };
          try {
            localStorage.setItem('daily_notes_attached_gmail_meetings', JSON.stringify(next));
          } catch {}
          return next;
        });
      }

      if (newTaskEntries.length > 0) {
        const updatedTasks = [...newTaskEntries, ...dailyTasks];
        syncDailyTasksToDrive(updatedTasks);
      }

      if (isLiveGoogle && activeToken) {
        await loadCalendarEvents(currentDate, activeToken);
        notifyCalendarScheduled();
        showToast(
          `Attached ${syncedCalendarCount} meeting${syncedCalendarCount === 1 ? '' : 's'} to Google Calendar!`
        );
      } else {
        showToast(
          alsoAddToTasks
            ? `Added ${items.length} meeting${items.length === 1 ? '' : 's'} to Daily Tasks. Connect Google Workspace to push directly to Google Calendar.`
            : 'Please connect Google Workspace to attach meetings to Google Calendar.'
        );
      }
    } catch (err: any) {
      console.error('Failed to attach Gmail meetings:', err);
      showToast(`Could not attach meeting: ${err?.message || 'Error occurred'}`);
    } finally {
      setIsAttachingMeetings(false);
    }
  };

  const [isQuickScheduling, setIsQuickScheduling] = useState(false);

  // Quick Task & Calendar Scheduler ("department which schedules a task for tomorrow at 10:00")
  const handleQuickScheduleEvent = async (payload: {
    summary: string;
    description?: string;
    date: string;
    time: string;
    durationMinutes: number;
    addGoogleMeet?: boolean;
  }) => {
    setIsQuickScheduling(true);
    try {
      const activeToken = token || (await getAccessToken());
      const startDate = new Date(`${payload.date}T${payload.time}:00`);
      const endDate = new Date(startDate.getTime() + (payload.durationMinutes || 30) * 60 * 1000);

      const urlMatch = payload.summary.match(/https?:\/\/\S+/i);
      const extractedLink = urlMatch ? urlMatch[0] : undefined;
      const cleanSummary = extractedLink
        ? payload.summary.replace(extractedLink, '').trim() || 'Google Meet Call'
        : payload.summary;

      let createdEvent: CalendarEventItem | null = null;
      if (activeToken && !isGuestMode) {
        createdEvent = await createCalendarEvent(activeToken, {
          summary: cleanSummary,
          location: extractedLink,
          description:
            payload.description ||
            (extractedLink
              ? `Meeting Link: ${extractedLink}\nScheduled for ${payload.date} at ${payload.time}`
              : `Scheduled via Quick Calendar Scheduler for ${payload.date} at ${payload.time}`),
          startDateTime: startDate.toISOString(),
          endDateTime: endDate.toISOString(),
          addGoogleMeet: extractedLink ? false : payload.addGoogleMeet,
        });
      }

      // Add to Daily Tasks for the target date so user has it in their persistent task list
      const newTask: DailyTaskItem = {
        id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        text: payload.summary,
        completed: false,
        date: payload.date,
        time: payload.time,
        priority: 'high',
        calendarEventId: createdEvent?.id,
        createdAt: new Date().toISOString(),
      };
      const updatedTasks = [newTask, ...dailyTasks];
      syncDailyTasksToDrive(updatedTasks);

      // If scheduled for current viewing date, also append to note
      if (payload.date === currentDate) {
        const timeBadge = ` *(⏰ ${payload.time})*`;
        const taskSnippet = `\n- [ ] ${payload.summary}${timeBadge} 🔥\n`;
        if (noteContent.includes('## 🎯 Daily Tasks')) {
          const updatedNote = noteContent.replace(
            '## 🎯 Daily Tasks & What I Need to Do Today',
            `## 🎯 Daily Tasks & What I Need to Do Today\n- [ ] ${payload.summary}${timeBadge} 🔥`
          );
          handleContentChange(updatedNote);
        } else {
          handleContentChange(noteContent + taskSnippet);
        }
      }

      notifyCalendarScheduled();
      const friendlyDate = payload.date === currentDate ? 'Today' : `on ${payload.date}`;
      showToast(
        `Scheduled: "${payload.summary}" ${friendlyDate} at ${payload.time} in Google Calendar!`
      );

      if (activeToken) {
        await loadCalendarEvents(currentDate, activeToken);
      }
    } catch (err: any) {
      console.error('Failed to quick schedule event:', err);
      showToast(`Scheduling failed: ${err?.message || 'Error occurred'}`);
    } finally {
      setIsQuickScheduling(false);
    }
  };

  // Handle deleting calendar event (with explicit confirmation)
  const handleDeleteCalendarEvent = (event: CalendarEventItem) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Calendar Event?',
      message: `Are you sure you want to delete "${event.summary}" from your Google Calendar? This action cannot be undone.`,
      confirmLabel: 'Delete from Calendar',
      isDestructive: true,
      onConfirm: async () => {
        if (!token) return;
        await deleteCalendarEvent(token, event.id);
        showToast(`Deleted "${event.summary}" from Google Calendar`);
        await loadCalendarEvents(currentDate, token);
      },
    });
  };

  // Handle deleting Drive note (with explicit confirmation)
  const handleDeleteDriveNote = (file: DriveNoteFile) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Daily Note from Drive?',
      message: `Are you sure you want to delete "${file.name}" from your Google Drive "Daily Notes" folder?`,
      confirmLabel: 'Delete Note',
      isDestructive: true,
      onConfirm: async () => {
        if (!token) return;
        await deleteDailyNoteFromDrive(token, file.id);
        showToast(`Deleted "${file.name}" from Google Drive`);
        if (file.dateKey === currentDate) {
          setNoteContent('');
          setNoteDriveFileId(undefined);
          setNoteWebViewLink(undefined);
          setLastSavedAt(null);
          setIsDirty(false);
        }
        await loadDriveArchive(token);
      },
    });
  };

  // Insert an individual event into the current daily note
  const handleInsertEventToNote = (event: CalendarEventItem) => {
    let time = 'All Day';
    if (event.start.dateTime) {
      const s = new Date(event.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const e = event.end.dateTime
        ? new Date(event.end.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '';
      time = e ? `${s} - ${e}` : s;
    }
    const snippet = `\n\n### 📌 Meeting: ${event.summary}\n- **Time**: ${time}\n${
      event.location ? `- **Location**: ${event.location}\n` : ''
    }${event.hangoutLink ? `- **Video**: [Join Google Meet](${event.hangoutLink})\n` : ''}- **Notes**:\n  - \n- **Action Items**:\n  - [ ] \n`;

    handleContentChange(noteContent + snippet);
    setMobileTab('notes');
    notifyCalendarScheduled();
    showToast(`Added "${event.summary}" to today's note`);
  };

  // Handle date change safely
  const handleDateChange = (newDate: string) => {
    if (isDirty && noteContent.trim()) {
      // Prompt user or save first
      handleSaveNote();
    }
    setCurrentDate(newDate);
  };

  // Loading screen during initial auth inspection
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-center max-w-sm">
          <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 tracking-wide">
            Connecting to Daily Notes &amp; Calendar...
          </p>
          <button
            onClick={() => setIsAuthChecking(false)}
            className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer py-1 px-2.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
          >
            Click to continue to sign-in &rarr;
          </button>
        </div>
      </div>
    );
  }

  // Not signed in: show Google Sign-In View
  if (!user || (!token && !isGuestMode)) {
    return (
      <LoginView
        onSignIn={handleSignIn}
        onContinueGuest={handleContinueGuest}
        isLoading={isLoggingIn}
        error={loginError}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 flex flex-col text-slate-900 dark:text-slate-100 font-sans transition-colors">
      {/* Offline / Local Mode Banner */}
      {isGuestMode && !token && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-800 dark:text-amber-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span>
              <strong>Offline / Local Workspace:</strong> Notes and reminders are saved locally in your browser.
            </span>
          </div>
          <button
            onClick={handleSignIn}
            disabled={isLoggingIn}
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-xs transition-colors cursor-pointer text-xs"
          >
            {isLoggingIn ? 'Connecting...' : 'Connect Google Workspace &rarr;'}
          </button>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        user={user}
        currentDate={currentDate}
        onDateChange={handleDateChange}
        onOpenArchive={() => setIsArchiveOpen(true)}
        onOpenShortcuts={() => setIsShortcutModalOpen(true)}
        onOpenSelfHost={() => setIsSelfHostModalOpen(true)}
        onOpenBackup={() => setIsBackupModalOpen(true)}
        onOpenNotebookLM={() => setIsNotebookLMModalOpen(true)}
        isTodayBackedUp={!!backups.find((b) => b.backupDate === currentDate || b.name.includes(currentDate))}
        onToggleTasks={() => setIsTasksPanelOpen(!isTasksPanelOpen)}
        isTasksOpen={isTasksPanelOpen}
        tasksCount={dailyTasks.filter((t) => t.date === currentDate && !t.completed).length}
        onToggleReminders={() => setIsRemindersOpen(!isRemindersOpen)}
        isRemindersOpen={isRemindersOpen}
        remindersCount={reminders.filter((r) => !r.isCompleted).length}
        onToggleNotifications={() => setIsNotificationsPanelOpen(!isNotificationsPanelOpen)}
        isNotificationsOpen={isNotificationsPanelOpen}
        notificationsCount={notifications.filter((n) => n.isUnread).length}
        isScanningNotifications={isScanningGmail}
        onOpenSearch={() => setIsSearchModalOpen(true)}
        onSignOut={handleSignOut}
        isSavingNote={isSavingNote}
        notesCount={driveFiles.length}
        theme={theme}
        onToggleTheme={toggleTheme}
        resolution={resolution}
        onSelectResolution={setResolution}
        maxWidthClass={maxWidthClass}
        onOpenSoundSettings={() => setIsSoundModalOpen(true)}
        soundType={soundSettings.soundType}
        soundVolume={soundSettings.volume}
      />

      {/* Mobile Tab Switcher */}
      <div className="lg:hidden px-4 pt-3 pb-1">
        <div className="grid grid-cols-5 bg-slate-200/80 dark:bg-slate-800/80 p-1 rounded-2xl text-[11px] font-semibold">
          <button
            onClick={() => setMobileTab('notes')}
            className={`flex items-center justify-center gap-1 py-2 rounded-xl transition-all cursor-pointer ${
              mobileTab === 'notes'
                ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Note</span>
          </button>
          <button
            onClick={() => setMobileTab('tasks')}
            className={`flex items-center justify-center gap-1 py-2 rounded-xl transition-all cursor-pointer ${
              mobileTab === 'tasks'
                ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Tasks ({dailyTasks.filter((t) => t.date === currentDate && !t.completed).length})</span>
          </button>
          <button
            onClick={() => setMobileTab('reminders')}
            className={`flex items-center justify-center gap-1 py-2 rounded-xl transition-all cursor-pointer ${
              mobileTab === 'reminders'
                ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Remind</span>
          </button>
          <button
            onClick={() => setMobileTab('calendar')}
            className={`flex items-center justify-center gap-1 py-2 rounded-xl transition-all cursor-pointer ${
              mobileTab === 'calendar'
                ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Agenda</span>
          </button>
          <button
            onClick={() => setMobileTab('notifications')}
            className={`flex items-center justify-center gap-1 py-2 rounded-xl transition-all cursor-pointer ${
              mobileTab === 'notifications'
                ? 'bg-white dark:bg-slate-700 text-red-700 dark:text-red-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Gmail ({notifications.filter((n) => n.isUnread).length})</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <main className={`flex-1 ${maxWidthClass} w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 transition-all duration-300`}>
        {/* Detected Gmail Meetings Chooser Prompt Bar (shown only when unattached meetings are found) */}
        {(() => {
          const pendingMeetings = notifications.filter(
            (n) => Boolean(n.detectedMeeting) && !attachedMeetingsMap[n.id]
          );
          if (pendingMeetings.length === 0 || isMeetingsPromptDismissed) return null;
          const previewTitles = pendingMeetings
            .slice(0, 2)
            .map((n) => n.detectedMeeting?.title || n.subject)
            .join(' • ');

          return (
            <div
              id="gmail-meetings-detected-banner"
              className="rounded-2xl border border-indigo-200 dark:border-indigo-800/80 bg-gradient-to-r from-indigo-50 via-blue-50/70 to-white dark:from-indigo-950/50 dark:via-slate-900 dark:to-slate-900 px-4 py-3 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <CalendarCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                    Found {pendingMeetings.length} meeting arrangement
                    {pendingMeetings.length === 1 ? '' : 's'} in Gmail
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                    {previewTitles}
                    {pendingMeetings.length > 2 ? ` +${pendingMeetings.length - 2} more` : ''} — choose when to attach them to Calendar
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  id="btn-banner-choose-meetings"
                  type="button"
                  onClick={() => setIsMeetingsChooserOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <CalendarCheck className="w-3.5 h-3.5" />
                  <span>Choose &amp; Attach Together</span>
                </button>
                <button
                  id="btn-banner-dismiss-meetings"
                  type="button"
                  onClick={() => setIsMeetingsPromptDismissed(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  title="Dismiss for now (still accessible inside Gmail Channel)"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Later</span>
                </button>
              </div>
            </div>
          );
        })()}

        {/* Gmail & Notifications Channel (Auto-scan, auto-display, alerts) */}
        {((isNotificationsPanelOpen && mobileTab !== 'calendar' && mobileTab !== 'notes' && mobileTab !== 'tasks' && mobileTab !== 'reminders') ||
          (isNotificationsPanelOpen && !window.matchMedia('(max-width: 1023px)').matches) ||
          mobileTab === 'notifications') && (
          <div
            id="gmail-notifications-channel-section"
            className={`${mobileTab === 'notifications' ? 'block' : 'hidden lg:block'}`}
          >
            <GmailNotificationsPanel
              notifications={notifications}
              isScanning={isScanningGmail}
              onScan={handleScanGmail}
              lastScannedTime={lastGmailScanTime}
              onSelectNotification={handleSelectNotification}
              onInsertIntoNote={handleInsertNotificationToNote}
              onConvertToTask={handleConvertNotificationToTask}
              onScheduleInCalendar={handleScheduleNotificationInCalendar}
              onMarkAsRead={handleMarkNotificationAsRead}
              isGuestMode={isGuestMode}
              onAuthorizeGmail={handleSignIn}
              autoOpenEnabled={autoOpenScanned}
              onToggleAutoOpen={handleToggleAutoOpen}
              attachedMeetingsMap={attachedMeetingsMap}
              onOpenMeetingsChooser={() => setIsMeetingsChooserOpen(true)}
            />
          </div>
        )}

        {/* Daily Tasks & Daily Routine Panel (Synology-style "what I do daily, in calendar, save them") */}
        {((isTasksPanelOpen && mobileTab !== 'calendar' && mobileTab !== 'notes' && mobileTab !== 'reminders' && mobileTab !== 'notifications') ||
          (isTasksPanelOpen && !window.matchMedia('(max-width: 1023px)').matches) ||
          mobileTab === 'tasks') && (
          <div
            id="daily-tasks-section"
            className={`${mobileTab === 'tasks' ? 'block' : 'hidden lg:block'}`}
          >
            <DailyTasksPanel
              currentDate={currentDate}
              tasks={dailyTasks}
              onAddTask={handleAddTask}
              onToggleTask={handleToggleTask}
              onDeleteTask={handleDeleteTask}
              onScheduleInCalendar={handleScheduleTaskInCalendar}
              onInsertTaskIntoNote={handleInsertTaskIntoNote}
              onCarryOverUnfinishedTasks={handleCarryOverUnfinishedTasks}
              unfinishedYesterdayCount={unfinishedYesterdayCount}
              isTodayBackedUp={!!backups.find((b) => b.backupDate === currentDate || b.name.includes(currentDate))}
              onOpenBackupModal={() => setIsBackupModalOpen(true)}
              calendarEvents={dayEvents}
            />
          </div>
        )}

        {/* Synology Reminders & Sticky Notes Shelf (Visible on desktop when toggled, or on mobile Reminders tab) */}
        {((isRemindersOpen && mobileTab !== 'calendar' && mobileTab !== 'notes' && mobileTab !== 'tasks' && mobileTab !== 'notifications') ||
          (isRemindersOpen && !window.matchMedia('(max-width: 1023px)').matches) ||
          mobileTab === 'reminders') && (
          <div
            id="synology-reminders-section"
            className={`${mobileTab === 'reminders' ? 'block' : 'hidden lg:block'}`}
          >
            <SynologyRemindersPanel
              reminders={reminders}
              onAddReminder={handleAddReminder}
              onUpdateReminder={handleUpdateReminder}
              onDeleteReminder={handleDeleteReminder}
              onInsertIntoDailyNote={handleInsertReminderIntoNote}
              onScheduleInCalendar={handleScheduleReminderInCalendar}
              isSyncing={isSyncingReminders}
            />
          </div>
        )}

        {/* Notes & Calendar Columns */}
        <div
          className={`grid grid-cols-1 lg:grid-cols-12 gap-6 items-start ${
            mobileTab === 'reminders' || mobileTab === 'tasks' || mobileTab === 'notifications' ? 'hidden lg:grid' : 'grid'
          }`}
        >
          {/* Notes Section (Left 7-8 Cols on desktop & 4K) */}
          <div
            className={`lg:col-span-7 2xl:col-span-8 ${
              mobileTab === 'notes' ? 'block' : 'hidden lg:block'
            }`}
          >
            <NotesEditor
              currentDate={currentDate}
              content={noteContent}
              onChange={handleContentChange}
              onSave={handleSaveNote}
              isSaving={isSavingNote}
              isDirty={isDirty}
              lastSavedAt={lastSavedAt}
              driveWebViewLink={noteWebViewLink}
              dayFolderInfo={currentDayFolder}
              todayEvents={dayEvents}
              onScheduleInCalendar={(data) => {
                setCalendarInitialData(
                  data
                    ? {
                        ...data,
                        date: data.date || currentDate,
                      }
                    : undefined
                );
                setIsNewEventModalOpen(true);
              }}
            />
          </div>

          {/* Calendar Agenda Section (Right 4-5 Cols on desktop & 4K) */}
          <div
            className={`lg:col-span-5 2xl:col-span-4 ${
              mobileTab === 'calendar' ? 'block' : 'hidden lg:block'
            }`}
          >
            <CalendarPanel
              currentDate={currentDate}
              events={dayEvents}
              upcomingEvents={upcomingEvents}
              isLoading={isLoadingCalendar}
              onOpenNewEventModal={() => {
                setCalendarInitialData(undefined);
                setIsNewEventModalOpen(true);
              }}
              onDeleteEvent={handleDeleteCalendarEvent}
              onInsertEventToNote={handleInsertEventToNote}
              onQuickScheduleEvent={handleQuickScheduleEvent}
              isScheduling={isQuickScheduling}
              onDateChange={handleDateChange}
            />
          </div>
        </div>
      </main>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          id="toast-notification"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 bg-slate-900 dark:bg-slate-800 text-white dark:text-slate-100 border border-transparent dark:border-slate-700/80 rounded-2xl shadow-xl text-xs font-medium animate-in fade-in slide-in-from-bottom-3 duration-200"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Schedule New Meeting/Appointment Modal */}
      <NewEventModal
        isOpen={isNewEventModalOpen}
        onClose={() => {
          setIsNewEventModalOpen(false);
          setCalendarInitialData(undefined);
        }}
        defaultDate={currentDate}
        initialData={calendarInitialData}
        onSubmit={handleCreateEvent}
      />

      {/* Google Drive Notes Archive Modal */}
      <NotesHistoryModal
        isOpen={isArchiveOpen}
        onClose={() => setIsArchiveOpen(false)}
        files={driveFiles}
        isLoading={isLoadingArchive}
        onRefresh={() => {
          if (token) loadDriveArchive(token);
        }}
        onSelectDate={(date) => {
          handleDateChange(date);
        }}
        onDeleteFile={handleDeleteDriveNote}
      />

      {/* Direct URL & Shortcuts Modal */}
      <ShortcutModal
        isOpen={isShortcutModalOpen}
        onClose={() => setIsShortcutModalOpen(false)}
        user={user}
      />

      {/* Self-Hosting & Data Export Modal */}
      <SelfHostModal
        isOpen={isSelfHostModalOpen}
        onClose={() => setIsSelfHostModalOpen(false)}
        files={driveFiles}
        reminders={reminders}
        currentNoteContent={noteContent}
        currentDate={currentDate}
        onOpenDriveBackup={() => setIsBackupModalOpen(true)}
        onOpenNotebookLM={() => setIsNotebookLMModalOpen(true)}
      />

      {/* Google Drive Daily Backup Modal */}
      <DailyBackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        user={user}
        currentDate={currentDate}
        backups={backups}
        isLoadingBackups={isLoadingBackups}
        isBackingUp={isBackingUp}
        lastBackupTime={lastBackupTime}
        autoBackupEnabled={autoBackupEnabled}
        onToggleAutoBackup={handleToggleAutoBackup}
        onRunBackup={handleRunDriveBackup}
        onRestoreBackup={handleRestoreDriveBackup}
        onDeleteBackup={handleDeleteDriveBackup}
        onRefreshBackups={async () => {
          const activeToken = await getAccessToken();
          if (activeToken) await loadDriveBackups(activeToken);
        }}
        onLocalExportJson={handleLocalExportJson}
        backupsFolderLink={backupsFolderLink}
        todayBackupFolderInfo={todayBackupDayFolder}
      />

      {/* Google NotebookLM Integration Modal */}
      <NotebookLMModal
        isOpen={isNotebookLMModalOpen}
        onClose={() => setIsNotebookLMModalOpen(false)}
        token={token}
        userEmail={user.email}
        activeDate={currentDate}
        activeContent={noteContent}
        driveFiles={driveFiles}
        reminders={reminders}
        calendarEvents={dayEvents}
        onToast={showToast}
      />

      {/* Office Notification Sounds Modal */}
      <SoundSettingsModal
        isOpen={isSoundModalOpen}
        onClose={() => setIsSoundModalOpen(false)}
        settings={soundSettings}
        onUpdateSettings={updateSoundSettings}
        onPreviewSound={previewSound}
        soundOptions={soundOptions}
      />

      {/* Gmail Notification Auto-Display & Detail Modal */}
      <GmailNotificationDetailModal
        isOpen={isNotificationDetailOpen}
        onClose={() => setIsNotificationDetailOpen(false)}
        notification={selectedNotification}
        token={token}
        onInsertIntoNote={handleInsertNotificationToNote}
        onConvertToTask={handleConvertNotificationToTask}
        onScheduleInCalendar={handleScheduleNotificationInCalendar}
        onMarkedAsRead={handleMarkNotificationAsRead}
        onNavigateNext={handleNavigateNextNotification}
        onNavigatePrev={handleNavigatePrevNotification}
        hasNext={
          selectedNotification
            ? notifications.findIndex((n) => n.id === selectedNotification.id) < notifications.length - 1
            : false
        }
        hasPrev={
          selectedNotification
            ? notifications.findIndex((n) => n.id === selectedNotification.id) > 0
            : false
        }
        isAttachedToCalendar={
          selectedNotification ? Boolean(attachedMeetingsMap[selectedNotification.id]) : false
        }
        onOpenMeetingsChooser={() => setIsMeetingsChooserOpen(true)}
      />

      {/* Gmail Detected Meetings -> Calendar Chooser Modal */}
      <GmailMeetingsModal
        isOpen={isMeetingsChooserOpen}
        onClose={() => setIsMeetingsChooserOpen(false)}
        notifications={notifications}
        currentDate={currentDate}
        attachedMeetingsMap={attachedMeetingsMap}
        isAttaching={isAttachingMeetings}
        isGuestMode={isGuestMode}
        onAuthorizeGoogle={handleSignIn}
        onAttachMeetings={handleAttachGmailMeetingsBatch}
        onOpenSingleEmail={(notif) => {
          setIsMeetingsChooserOpen(false);
          setSelectedNotification(notif);
          setIsNotificationDetailOpen(true);
        }}
        onOpenFullEditModal={(data) => {
          setIsMeetingsChooserOpen(false);
          setCalendarInitialData(data);
          setIsNewEventModalOpen(true);
        }}
      />

      {/* Global Search Loupe Modal */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        currentDate={currentDate}
        currentNoteContent={noteContent}
        driveFiles={driveFiles}
        dailyTasks={dailyTasks}
        reminders={reminders}
        calendarEvents={dayEvents}
        notifications={notifications}
        onSelectDate={(date) => {
          handleDateChange(date);
        }}
        onSelectNotification={(notif) => {
          setSelectedNotification(notif);
          setIsNotificationDetailOpen(true);
        }}
        onSelectCalendarEvent={(event) => {
          setCalendarInitialData({
            summary: event.summary,
            date: event.start.dateTime ? event.start.dateTime.split('T')[0] : event.start.date || currentDate,
            description: event.description,
          });
          setIsNewEventModalOpen(true);
        }}
      />

      {/* User Confirmation Dialog for Destructive Operations */}
      <ConfirmModal
        state={confirmModal}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
