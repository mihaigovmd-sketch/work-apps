export interface GoogleUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export interface DriveNoteFile {
  id: string;
  name: string;
  dateKey: string; // YYYY-MM-DD
  dayFolderName?: string; // e.g. "22 September 2026"
  dayFolderId?: string;
  modifiedTime: string;
  webViewLink?: string;
  folderWebViewLink?: string;
  size?: string;
  isUnifiedRecord?: boolean;
}

export interface DayFolderInfo {
  folderId: string;
  folderName: string;
  webViewLink?: string;
}

export interface UnifiedSaveResult {
  fileId: string;
  filename: string;
  dayFolderId: string;
  dayFolderName: string;
  folderWebViewLink?: string;
  webViewLink?: string;
  modifiedTime: string;
}

export interface DailyNote {
  dateKey: string; // YYYY-MM-DD
  title: string;
  content: string;
  driveFileId?: string;
  lastSyncedAt?: Date;
  isDirty?: boolean;
}

export interface CalendarEventItem {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  hangoutLink?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
    self?: boolean;
  }>;
}

export interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => Promise<void> | void;
}

export type ReminderColor = 'amber' | 'emerald' | 'sky' | 'indigo' | 'rose' | 'slate';

export interface ReminderNote {
  id: string;
  title: string;
  content: string;
  dueDate?: string; // YYYY-MM-DD or YYYY-MM-DDTHH:mm
  color: ReminderColor;
  isPinned: boolean;
  isCompleted: boolean;
  priority?: 'normal' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
}

export interface DriveBackupFile {
  id: string;
  name: string;
  createdTime: string;
  modifiedTime: string;
  size?: string;
  webViewLink?: string;
  backupDate?: string;
  dayFolderName?: string;
  dayFolderId?: string;
  dayFolderWebViewLink?: string;
}

export interface DailyTaskItem {
  id: string;
  text: string;
  completed: boolean;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  calendarEventId?: string;
  priority?: 'normal' | 'high';
  createdAt: string;
}

export interface BackupPayload {
  backupVersion: number;
  appName: string;
  exportedAt: string;
  backupDate: string;
  user?: {
    email: string | null;
    displayName: string | null;
  };
  activeNote: {
    date: string;
    content: string;
  };
  dailyTasks?: DailyTaskItem[];
  reminders: ReminderNote[];
  driveNotesIndex: Array<{
    id: string;
    name: string;
    dateKey: string;
    modifiedTime: string;
  }>;
  recentCalendarEventsSummary?: Array<{
    id: string;
    summary: string;
    start?: string;
    end?: string;
  }>;
}

export type ScreenResolution = 'standard' | 'fhd' | '4k' | 'fluid';

export type GmailCategory = 'updates' | 'promotions' | 'forums' | 'alerts' | 'direct' | 'calendar' | 'system';

export interface DetectedMeetingInfo {
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  location?: string;
  meetingLink?: string;
  attendeesEmails?: string[];
  description?: string;
  confidence: 'high' | 'medium';
  source: 'ics' | 'text';
  rawWhenText?: string;
}

export interface GmailNotificationItem {
  id: string;
  threadId: string;
  sender: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  snippet: string;
  dateStr: string;
  timestamp: number;
  isUnread: boolean;
  isImportant: boolean;
  labels: string[];
  category: GmailCategory;
  bodyPreview?: string;
  hasAttachments?: boolean;
  detectedMeeting?: DetectedMeetingInfo;
}

export type GmailScanFilter = 'all' | 'unread' | 'updates' | 'alerts' | 'calendar';

