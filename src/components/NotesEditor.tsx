import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Save,
  ExternalLink,
  CheckCircle,
  Clock,
  ListTodo,
  Heading,
  CalendarDays,
  Sparkles,
  FileText,
  FileCheck2,
  Sun,
  CalendarPlus,
  ShieldCheck,
  Folder,
  Mic,
  MicOff,
  Square,
  Languages,
  AlertCircle,
  Radio,
} from 'lucide-react';
import { useVoiceDictation } from '../hooks/useVoiceDictation';
import { CalendarEventItem, DayFolderInfo } from '../types';
import { formatDateDayMonthYear, createFreshMorningNoteContent } from '../utils/dateTemplates';
import { getDayFolderName, getUnifiedFileName, ROOT_FOLDER_NAME } from '../utils/unifiedStorage';

interface NotesEditorProps {
  currentDate: string; // YYYY-MM-DD
  content: string;
  onChange: (newContent: string) => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
  isDirty: boolean;
  lastSavedAt: Date | null;
  driveWebViewLink?: string;
  dayFolderInfo?: DayFolderInfo | null;
  todayEvents: CalendarEventItem[];
  onScheduleInCalendar?: (data?: {
    summary?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    description?: string;
    addGoogleMeet?: boolean;
  }) => void;
}

const DICTATION_LANGUAGES = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'ro-RO', name: 'Română (Romanian)' },
  { code: 'en-GB', name: 'English (UK)' },
  { code: 'es-ES', name: 'Español' },
  { code: 'fr-FR', name: 'Français' },
  { code: 'de-DE', name: 'Deutsch' },
  { code: 'it-IT', name: 'Italiano' },
];

export const NotesEditor: React.FC<NotesEditorProps> = ({
  currentDate,
  content,
  onChange,
  onSave,
  isSaving,
  isDirty,
  lastSavedAt,
  driveWebViewLink,
  dayFolderInfo,
  todayEvents,
  onScheduleInCalendar,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [dictationMode, setDictationMode] = useState<'text' | 'task'>('text');

  // Formatted date strictly in Day, Month, Year format
  const dateInfo = useMemo(() => formatDateDayMonthYear(currentDate), [currentDate]);
  const formattedDayTitle = `${dateInfo.formattedLong}`;
  const formattedDateCode = dateInfo.formattedNumeric; // Day/Month/Year e.g. 22/09/2026

  // Voice Dictation (Microphone on hand)
  const handleVoiceTranscript = (text: string, isFinal: boolean) => {
    if (isFinal && text.trim()) {
      const textarea = textareaRef.current;
      const formatted = dictationMode === 'task' ? `\n- [ ] ${text.trim()}\n` : `${text.trim()} `;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const currentContent = textarea.value;
        const newContent =
          currentContent.substring(0, start) + formatted + currentContent.substring(end);
        onChange(newContent);
        setTimeout(() => {
          if (textarea) {
            textarea.selectionStart = textarea.selectionEnd = start + formatted.length;
          }
        }, 10);
      } else {
        onChange(content ? `${content} ${formatted}` : formatted);
      }
    }
  };

  const {
    isSupported: isVoiceSupported,
    isListening,
    interimText,
    error: voiceError,
    clearError: clearVoiceError,
    selectedLang,
    setSelectedLang,
    toggleListening,
    stopListening,
  } = useVoiceDictation({
    onTranscript: handleVoiceTranscript,
  });

  // Calculate word and character count
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  const insertTextAtCursor = (textToInsert: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(content + textToInsert);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent = content.substring(0, start) + textToInsert + content.substring(end);
    onChange(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + textToInsert.length;
    }, 10);
  };

  const handleInsertTimestamp = () => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    insertTextAtCursor(`\n**[${timeStr}]** `);
  };

  const handleInsertChecklist = () => {
    insertTextAtCursor(`\n- [ ] `);
  };

  const handleInsertHeading = () => {
    insertTextAtCursor(`\n\n### New Section\n`);
  };

  const handleScheduleSelectedTask = () => {
    if (!onScheduleInCalendar) return;

    const textarea = textareaRef.current;
    let selectedText = '';
    if (textarea) {
      selectedText = content.substring(textarea.selectionStart, textarea.selectionEnd).trim();
    }

    // Use selection if present, otherwise inspect current cursor line + surrounding block (or full note)
    let contextText = selectedText;
    if (!contextText && textarea) {
      const cursorPos = textarea.selectionStart || 0;
      const before = content.slice(Math.max(0, cursorPos - 400), cursorPos);
      const after = content.slice(cursorPos, Math.min(content.length, cursorPos + 400));
      contextText = (before + after).trim();
    }
    if (!contextText) {
      contextText = content.trim();
    }

    // Detect meeting link (Google Meet, Zoom, Teams)
    const linkMatch = contextText.match(
      /https:\/\/(?:meet\.google\.com\/[a-z-]+|[a-z0-9.-]*zoom\.us\/j\/[^\s]+|teams\.microsoft\.com\/l\/meetup-join\/[^\s]+)/i
    );
    const detectedLink = linkMatch ? linkMatch[0] : undefined;

    // Detect date (YYYY-MM-DD or "tomorrow")
    let detectedDate = currentDate;
    const isoMatch = contextText.match(/\b(202\d-\d{2}-\d{2})\b/);
    if (isoMatch) {
      detectedDate = isoMatch[1];
    } else if (/\btomorrow\b/i.test(contextText)) {
      const d = new Date(`${currentDate}T12:00:00`);
      d.setDate(d.getDate() + 1);
      detectedDate = d.toISOString().split('T')[0];
    }

    // Detect time (e.g. 11:00, 11:00 AM, 2:30 PM)
    let startTime: string | undefined;
    let endTime: string | undefined;
    const timeMatch =
      contextText.match(/\b(\d{1,2}):(\d{2})\s*(am|pm)?\b/i) ||
      contextText.match(/\b(\d{1,2})\s*(am|pm)\b/i);
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      const m = timeMatch[2] && /^\d{2}$/.test(timeMatch[2]) ? parseInt(timeMatch[2], 10) : 0;
      const ampm = (
        timeMatch[3] || (timeMatch[2] && /^(am|pm)$/i.test(timeMatch[2]) ? timeMatch[2] : '')
      ).toLowerCase();
      if (ampm === 'pm' && h < 12) h += 12;
      if (ampm === 'am' && h === 12) h = 0;
      h = Math.max(0, Math.min(23, h));
      startTime = `${String(h).padStart(2, '0')}:${String(Math.min(59, m)).padStart(2, '0')}`;
      const endMins = h * 60 + Math.min(59, m) + 30;
      const endH = Math.floor((endMins % (24 * 60)) / 60);
      const endM = endMins % 60;
      endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    }

    // Derive clean summary
    let cleanSummary = selectedText
      .replace(/^[-*]\s*\[[\sxX]\]\s*/, '')
      .replace(/https?:\/\/\S+/gi, '')
      .trim();
    if (!cleanSummary && detectedLink) {
      cleanSummary = 'Google Meet Call';
    } else if (cleanSummary.length > 80) {
      cleanSummary = cleanSummary.split('\n')[0].slice(0, 80).trim();
    }

    onScheduleInCalendar({
      summary: cleanSummary || undefined,
      date: detectedDate,
      startTime,
      endTime,
      location: detectedLink,
      description: detectedLink ? `Meeting Link: ${detectedLink}\n\n${selectedText}` : selectedText || undefined,
      addGoogleMeet: detectedLink ? false : true,
    });
  };

  const handleInsertFreshMorningTemplate = () => {
    const freshTemplate = createFreshMorningNoteContent(currentDate);
    onChange(freshTemplate);
  };

  const handleInsertCalendarSchedule = () => {
    if (todayEvents.length === 0) {
      insertTextAtCursor(`\n\n### 📅 Schedule (${currentDate})\n*No meetings or appointments scheduled for this day.*\n`);
      return;
    }

    const lines = todayEvents.map((evt) => {
      let timeStr = 'All Day';
      if (evt.start.dateTime) {
        const start = new Date(evt.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const end = evt.end.dateTime
          ? new Date(evt.end.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '';
        timeStr = end ? `${start} - ${end}` : start;
      }
      let details = `\n- **${timeStr}**: ${evt.summary}`;
      if (evt.location) details += ` *(📍 ${evt.location})*`;
      if (evt.hangoutLink) details += ` [Video Link](${evt.hangoutLink})`;
      return details;
    });

    const snippet = `\n\n### 📅 Today's Meetings & Appointments\n${lines.join('')}\n\n#### Meeting Notes:\n- \n`;
    insertTextAtCursor(snippet);
  };

  const handleApplyTemplate = (templateType: 'daily' | 'meetings' | 'bullet') => {
    let template = '';
    if (templateType === 'daily') {
      template = `# Daily Log — ${formattedDayTitle}\n\n## 🎯 Top Priorities\n- [ ] Priority 1\n- [ ] Priority 2\n- [ ] Priority 3\n\n## 📅 Meetings & Appointments\n${
        todayEvents.length > 0
          ? todayEvents
              .map((e) => {
                const time = e.start.dateTime
                  ? new Date(e.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'All day';
                return `- **${time}**: ${e.summary}\n  - Key notes: \n`;
              })
              .join('')
          : '- *No scheduled meetings*\n'
      }\n## 📝 Daily Notes & Ideas\n- \n\n## ✨ End of Day Reflection\n- Wins:\n- Tomorrow's focus:\n`;
    } else if (templateType === 'meetings') {
      template = `# Meeting Minutes & Notes — ${formattedDayTitle}\n\n${
        todayEvents.length > 0
          ? todayEvents
              .map(
                (e) =>
                  `### 📌 ${e.summary}\n- **Time**: ${
                    e.start.dateTime
                      ? new Date(e.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : 'All day'
                  }\n- **Location/Link**: ${e.location || e.hangoutLink || 'N/A'}\n- **Attendees**: ${
                    e.attendees?.map((a) => a.displayName || a.email).join(', ') || 'Self'
                  }\n- **Discussion & Decisions**:\n  - \n- **Action Items**:\n  - [ ] \n\n`
              )
              .join('')
          : '### 📌 Meeting Title\n- **Attendees**:\n- **Agenda**:\n- **Action Items**:\n  - [ ] \n'
      }`;
    } else {
      template = `# Notes — ${formattedDayTitle}\n\n- [ ] \n`;
    }

    onChange(template);
  };

  return (
    <div
      id="daily-notes-editor-panel"
      className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col h-[calc(100vh-130px)] min-h-[580px] 2xl:min-h-[720px] 3xl:min-h-[850px] overflow-hidden transition-colors"
    >
      {/* Top Header of Editor */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-100/70 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 id="note-heading-title" className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                {formattedDayTitle}
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono font-medium">
                {formattedDateCode}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <div
                id="unified-drive-path-badge"
                className="inline-flex items-center gap-1.5 font-mono text-[11px] bg-slate-100 dark:bg-slate-800/90 px-2 py-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700/80 text-slate-600 dark:text-slate-300"
                title={`Drive: ${ROOT_FOLDER_NAME} / ${dayFolderInfo?.folderName || getDayFolderName(currentDate)} / ${getUnifiedFileName(currentDate)}`}
              >
                <Folder className="w-3 h-3 text-amber-500 shrink-0" />
                <span>{ROOT_FOLDER_NAME}</span>
                <span className="text-slate-400 dark:text-slate-600">/</span>
                <span className="text-amber-700 dark:text-amber-300 font-semibold">
                  {dayFolderInfo?.folderName || getDayFolderName(currentDate)}
                </span>
                <span className="text-slate-400 dark:text-slate-600">/</span>
                <span className="text-indigo-700 dark:text-indigo-300 font-semibold truncate max-w-[180px] sm:max-w-none">
                  {getUnifiedFileName(currentDate)}
                </span>
              </div>

              {dayFolderInfo?.webViewLink && (
                <a
                  id="open-drive-day-folder-link"
                  href={dayFolderInfo.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 font-medium hover:underline bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded-md"
                  title="Open today's dedicated day folder in Google Drive"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Day Folder</span>
                </a>
              )}

              {driveWebViewLink && (
                <a
                  id="open-drive-file-link"
                  href={driveWebViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium hover:underline bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded-md"
                  title="Open this unified file directly in Google Drive"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>View File</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Sync Status & Save Action */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            {isSaving ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
                Saving to Google Drive...
              </span>
            ) : isDirty ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                Unsaved changes
              </span>
            ) : lastSavedAt ? (
              <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <FileCheck2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Saved to Drive ({lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
              </span>
            ) : null}
          </div>

          <button
            id="save-to-drive-btn"
            onClick={() => onSave()}
            disabled={isSaving || !isDirty}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer ${
              isDirty
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save to Drive'}</span>
          </button>
        </div>
      </div>

      {/* Editor Formatting Toolbar */}
      <div
        id="editor-toolbar"
        className="px-4 py-2 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-1.5 text-slate-600 dark:text-slate-300"
      >
        {/* Voice Dictation (Microphone on hand) */}
        <div className="relative flex items-center">
          <button
            id="btn-voice-dictate-toolbar"
            type="button"
            onClick={toggleListening}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-xs ${
              isListening
                ? 'bg-rose-600 hover:bg-rose-700 text-white ring-2 ring-rose-400 animate-pulse'
                : 'bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80'
            }`}
            title={
              isListening
                ? 'Listening to your voice... Click to Stop'
                : 'Microphone on hand: Click and speak to transcribe long notes quickly'
            }
          >
            {isListening ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop Listening</span>
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>Dictate (Voice)</span>
              </>
            )}
          </button>

          {/* Dictation Language Selector */}
          <div className="relative ml-0.5">
            <button
              id="btn-dictation-lang"
              type="button"
              onClick={() => setShowLanguagePicker(!showLanguagePicker)}
              className="p-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
              title={`Speech Language: ${DICTATION_LANGUAGES.find((l) => l.code === selectedLang)?.name || selectedLang}. Click to change.`}
            >
              <Languages className="w-3.5 h-3.5" />
            </button>

            {showLanguagePicker && (
              <div
                id="voice-lang-dropdown"
                className="absolute left-0 mt-1 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-30 py-1 text-xs"
              >
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-700">
                  Dictation Language
                </div>
                {DICTATION_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => {
                      setSelectedLang(lang.code);
                      setShowLanguagePicker(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-750 cursor-pointer ${
                      selectedLang === lang.code
                        ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                        : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <span>{lang.name}</span>
                    {selectedLang === lang.code && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-750 mx-1"></div>

        {/* Fresh Morning Note Button */}
        <button
          id="btn-fresh-morning-note"
          type="button"
          onClick={handleInsertFreshMorningTemplate}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800/80 rounded-lg transition-colors cursor-pointer shadow-2xs"
          title={`Start fresh morning note with header: ${formattedDayTitle} (${formattedDateCode})`}
        >
          <Sun className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>Fresh Morning Note</span>
          <span className="text-[10px] font-mono text-amber-700/80 dark:text-amber-300/80 font-normal">
            ({formattedDateCode})
          </span>
        </button>

        {/* Schedule in Calendar Button */}
        {onScheduleInCalendar && (
          <button
            id="btn-schedule-note-task"
            type="button"
            onClick={handleScheduleSelectedTask}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors cursor-pointer border border-blue-200/70 dark:border-blue-800/70"
            title="Schedule selected task or appointment directly into Google Calendar"
          >
            <CalendarPlus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Make in Calendar</span>
          </button>
        )}

        <button
          id="insert-meeting-schedule-btn"
          type="button"
          onClick={handleInsertCalendarSchedule}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/50 rounded-lg transition-colors cursor-pointer border border-slate-200/60 dark:border-slate-700/60"
          title="Insert today's meetings from Google Calendar into note"
        >
          <CalendarDays className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Insert Calendar Schedule</span>
        </button>

        <button
          id="insert-todo-btn"
          type="button"
          onClick={handleInsertChecklist}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          title="Insert to-do item"
        >
          <ListTodo className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Task</span>
        </button>

        <button
          id="insert-heading-btn"
          type="button"
          onClick={handleInsertHeading}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          title="Insert section heading"
        >
          <Heading className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
          <span>Section</span>
        </button>

        <button
          id="insert-time-btn"
          type="button"
          onClick={handleInsertTimestamp}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          title="Insert current timestamp"
        >
          <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>Timestamp</span>
        </button>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-750 mx-1 hidden sm:block"></div>

        {/* Template Quick Actions if empty */}
        {content.trim().length === 0 && (
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-slate-400 dark:text-slate-500 mr-1 hidden sm:inline">Templates:</span>
            <button
              id="template-daily-btn"
              type="button"
              onClick={handleInsertFreshMorningTemplate}
              className="text-xs px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-md transition-colors shadow-2xs"
            >
              🌅 Morning Note
            </button>
            <button
              id="template-meetings-btn"
              type="button"
              onClick={() => handleApplyTemplate('meetings')}
              className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md transition-colors"
            >
              Meeting Notes
            </button>
          </div>
        )}
      </div>

      {/* Voice Error Banner */}
      {voiceError && (
        <div className="mx-4 mt-2 p-2.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs rounded-xl flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{voiceError}</span>
          </div>
          <button
            type="button"
            onClick={clearVoiceError}
            className="text-xs text-rose-600 hover:underline font-semibold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Textarea */}
      <div className="flex-1 relative p-4 sm:p-6 overflow-y-auto">
        <textarea
          id="daily-note-textarea"
          ref={textareaRef}
          value={content}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Write your daily notes, meeting records, or task list for ${formattedDayTitle}...\n\nTips:\n- Click "Dictate (Voice)" or the floating microphone button to transcribe long thoughts by voice.\n- Click "Insert Calendar Schedule" above to link today's appointments.\n- Notes are automatically synchronized to your Google Drive folder.`}
          className="w-full h-full min-h-[350px] 2xl:min-h-[480px] 3xl:min-h-[600px] resize-none border-0 focus:outline-hidden focus:ring-0 text-slate-800 dark:text-slate-100 text-sm sm:text-base 2xl:text-lg leading-relaxed font-sans placeholder:text-slate-300 dark:placeholder:text-slate-600 bg-transparent pb-16"
          spellCheck={true}
        />

        {/* Floating Microphone on hand inside note editor */}
        <div className="absolute bottom-5 right-5 z-20 flex items-center gap-2">
          {isListening && (
            <div
              id="live-transcription-pill"
              className="bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white px-3.5 py-2 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2"
            >
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              </span>
              <div className="max-w-[200px] sm:max-w-[320px]">
                <p className="text-[10px] uppercase font-bold tracking-wider text-rose-400">
                  Transcribing Voice ({DICTATION_LANGUAGES.find((l) => l.code === selectedLang)?.name || selectedLang})
                </p>
                <p className="text-xs font-sans text-slate-100 truncate italic">
                  {interimText ? `"${interimText}"` : 'Listening... Speak clearly'}
                </p>
              </div>
              <button
                type="button"
                onClick={stopListening}
                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0"
              >
                Done
              </button>
            </div>
          )}

          <button
            id="btn-floating-mic"
            type="button"
            onClick={toggleListening}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-full shadow-lg transition-all duration-200 cursor-pointer group select-none ${
              isListening
                ? 'bg-rose-600 hover:bg-rose-700 text-white ring-4 ring-rose-400/50 scale-105 animate-pulse'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:scale-105 shadow-indigo-300 dark:shadow-none'
            }`}
            title={
              isListening
                ? 'Listening to your voice... Click to Stop'
                : 'Microphone on hand: Click and speak to transcribe long notes quickly'
            }
          >
            {isListening ? (
              <>
                <Square className="w-4 h-4 fill-current" />
                <span className="text-xs font-semibold hidden sm:inline">Stop Dictation</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold hidden sm:inline">Speak &amp; Transcribe</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Bottom Status & Info Bar */}
      <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-4">
          <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
          <span>{charCount} characters</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
          <span>Google Drive Markdown format</span>
        </div>
      </div>
    </div>
  );
};
