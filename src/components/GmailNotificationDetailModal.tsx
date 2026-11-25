import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Calendar,
  CalendarCheck,
  CheckSquare,
  FileText,
  ExternalLink,
  Check,
  AlertTriangle,
  Clock,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  Inbox,
  MapPin,
  Users,
  Video,
  CheckCircle2,
} from 'lucide-react';
import { GmailNotificationItem } from '../types';
import { fetchGmailMessageDetail, markGmailAsRead } from '../services/gmail';

interface GmailNotificationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  notification: GmailNotificationItem | null;
  token: string | null;
  onInsertIntoNote: (text: string) => void;
  onConvertToTask: (taskText: string) => void;
  onScheduleInCalendar: (data: {
    summary: string;
    description: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    attendeesEmails?: string[];
    addGoogleMeet?: boolean;
    gmailMessageId?: string;
  }) => void;
  onMarkedAsRead?: (id: string) => void;
  onNavigateNext?: () => void;
  onNavigatePrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
  isAttachedToCalendar?: boolean;
  onOpenMeetingsChooser?: () => void;
}

export const GmailNotificationDetailModal: React.FC<GmailNotificationDetailModalProps> = ({
  isOpen,
  onClose,
  notification,
  token,
  onInsertIntoNote,
  onConvertToTask,
  onScheduleInCalendar,
  onMarkedAsRead,
  onNavigateNext,
  onNavigatePrev,
  hasNext = false,
  hasPrev = false,
  isAttachedToCalendar = false,
  onOpenMeetingsChooser,
}) => {
  const [fullDetail, setFullDetail] = useState<{
    bodyText: string;
    bodyHtml?: string;
    gmailLink: string;
  } | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const [hasMarkedRead, setHasMarkedRead] = useState(false);
  const [copiedFeedback, setCopiedFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !notification) {
      setFullDetail(null);
      setHasMarkedRead(false);
      return;
    }

    setHasMarkedRead(!notification.isUnread);

    // If we have token and it's not a sample ID, fetch full message body
    if (token && !notification.id.startsWith('sample-')) {
      setIsLoadingDetail(true);
      fetchGmailMessageDetail(token, notification.id)
        .then((detail) => {
          setFullDetail({
            bodyText: detail.bodyText,
            bodyHtml: detail.bodyHtml,
            gmailLink: detail.gmailLink,
          });
        })
        .catch((err) => {
          console.warn('Could not load full message details:', err);
          setFullDetail({
            bodyText: notification.bodyPreview || notification.snippet,
            gmailLink: `https://mail.google.com/mail/u/0/#inbox/${notification.id}`,
          });
        })
        .finally(() => {
          setIsLoadingDetail(false);
        });
    } else {
      setFullDetail({
        bodyText: notification.bodyPreview || notification.snippet,
        gmailLink: `https://mail.google.com/mail/u/0/#inbox/${notification.id}`,
      });
      setIsLoadingDetail(false);
    }
  }, [isOpen, notification?.id, token]);

  if (!isOpen || !notification) return null;

  const handleMarkAsRead = async () => {
    if (hasMarkedRead) return;
    setIsMarkingRead(true);
    if (token && !notification.id.startsWith('sample-')) {
      await markGmailAsRead(token, notification.id);
    }
    setIsMarkingRead(false);
    setHasMarkedRead(true);
    if (onMarkedAsRead) {
      onMarkedAsRead(notification.id);
    }
    showActionToast('Marked as read');
  };

  const showActionToast = (msg: string) => {
    setCopiedFeedback(msg);
    setTimeout(() => {
      setCopiedFeedback((curr) => (curr === msg ? null : curr));
    }, 2500);
  };

  const handleAddNote = () => {
    const formatted = `\n\n### 📧 Gmail: ${notification.subject}\n- **From:** ${notification.senderName} (${notification.senderEmail || notification.sender})\n- **Date:** ${notification.dateStr}\n\n> ${notification.snippet || notification.bodyPreview || ''}\n`;
    onInsertIntoNote(formatted);
    showActionToast('Inserted into today’s note');
  };

  const handleCreateTask = () => {
    const taskTitle = `Follow up: ${notification.subject} (${notification.senderName})`;
    onConvertToTask(taskTitle);
    showActionToast('Added to Daily Tasks');
  };

  const handleScheduleMeeting = () => {
    const m = notification.detectedMeeting;
    onScheduleInCalendar({
      summary: m?.title || notification.subject,
      date: m?.date,
      startTime: m?.startTime,
      endTime: m?.endTime,
      location: m?.location,
      attendeesEmails: m?.attendeesEmails,
      addGoogleMeet: m ? !m.meetingLink : true,
      gmailMessageId: notification.id,
      description: `From: ${notification.senderName} (${notification.senderEmail})\n\n${notification.snippet || fullDetail?.bodyText || ''}\n\nGmail Link: ${fullDetail?.gmailLink || ''}`,
    });
    onClose();
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'alerts':
        return 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      case 'calendar':
        return 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
      case 'updates':
        return 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      default:
        return 'bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    }
  };

  return (
    <div
      id="gmail-notification-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        id="gmail-notification-modal-card"
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-950/70 text-red-600 dark:text-red-400 flex items-center justify-center shadow-xs">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  Gmail Notification
                </span>
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getCategoryColor(
                    notification.category
                  )}`}
                >
                  {notification.category}
                </span>
                {notification.isImportant && (
                  <span className="text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                    Important
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Scanned automatically from your Google Workspace Gmail
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {hasPrev && onNavigatePrev && (
              <button
                type="button"
                onClick={onNavigatePrev}
                title="Previous Notification"
                className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            {hasNext && onNavigateNext && (
              <button
                type="button"
                onClick={onNavigateNext}
                title="Next Notification"
                className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
            <button
              id="btn-close-notification-modal"
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-slate-800 dark:text-slate-200">
          {/* Email Subject */}
          <div className="border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 leading-snug">
              {notification.subject}
            </h2>
          </div>

          {/* Sender & Meta details */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/70 dark:border-slate-700/60 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                {notification.senderName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  {notification.senderName}
                </p>
                {notification.senderEmail && (
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                    {notification.senderEmail}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px] sm:self-center">
              <Clock className="w-3.5 h-3.5" />
              <span>{notification.dateStr}</span>
            </div>
          </div>

          {/* Action Feedback pill if just copied/added */}
          {copiedFeedback && (
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{copiedFeedback}</span>
            </div>
          )}

          {/* Detected Meeting Arrangement Card */}
          {notification.detectedMeeting && (
            <div
              className={`p-3.5 rounded-2xl border space-y-2.5 ${
                isAttachedToCalendar
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                  : 'bg-indigo-50/80 dark:bg-indigo-950/35 border-indigo-200 dark:border-indigo-800'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CalendarCheck
                    className={`w-4 h-4 ${
                      isAttachedToCalendar
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-indigo-600 dark:text-indigo-400'
                    }`}
                  />
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {isAttachedToCalendar
                      ? 'Meeting Attached to Google Calendar'
                      : 'Meeting Arrangement Detected'}
                  </span>
                </div>

                {isAttachedToCalendar ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2.5 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    Attached
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    {onOpenMeetingsChooser && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenMeetingsChooser();
                        }}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 rounded-lg cursor-pointer"
                      >
                        Review All Meetings
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleScheduleMeeting}
                      className="inline-flex items-center gap-1 px-3 py-1 text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs cursor-pointer"
                    >
                      <Calendar className="w-3 h-3" />
                      Attach to Calendar
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>
                    <strong>{notification.detectedMeeting.date}</strong> •{' '}
                    {notification.detectedMeeting.startTime} –{' '}
                    {notification.detectedMeeting.endTime}
                  </span>
                </div>
                {notification.detectedMeeting.location && (
                  <div className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="truncate">{notification.detectedMeeting.location}</span>
                  </div>
                )}
                {notification.detectedMeeting.attendeesEmails &&
                  notification.detectedMeeting.attendeesEmails.length > 0 && (
                    <div className="flex items-center gap-1.5 sm:col-span-2">
                      <Users className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="truncate">
                        Attendees: {notification.detectedMeeting.attendeesEmails.join(', ')}
                      </span>
                    </div>
                  )}
              </div>
            </div>
          )}

          {/* Message Content Preview */}
          <div className="mt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Notification Message Details
              </span>
              {fullDetail?.gmailLink && (
                <a
                  href={fullDetail.gmailLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                >
                  <span>Open in Gmail</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl font-sans text-xs sm:text-sm leading-relaxed whitespace-pre-wrap select-text break-words min-h-[140px]">
              {isLoadingDetail ? (
                <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
                  <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>Retrieving complete email body from Gmail...</span>
                </div>
              ) : fullDetail?.bodyText ? (
                fullDetail.bodyText
              ) : (
                notification.snippet || '(Empty message body)'
              )}
            </div>
          </div>
        </div>

        {/* Footer Quick Action Toolbar */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-850/90 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Add to Daily Note */}
            <button
              id="btn-notif-insert-note"
              type="button"
              onClick={handleAddNote}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-800 rounded-xl shadow-xs transition-colors cursor-pointer"
              title="Append this email notification summary to today's active note"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Add to Today's Note</span>
            </button>

            {/* Convert to Daily Task */}
            <button
              id="btn-notif-create-task"
              type="button"
              onClick={handleCreateTask}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-800 rounded-xl shadow-xs transition-colors cursor-pointer"
              title="Add this notification to your What I do daily task list"
            >
              <CheckSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Create Task</span>
            </button>

            {/* Schedule / Attach in Calendar */}
            <button
              id="btn-notif-schedule-calendar"
              type="button"
              onClick={handleScheduleMeeting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-800 rounded-xl shadow-xs transition-colors cursor-pointer"
              title="Attach or schedule an event in Google Calendar for this email"
            >
              <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>{notification.detectedMeeting ? 'Attach / Edit in Calendar' : 'Schedule Event'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {!hasMarkedRead && (
              <button
                id="btn-notif-mark-read"
                type="button"
                onClick={handleMarkAsRead}
                disabled={isMarkingRead}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-200/80 dark:bg-slate-750 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isMarkingRead ? 'Marking...' : 'Mark Read'}</span>
              </button>
            )}

            <button
              id="btn-notif-done"
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
