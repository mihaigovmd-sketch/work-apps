import React, { useState } from 'react';
import {
  Mail,
  RefreshCw,
  Bell,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  FileText,
  CheckSquare,
  Calendar,
  CalendarCheck,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Inbox,
  Filter,
  Eye,
  Check,
  Clock,
} from 'lucide-react';
import { GmailNotificationItem, GmailScanFilter } from '../types';

interface GmailNotificationsPanelProps {
  notifications: GmailNotificationItem[];
  isScanning: boolean;
  onScan: (filter?: GmailScanFilter) => void;
  lastScannedTime: Date | null;
  onSelectNotification: (item: GmailNotificationItem) => void;
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
  onMarkAsRead: (id: string) => void;
  isGuestMode?: boolean;
  onAuthorizeGmail?: () => void;
  autoOpenEnabled: boolean;
  onToggleAutoOpen: (enabled: boolean) => void;
  attachedMeetingsMap?: Record<string, string>;
  onOpenMeetingsChooser?: () => void;
}

export const GmailNotificationsPanel: React.FC<GmailNotificationsPanelProps> = ({
  notifications,
  isScanning,
  onScan,
  lastScannedTime,
  onSelectNotification,
  onInsertIntoNote,
  onConvertToTask,
  onScheduleInCalendar,
  onMarkAsRead,
  isGuestMode = false,
  onAuthorizeGmail,
  autoOpenEnabled,
  onToggleAutoOpen,
  attachedMeetingsMap = {},
  onOpenMeetingsChooser,
}) => {
  const [filter, setFilter] = useState<GmailScanFilter>('unread');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const unreadCount = notifications.filter((n) => n.isUnread).length;
  const detectedMeetingsCount = notifications.filter((n) => Boolean(n.detectedMeeting)).length;
  const pendingMeetingsCount = notifications.filter(
    (n) => Boolean(n.detectedMeeting) && !attachedMeetingsMap[n.id]
  ).length;

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return n.isUnread;
    if (filter === 'updates') return n.category === 'updates';
    if (filter === 'alerts') return n.category === 'alerts';
    if (filter === 'calendar') return n.category === 'calendar';
    return true; // 'all'
  });

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'alerts':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <ShieldAlert className="w-3 h-3" />
            Alert
          </span>
        );
      case 'calendar':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            <Calendar className="w-3 h-3" />
            Calendar
          </span>
        );
      case 'updates':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <Sparkles className="w-3 h-3" />
            Update
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <Mail className="w-3 h-3" />
            Direct
          </span>
        );
    }
  };

  return (
    <section
      id="gmail-notifications-channel-panel"
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-300"
    >
      {/* Top Bar / Channel Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-4 sm:px-6 py-3.5 bg-gradient-to-r from-red-50/70 via-indigo-50/50 to-purple-50/50 dark:from-red-950/30 dark:via-indigo-950/20 dark:to-purple-950/20 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-xs">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm tracking-tight">
                  Gmail &amp; Notifications Channel
                </h3>
                {unreadCount > 0 ? (
                  <span className="bg-red-600 text-white font-bold px-2 py-0.5 rounded-full text-[11px] animate-pulse">
                    {unreadCount} Unread
                  </span>
                ) : (
                  <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold px-2 py-0.5 rounded-full text-[11px]">
                    All Caught Up
                  </span>
                )}
                {isGuestMode && (
                  <span className="text-[10px] font-medium bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-1.5 py-0.2 rounded">
                    Demo Mode
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Live inbox &amp; notification monitor • Auto-opens and displays alerts for you
              </p>
            </div>
          </div>

          {/* Mobile Collapse Toggle */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="md:hidden p-1.5 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Auto-Open toggle switch */}
          <label
            title="When active, newly scanned notifications will automatically open and display for you"
            className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 bg-white/90 dark:bg-slate-800/90 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs select-none cursor-pointer"
          >
            <input
              type="checkbox"
              checked={autoOpenEnabled}
              onChange={(e) => onToggleAutoOpen(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
            />
            <span className="text-[11px] font-medium hidden sm:inline">Auto-Open on Scan</span>
            <span className="text-[11px] font-medium sm:hidden">Auto-Open</span>
          </label>

          {/* Connect / Authorize Google Account if Guest Mode */}
          {isGuestMode && onAuthorizeGmail && (
            <button
              id="btn-auth-gmail-panel"
              type="button"
              onClick={onAuthorizeGmail}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Connect Gmail</span>
            </button>
          )}

          {/* Meetings Found -> Choose & Attach Button */}
          {detectedMeetingsCount > 0 && onOpenMeetingsChooser && (
            <button
              id="btn-open-gmail-meetings-chooser"
              type="button"
              onClick={onOpenMeetingsChooser}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer border ${
                pendingMeetingsCount > 0
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600'
                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
              }`}
              title="Choose which Gmail meetings to attach to your Google Calendar"
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>
                {pendingMeetingsCount > 0
                  ? `Attach Meetings (${pendingMeetingsCount})`
                  : `Meetings Synced (${detectedMeetingsCount})`}
              </span>
            </button>
          )}

          {/* Scan Gmail Button */}
          <button
            id="btn-scan-gmail-notifications"
            type="button"
            onClick={() => onScan(filter)}
            disabled={isScanning}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-60"
            title="Scan Gmail for new notifications, calendar invitations, and alerts"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Scanning Gmail...' : 'Scan Gmail'}</span>
          </button>

          {/* Collapse/Expand for Desktop */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
            title={isCollapsed ? 'Expand Notifications Channel' : 'Collapse Notifications Channel'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Collapsible Content */}
      {!isCollapsed && (
        <div className="p-4 sm:p-5 space-y-4">
          {/* Sub-Header: Filter Pills & Scan Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800/80">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-medium text-slate-400 mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" />
                Filter:
              </span>

              {(['unread', 'all', 'alerts', 'updates', 'calendar'] as GmailScanFilter[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setFilter(tab);
                    onScan(tab);
                  }}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg capitalize transition-colors cursor-pointer ${
                    filter === tab
                      ? 'bg-red-600 text-white shadow-2xs font-semibold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {tab === 'calendar' ? 'Calendar Invites' : tab}
                </button>
              ))}
            </div>

            {/* Last scanned timestamp */}
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <span>Last scanned:</span>
              <span className="font-medium text-slate-600 dark:text-slate-300">
                {lastScannedTime ? lastScannedTime.toLocaleTimeString() : 'Not yet'}
              </span>
            </div>
          </div>

          {/* Notifications List Grid */}
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <Inbox className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No notifications in this category
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Click "Scan Gmail" to check for new alerts, unread emails, or calendar invites.
              </p>
              <button
                type="button"
                onClick={() => onScan('all')}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xs transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                Scan All Messages
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`group relative flex flex-col justify-between p-3.5 rounded-xl border transition-all duration-200 hover:shadow-md cursor-pointer ${
                    notif.isUnread
                      ? 'bg-red-50/20 dark:bg-red-950/15 border-red-200/80 dark:border-red-900/50 hover:border-red-300'
                      : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                  onClick={() => onSelectNotification(notif)}
                >
                  {/* Top card row */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0 ${
                            notif.category === 'alerts'
                              ? 'bg-rose-600'
                              : notif.category === 'calendar'
                              ? 'bg-indigo-600'
                              : 'bg-slate-600'
                          }`}
                        >
                          {notif.senderName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {notif.senderName}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {notif.dateStr}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {getCategoryBadge(notif.category)}
                        {notif.isUnread && (
                          <span
                            title="Unread"
                            className="w-2 h-2 rounded-full bg-red-600 shrink-0"
                          ></span>
                        )}
                      </div>
                    </div>

                    {/* Subject */}
                    <h4
                      className={`text-xs line-clamp-1 mb-1 ${
                        notif.isUnread
                          ? 'font-bold text-slate-900 dark:text-slate-100'
                          : 'font-medium text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {notif.subject}
                    </h4>

                    {/* Snippet */}
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {notif.snippet}
                    </p>

                    {/* Detected Meeting Arrangement Pill */}
                    {notif.detectedMeeting && (
                      <div
                        className={`mt-2.5 p-2 rounded-lg border text-[11px] flex items-center justify-between gap-2 ${
                          attachedMeetingsMap[notif.id]
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/70 text-emerald-800 dark:text-emerald-300'
                            : 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/70 text-indigo-800 dark:text-indigo-200'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span className="truncate font-medium">
                            {notif.detectedMeeting.date} • {notif.detectedMeeting.startTime}–
                            {notif.detectedMeeting.endTime}
                          </span>
                        </div>
                        {attachedMeetingsMap[notif.id] ? (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-300 shrink-0">
                            <CheckCircle2 className="w-3 h-3" />
                            Attached
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              if (onOpenMeetingsChooser) {
                                onOpenMeetingsChooser();
                              } else {
                                onScheduleInCalendar({
                                  summary: notif.detectedMeeting!.title,
                                  date: notif.detectedMeeting!.date,
                                  startTime: notif.detectedMeeting!.startTime,
                                  endTime: notif.detectedMeeting!.endTime,
                                  location: notif.detectedMeeting!.location,
                                  attendeesEmails: notif.detectedMeeting!.attendeesEmails,
                                  addGoogleMeet: !notif.detectedMeeting!.meetingLink,
                                  description: `From: ${notif.senderName}\n${notif.snippet}`,
                                  gmailMessageId: notif.id,
                                });
                              }
                            }}
                            className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[10px] shrink-0 cursor-pointer"
                          >
                            Attach
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quick Action Footer on Card */}
                  <div
                    className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-1 text-[11px]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectNotification(notif)}
                      className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-semibold cursor-pointer"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Display</span>
                    </button>

                    <div className="flex items-center gap-1 text-slate-400">
                      <button
                        type="button"
                        onClick={() => {
                          const formatted = `\n\n### 📧 Gmail: ${notif.subject}\n- **From:** ${notif.senderName}\n- **Date:** ${notif.dateStr}\n\n> ${notif.snippet}\n`;
                          onInsertIntoNote(formatted);
                        }}
                        title="Add to today's note"
                        className="p-1 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-750 rounded cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onConvertToTask(`Follow up: ${notif.subject}`);
                        }}
                        title="Create Daily Task"
                        className="p-1 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-750 rounded cursor-pointer"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const m = notif.detectedMeeting;
                          onScheduleInCalendar({
                            summary: m?.title || notif.subject,
                            date: m?.date,
                            startTime: m?.startTime,
                            endTime: m?.endTime,
                            location: m?.location,
                            attendeesEmails: m?.attendeesEmails,
                            addGoogleMeet: m ? !m.meetingLink : true,
                            description: `From: ${notif.senderName}\n${notif.snippet}`,
                            gmailMessageId: notif.id,
                          });
                        }}
                        title="Attach / Schedule in Calendar"
                        className="p-1 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-750 rounded cursor-pointer"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                      </button>

                      {notif.isUnread && (
                        <button
                          type="button"
                          onClick={() => onMarkAsRead(notif.id)}
                          title="Mark as read"
                          className="p-1 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-750 rounded cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
