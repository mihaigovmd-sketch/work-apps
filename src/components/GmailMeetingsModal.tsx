import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  CalendarCheck,
  Calendar,
  Clock,
  Mail,
  CheckCircle2,
  MapPin,
  Video,
  Users,
  Edit3,
  Eye,
  Sparkles,
  Check,
  AlertCircle,
  ArrowRight,
  CheckSquare,
} from 'lucide-react';
import { GmailNotificationItem } from '../types';

export interface AttachMeetingItemPayload {
  notificationId: string;
  summary: string;
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  description?: string;
  attendeesEmails?: string[];
  addGoogleMeet?: boolean;
}

interface EditableDraft {
  selected: boolean;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  addGoogleMeet: boolean;
  includeEmailContext: boolean;
}

interface GmailMeetingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: GmailNotificationItem[];
  currentDate: string;
  attachedMeetingsMap: Record<string, string>;
  isAttaching: boolean;
  isGuestMode?: boolean;
  onAuthorizeGoogle?: () => void;
  onAttachMeetings: (items: AttachMeetingItemPayload[], alsoAddToTasks: boolean) => Promise<void>;
  onOpenSingleEmail: (notif: GmailNotificationItem) => void;
  onOpenFullEditModal: (data: {
    summary: string;
    date: string;
    startTime: string;
    endTime: string;
    location?: string;
    attendeesEmails?: string[];
    description: string;
    addGoogleMeet?: boolean;
    gmailMessageId: string;
  }) => void;
}

export const GmailMeetingsModal: React.FC<GmailMeetingsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  currentDate,
  attachedMeetingsMap,
  isAttaching,
  isGuestMode = false,
  onAuthorizeGoogle,
  onAttachMeetings,
  onOpenSingleEmail,
  onOpenFullEditModal,
}) => {
  const meetingNotifications = useMemo(
    () => notifications.filter((n) => Boolean(n.detectedMeeting)),
    [notifications]
  );

  const [drafts, setDrafts] = useState<Record<string, EditableDraft>>({});
  const [filterMode, setFilterMode] = useState<'all' | 'pending'>('all');
  const [alsoAddToTasks, setAlsoAddToTasks] = useState(true);

  const tomorrowDateKey = useMemo(() => {
    const d = new Date(`${currentDate}T12:00:00`);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, [currentDate]);

  // Initialize editable drafts whenever modal opens or detected meetings change
  useEffect(() => {
    if (!isOpen) return;
    setDrafts((prev) => {
      const next: Record<string, EditableDraft> = {};
      for (const notif of meetingNotifications) {
        const m = notif.detectedMeeting!;
        const isAlreadyAttached = Boolean(attachedMeetingsMap[notif.id]);
        if (prev[notif.id]) {
          next[notif.id] = {
            ...prev[notif.id],
            selected: isAlreadyAttached ? false : prev[notif.id].selected,
          };
        } else {
          next[notif.id] = {
            selected: !isAlreadyAttached,
            title: m.title || notif.subject,
            date: m.date || currentDate,
            startTime: m.startTime || '10:00',
            endTime: m.endTime || '10:30',
            location: m.location || m.meetingLink || '',
            addGoogleMeet: !m.meetingLink,
            includeEmailContext: true,
          };
        }
      }
      return next;
    });
  }, [isOpen, meetingNotifications, attachedMeetingsMap, currentDate]);

  if (!isOpen) return null;

  const visibleNotifications = meetingNotifications.filter((n) => {
    if (filterMode === 'pending') return !attachedMeetingsMap[n.id];
    return true;
  });

  const pendingCount = meetingNotifications.filter((n) => !attachedMeetingsMap[n.id]).length;
  const attachedCount = meetingNotifications.filter((n) => Boolean(attachedMeetingsMap[n.id])).length;

  const selectedIds = meetingNotifications
    .filter((n) => drafts[n.id]?.selected && !attachedMeetingsMap[n.id])
    .map((n) => n.id);

  const updateDraft = (id: string, patch: Partial<EditableDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        ...patch,
      },
    }));
  };

  const handleSelectAllPending = () => {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const n of meetingNotifications) {
        if (!attachedMeetingsMap[n.id] && next[n.id]) {
          next[n.id] = { ...next[n.id], selected: true };
        }
      }
      return next;
    });
  };

  const handleDeselectAll = () => {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const id of Object.keys(next)) {
        next[id] = { ...next[id], selected: false };
      }
      return next;
    });
  };

  const buildPayloadForNotif = (notif: GmailNotificationItem): AttachMeetingItemPayload => {
    const draft = drafts[notif.id];
    const m = notif.detectedMeeting!;
    const gmailLink = `https://mail.google.com/mail/u/0/#inbox/${notif.id}`;
    const emailContext = draft?.includeEmailContext
      ? `Attached from Gmail\nFrom: ${notif.senderName} (${notif.senderEmail || notif.sender})\nSubject: ${notif.subject}\n\n${notif.snippet || ''}\n\nGmail Link: ${gmailLink}`
      : undefined;

    return {
      notificationId: notif.id,
      summary: (draft?.title || m.title || notif.subject).trim(),
      date: draft?.date || m.date || currentDate,
      startTime: draft?.startTime || m.startTime || '10:00',
      endTime: draft?.endTime || m.endTime || '10:30',
      location: (draft?.location || m.location || '').trim() || undefined,
      description: emailContext,
      attendeesEmails: m.attendeesEmails,
      addGoogleMeet: draft?.addGoogleMeet,
    };
  };

  const handleAttachSelected = async () => {
    const toAttach = meetingNotifications
      .filter((n) => drafts[n.id]?.selected && !attachedMeetingsMap[n.id])
      .map(buildPayloadForNotif);

    if (toAttach.length === 0) return;
    await onAttachMeetings(toAttach, alsoAddToTasks);
  };

  const handleAttachSingle = async (notif: GmailNotificationItem) => {
    const payload = buildPayloadForNotif(notif);
    await onAttachMeetings([payload], alsoAddToTasks);
  };

  return (
    <div
      id="gmail-meetings-chooser-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        id="gmail-meetings-chooser-card"
        className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-indigo-50/80 via-blue-50/60 to-white dark:from-indigo-950/40 dark:via-slate-900 dark:to-slate-900 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  Gmail Meeting Arrangements
                </h2>
                {pendingCount > 0 ? (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    {pendingCount} Ready to Attach
                  </span>
                ) : (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    All Meetings Synced
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Choose which meetings found in Gmail to attach to your Google Calendar — adjust the date or time before confirming together.
              </p>
            </div>
          </div>

          <button
            id="btn-close-meetings-chooser"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Guest Mode Notice */}
        {isGuestMode && (
          <div className="px-5 py-2.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-800 dark:text-amber-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                <strong>Demo Mode:</strong> Sign in with Google Workspace to attach these meetings directly into your live Google Calendar.
              </span>
            </div>
            {onAuthorizeGoogle && (
              <button
                type="button"
                onClick={onAuthorizeGoogle}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-[11px] shrink-0 cursor-pointer"
              >
                Connect Google
              </button>
            )}
          </div>
        )}

        {/* Sub-Toolbar: Filter + Select Controls */}
        <div className="px-5 sm:px-6 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              All Found ({meetingNotifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('pending')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                filterMode === 'pending'
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              Not Attached Yet ({pendingCount})
            </button>
            {attachedCount > 0 && (
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium ml-1">
                • {attachedCount} already attached
              </span>
            )}
          </div>

          {pendingCount > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAllPending}
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium cursor-pointer"
              >
                Select all pending
              </button>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="text-slate-500 hover:underline font-medium cursor-pointer"
              >
                Clear selection
              </button>
            </div>
          )}
        </div>

        {/* Meeting List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {visibleNotifications.length === 0 ? (
            <div className="py-12 text-center">
              <Calendar className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2.5" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {meetingNotifications.length === 0
                  ? 'No meeting arrangements detected in current Gmail scan'
                  : 'All detected meetings are already attached to Calendar!'}
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Scan Gmail (or select the "Calendar Invites" filter) anytime to look for invitations, Zoom/Meet links, or meeting requests.
              </p>
            </div>
          ) : (
            visibleNotifications.map((notif) => {
              const meeting = notif.detectedMeeting!;
              const draft = drafts[notif.id];
              const isAttached = Boolean(attachedMeetingsMap[notif.id]);
              const isSelected = Boolean(draft?.selected && !isAttached);

              return (
                <div
                  key={notif.id}
                  id={`gmail-meeting-card-${notif.id}`}
                  className={`rounded-2xl border p-4 transition-all ${
                    isAttached
                      ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60'
                      : isSelected
                      ? 'bg-indigo-50/40 dark:bg-indigo-950/25 border-indigo-300 dark:border-indigo-700 shadow-sm'
                      : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Selection Checkbox */}
                    <div className="pt-1">
                      {isAttached ? (
                        <div
                          title="Already attached to Calendar"
                          className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => updateDraft(notif.id, { selected: e.target.checked })}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      )}
                    </div>

                    {/* Main Details & Editor */}
                    <div className="flex-1 min-w-0 space-y-3">
                      {/* Badges & Source Row */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              meeting.source === 'ics'
                                ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                : 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                            }`}
                          >
                            <Sparkles className="w-2.5 h-2.5" />
                            {meeting.source === 'ics' ? 'Calendar Invite (.ics)' : 'Detected in Email'}
                          </span>

                          {meeting.rawWhenText && (
                            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                              Found: {meeting.rawWhenText}
                            </span>
                          )}

                          {isAttached && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 className="w-3 h-3" />
                              Attached to Calendar
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onOpenSingleEmail(notif)}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            Read Email
                          </button>
                        </div>
                      </div>

                      {/* Sender line */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <Mail className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {notif.senderName}
                        </span>
                        {notif.senderEmail && (
                          <span className="text-[11px] text-slate-400 truncate">
                            ({notif.senderEmail})
                          </span>
                        )}
                        <span className="text-slate-300 dark:text-slate-600">•</span>
                        <span className="text-[11px]">{notif.dateStr}</span>
                      </div>

                      {/* Editable Meeting Title */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Calendar Event Title
                        </label>
                        <input
                          type="text"
                          disabled={isAttached}
                          value={draft?.title ?? meeting.title}
                          onChange={(e) => updateDraft(notif.id, { title: e.target.value })}
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-indigo-500 disabled:opacity-70"
                        />
                      </div>

                      {/* Date & Time Chooser Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                        <div className="sm:col-span-5">
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Date
                            </label>
                            {!isAttached && (
                              <div className="flex items-center gap-1 text-[10px]">
                                <button
                                  type="button"
                                  onClick={() => updateDraft(notif.id, { date: currentDate })}
                                  className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-950 text-slate-600 dark:text-slate-300 cursor-pointer"
                                >
                                  Today
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateDraft(notif.id, { date: tomorrowDateKey })}
                                  className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-950 text-slate-600 dark:text-slate-300 cursor-pointer"
                                >
                                  Tomorrow
                                </button>
                              </div>
                            )}
                          </div>
                          <input
                            type="date"
                            disabled={isAttached}
                            value={draft?.date ?? meeting.date}
                            onChange={(e) => updateDraft(notif.id, { date: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 disabled:opacity-70"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Start
                          </label>
                          <input
                            type="time"
                            disabled={isAttached}
                            value={draft?.startTime ?? meeting.startTime}
                            onChange={(e) => updateDraft(notif.id, { startTime: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 disabled:opacity-70"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            End
                          </label>
                          <input
                            type="time"
                            disabled={isAttached}
                            value={draft?.endTime ?? meeting.endTime}
                            onChange={(e) => updateDraft(notif.id, { endTime: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 disabled:opacity-70"
                          />
                        </div>

                        {!isAttached && (
                          <div className="sm:col-span-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() => updateDraft(notif.id, { startTime: '10:00', endTime: '10:30' })}
                              title="Quick set to 10:00 – 10:30"
                              className="px-2 py-1.5 text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-950 text-slate-600 dark:text-slate-300 rounded-lg cursor-pointer"
                            >
                              10:00
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Location / Link + Attendees + Options */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                        <div className="flex flex-wrap items-center gap-3 text-slate-500 dark:text-slate-400">
                          {(draft?.location || meeting.location || meeting.meetingLink) && (
                            <span className="inline-flex items-center gap-1 max-w-[260px] truncate">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">
                                {draft?.location || meeting.location || meeting.meetingLink}
                              </span>
                            </span>
                          )}

                          {meeting.attendeesEmails && meeting.attendeesEmails.length > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <Users className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{meeting.attendeesEmails.join(', ')}</span>
                            </span>
                          )}

                          {!isAttached && (
                            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-slate-600 dark:text-slate-300">
                              <input
                                type="checkbox"
                                checked={draft?.addGoogleMeet ?? false}
                                onChange={(e) =>
                                  updateDraft(notif.id, { addGoogleMeet: e.target.checked })
                                }
                                className="rounded text-emerald-600 w-3.5 h-3.5 cursor-pointer"
                              />
                              <Video className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              <span>Add Google Meet</span>
                            </label>
                          )}
                        </div>

                        {/* Individual Card Actions */}
                        {!isAttached && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const payload = buildPayloadForNotif(notif);
                                onOpenFullEditModal({
                                  summary: payload.summary,
                                  date: payload.date,
                                  startTime: payload.startTime,
                                  endTime: payload.endTime,
                                  location: payload.location,
                                  attendeesEmails: payload.attendeesEmails,
                                  description: payload.description || '',
                                  addGoogleMeet: payload.addGoogleMeet,
                                  gmailMessageId: notif.id,
                                });
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3" />
                              Edit Details
                            </button>

                            <button
                              type="button"
                              disabled={isAttaching}
                              onClick={() => handleAttachSingle(notif)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer disabled:opacity-50"
                            >
                              <CalendarCheck className="w-3 h-3" />
                              Attach This
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={alsoAddToTasks}
              onChange={(e) => setAlsoAddToTasks(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
            />
            <CheckSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Also add attached meetings to Daily Tasks list</span>
          </label>

          <div className="flex items-center justify-end gap-2.5">
            <button
              id="btn-meetings-decide-later"
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              Let Me Decide Later
            </button>

            <button
              id="btn-attach-selected-meetings"
              type="button"
              disabled={selectedIds.length === 0 || isAttaching}
              onClick={handleAttachSelected}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 dark:shadow-none transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAttaching ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Attaching to Calendar...</span>
                </>
              ) : (
                <>
                  <CalendarCheck className="w-4 h-4" />
                  <span>
                    Attach Selected to Calendar ({selectedIds.length})
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
