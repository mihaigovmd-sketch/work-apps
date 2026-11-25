import { formatDateDayMonthYear } from './dateTemplates';
import { DailyTaskItem, ReminderNote, CalendarEventItem } from '../types';

export const ROOT_FOLDER_NAME = 'Daily Notes';

/**
 * Returns the folder name for a specific day, explicitly containing the date, month, and year.
 * Example for 2026-09-22: "22 September 2026"
 */
export function getDayFolderName(dateKey: string): string {
  const info = formatDateDayMonthYear(dateKey);
  const dayStr = String(info.day).padStart(2, '0');
  return `${dayStr} ${info.monthName} ${info.year}`;
}

/**
 * Returns alternate acceptable names for the day folder for robust search matching
 * (e.g., "22-09-2026", "2026-09-22", "22 September 2026 (22-09-2026)")
 */
export function getDayFolderAlternativeNames(dateKey: string): string[] {
  const info = formatDateDayMonthYear(dateKey);
  const dayStr = String(info.day).padStart(2, '0');
  const monthStr = String(info.monthNumber).padStart(2, '0');
  return [
    `${dayStr} ${info.monthName} ${info.year}`,
    `${dayStr}-${monthStr}-${info.year}`,
    dateKey, // YYYY-MM-DD
    `${dayStr} ${info.monthName} ${info.year} (${dayStr}-${monthStr}-${info.year})`,
  ];
}

/**
 * Returns the unified single file name for a specific day.
 * Example for 2026-09-22: "22_September_2026_Daily_Record.md"
 */
export function getUnifiedFileName(dateKey: string): string {
  const info = formatDateDayMonthYear(dateKey);
  const dayStr = String(info.day).padStart(2, '0');
  return `${dayStr}_${info.monthName}_${info.year}_Daily_Record.md`;
}

export interface BuildUnifiedParams {
  dateKey: string;
  noteContent: string;
  tasks: DailyTaskItem[];
  reminders: ReminderNote[];
  calendarEvents?: CalendarEventItem[];
}

/**
 * Combines all daily items (notes, tasks, calendar events, reminders) into ONE comprehensive file
 * with an embedded machine-readable data block for 100% state recovery.
 */
export function buildUnifiedDailyFileContent(params: BuildUnifiedParams): string {
  const info = formatDateDayMonthYear(params.dateKey);
  const dayFolderName = getDayFolderName(params.dateKey);

  // Filter tasks belonging to this day (or general unassigned)
  const dayTasks = params.tasks.filter((t) => t.date === params.dateKey || !t.date);

  // Tasks section
  let tasksBlock = '';
  if (dayTasks.length > 0) {
    tasksBlock = dayTasks
      .map((t) => {
        const check = t.completed ? '[x]' : '[ ]';
        const timeBadge = t.time ? ` *(⏰ ${t.time})*` : '';
        const priorityBadge = t.priority === 'high' ? ' 🔥' : '';
        return `- ${check} ${t.text}${timeBadge}${priorityBadge}`;
      })
      .join('\n');
  } else {
    tasksBlock = '_No specific daily tasks recorded for this date._';
  }

  // Calendar agenda section
  let calendarBlock = '';
  if (params.calendarEvents && params.calendarEvents.length > 0) {
    calendarBlock = params.calendarEvents
      .map((ev) => {
        const startTime = ev.start?.dateTime
          ? new Date(ev.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : 'All Day';
        const endTime = ev.end?.dateTime
          ? ` - ${new Date(ev.end.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
          : '';
        const link = ev.htmlLink ? ` [Open ↗](${ev.htmlLink})` : '';
        return `- **${startTime}${endTime}**: ${ev.summary}${link}`;
      })
      .join('\n');
  } else {
    calendarBlock = '_No calendar events scheduled for this day._';
  }

  // Reminders section
  let remindersBlock = '';
  const activeReminders = params.reminders.filter((r) => !r.isCompleted);
  if (activeReminders.length > 0) {
    remindersBlock = activeReminders
      .map((r) => {
        const pin = r.isPinned ? '📌 ' : '• ';
        const due = r.dueDate ? ` *(Due: ${r.dueDate})*` : '';
        return `${pin}**${r.title}**${due}: ${r.content}`;
      })
      .join('\n');
  } else {
    remindersBlock = '_No active reminders._';
  }

  // Pure note content (strip any prior embedded snapshot if user pasted it)
  const cleanNoteContent = params.noteContent
    .replace(/<!-- UNIFIED_DAILY_DATA_START[\s\S]*?UNIFIED_DAILY_DATA_END -->/g, '')
    .trim();

  // Machine-readable payload embedded at the end
  const embeddedData = {
    version: 2,
    appName: 'Daily Notes & Calendar',
    dateKey: params.dateKey,
    day: info.day,
    monthName: info.monthName,
    monthNumber: info.monthNumber,
    year: info.year,
    formattedDate: info.formattedLong,
    folderPath: `${ROOT_FOLDER_NAME} / ${dayFolderName}`,
    noteContent: cleanNoteContent,
    tasks: dayTasks,
    reminders: params.reminders,
    calendarEvents: (params.calendarEvents || []).map((e) => ({
      id: e.id,
      summary: e.summary,
      start: e.start?.dateTime || e.start?.date,
      end: e.end?.dateTime || e.end?.date,
      htmlLink: e.htmlLink,
    })),
    syncedAt: new Date().toISOString(),
  };

  return `# ☀️ ${info.formattedLong} • ${info.formattedNumeric}
> 📁 **Location**: Google Drive / ${ROOT_FOLDER_NAME} / ${dayFolderName}
> 📄 **Unified Daily File**: ${getUnifiedFileName(params.dateKey)}
> 🕒 **Last Saved**: ${new Date().toLocaleTimeString()}

---

## 📝 Daily Notes & Journal
${cleanNoteContent || '_Empty note_'}

---

## 🎯 Daily Tasks & What I Did Daily
${tasksBlock}

---

## 📅 Scheduled Google Calendar Agenda
${calendarBlock}

---

## 📌 Reminders & Action Items
${remindersBlock}

---
<!-- UNIFIED_DAILY_DATA_START
${JSON.stringify(embeddedData, null, 2)}
UNIFIED_DAILY_DATA_END -->
`;
}

export interface ParsedUnifiedContent {
  noteContent: string;
  tasks?: DailyTaskItem[];
  reminders?: ReminderNote[];
  embeddedData?: any;
}

/**
 * Parses a daily file from Google Drive.
 * If it has the embedded data block, unpacks the true user note content and daily tasks.
 * If legacy plain markdown, safely loads it as noteContent.
 */
export function parseUnifiedDailyFileContent(rawText: string): ParsedUnifiedContent {
  const match = rawText.match(/<!-- UNIFIED_DAILY_DATA_START([\s\S]*?)UNIFIED_DAILY_DATA_END -->/);
  if (match && match[1]) {
    try {
      const data = JSON.parse(match[1].trim());
      return {
        noteContent: typeof data.noteContent === 'string' ? data.noteContent : '',
        tasks: Array.isArray(data.tasks) ? data.tasks : undefined,
        reminders: Array.isArray(data.reminders) ? data.reminders : undefined,
        embeddedData: data,
      };
    } catch (err) {
      console.warn('Failed to parse embedded unified JSON block:', err);
    }
  }

  // Fallback: If it's a unified file without parseable JSON or legacy format
  // If it starts with "# ☀️", try to extract the "## 📝 Daily Notes & Journal" section
  if (rawText.includes('## 📝 Daily Notes & Journal')) {
    const afterHeading = rawText.split('## 📝 Daily Notes & Journal')[1] || '';
    const beforeNext = afterHeading.split('\n---\n')[0] || afterHeading.split('## 🎯')[0] || afterHeading;
    const cleanContent = beforeNext.replace(/<!--[\s\S]*?-->/g, '').trim();
    if (cleanContent && cleanContent !== '_Empty note_') {
      return {
        noteContent: cleanContent,
      };
    }
  }

  // Complete raw fallback
  const clean = rawText
    .replace(/<!-- UNIFIED_DAILY_DATA_START[\s\S]*?UNIFIED_DAILY_DATA_END -->/g, '')
    .trim();

  return {
    noteContent: clean,
  };
}
