import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  ExternalLink,
  Cloud,
  Check,
  Copy,
  Download,
  FileText,
  Headphones,
  Lightbulb,
  ArrowRight,
  RefreshCw,
  Eye,
  Calendar,
  CheckCircle2,
  FolderSync,
} from 'lucide-react';
import { DriveNoteFile, ReminderNote, CalendarEventItem } from '../types';
import {
  saveNotebookLMDigestToDrive,
  getNotebookLMDigestInfo,
  generateNotebookLMMarkdown,
  NotebookLMDigestInfo,
} from '../services/drive';

interface NotebookLMModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  userEmail: string | null;
  activeDate: string;
  activeContent: string;
  driveFiles: DriveNoteFile[];
  reminders: ReminderNote[];
  calendarEvents: CalendarEventItem[];
  onToast: (msg: string) => void;
}

export const NotebookLMModal: React.FC<NotebookLMModalProps> = ({
  isOpen,
  onClose,
  token,
  userEmail,
  activeDate,
  activeContent,
  driveFiles,
  reminders,
  calendarEvents,
  onToast,
}) => {
  const [digestInfo, setDigestInfo] = useState<NotebookLMDigestInfo | null>(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState('');

  // NotebookLM direct link with authuser parameter
  const notebookLmUrl = userEmail
    ? `https://notebooklm.google.com?authuser=${encodeURIComponent(userEmail)}`
    : 'https://notebooklm.google.com';

  // Load existing digest info when modal opens
  useEffect(() => {
    if (isOpen && token) {
      setIsLoadingInfo(true);
      getNotebookLMDigestInfo(token)
        .then((info) => setDigestInfo(info))
        .catch(() => {})
        .finally(() => setIsLoadingInfo(false));
    }
  }, [isOpen, token]);

  if (!isOpen) return null;

  const buildCurrentDigest = () => {
    return generateNotebookLMMarkdown({
      userEmail,
      activeDate,
      activeContent,
      archiveNotes: driveFiles.map((f) => ({
        dateKey: f.dateKey,
        name: f.name,
      })),
      reminders,
      calendarEvents: calendarEvents.map((e) => ({
        summary: e.summary,
        start: e.start,
      })),
    });
  };

  const handleSyncToDrive = async () => {
    if (!token) {
      onToast('Please sign in to sync with Google Drive');
      return;
    }

    setIsSyncing(true);
    try {
      const markdown = buildCurrentDigest();
      const result = await saveNotebookLMDigestToDrive(token, markdown);
      setDigestInfo(result);
      onToast('Successfully synced NotebookLM Knowledge Digest to Google Drive!');
    } catch (err: any) {
      onToast(`Failed to sync digest: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopyDigest = async () => {
    const markdown = buildCurrentDigest();
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      onToast('Copied full Knowledge Digest to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      onToast('Failed to copy to clipboard');
    }
  };

  const handleDownloadDigest = () => {
    const markdown = buildCurrentDigest();
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `NotebookLM_Digest_${activeDate}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onToast('Downloaded NotebookLM Markdown digest');
  };

  const handleTogglePreview = () => {
    if (!showPreview) {
      setPreviewContent(buildCurrentDigest());
    }
    setShowPreview(!showPreview);
  };

  return (
    <div
      id="notebooklm-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        id="notebooklm-modal-card"
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-linear-to-r from-violet-500/10 via-indigo-500/10 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Google NotebookLM Connection
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/70 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                  AI Source Ingestion
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Turn your daily notes, reminders, and calendar into deep AI summaries &amp; Audio Overviews
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Main Action Banner: Launch NotebookLM */}
          <div className="p-4 rounded-2xl bg-linear-to-r from-violet-600/10 via-indigo-600/10 to-sky-600/10 border border-violet-200 dark:border-violet-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                  Google NotebookLM
                </span>
                {userEmail && (
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-white/80 dark:bg-slate-800 font-medium text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                    {userEmail}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md leading-relaxed">
                NotebookLM reads your Google Drive files natively. You can ask questions, generate podcasts, and discover connections across all your notes.
              </p>
            </div>

            <a
              id="btn-launch-notebooklm"
              href={notebookLmUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium text-xs shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all cursor-pointer shrink-0"
            >
              <span>Open NotebookLM</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Drive Knowledge Digest Synchronization Card */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Cloud className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    Consolidated Knowledge Digest in Google Drive
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    File: <code className="font-mono text-slate-800 dark:text-slate-200">Daily Notes/NotebookLM_DailyNotes_Digest.md</code>
                  </p>
                </div>
              </div>

              {digestInfo && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                  <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  Synced
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Consolidates your active day note ({activeDate}), {reminders.length} Synology-style reminders, upcoming calendar agenda, and all {driveFiles.length} archived daily notes into a single structured source document that NotebookLM indexes in seconds.
            </p>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-800">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {isLoadingInfo ? (
                  <span className="flex items-center gap-1.5">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Checking Google Drive...
                  </span>
                ) : digestInfo?.modifiedTime ? (
                  <span>
                    Last updated: {new Date(digestInfo.modifiedTime).toLocaleDateString()} at{' '}
                    {new Date(digestInfo.modifiedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                ) : (
                  <span>Not compiled yet for today</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {digestInfo?.webViewLink && (
                  <a
                    href={digestInfo.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 flex items-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3 text-indigo-500" />
                    <span>View in Drive</span>
                  </a>
                )}

                <button
                  id="btn-sync-digest-drive"
                  onClick={handleSyncToDrive}
                  disabled={isSyncing}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-60"
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Syncing to Drive...</span>
                    </>
                  ) : (
                    <>
                      <FolderSync className="w-3.5 h-3.5" />
                      <span>{digestInfo ? 'Update Digest in Drive' : 'Sync Digest to Drive'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* 3-Step Guide */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              How to Connect Your Notes in 3 Easy Steps
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
                <div>
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] inline-flex items-center justify-center mb-1.5">
                    1
                  </span>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">Sync Digest to Drive</div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Click <strong>Sync Digest to Drive</strong> above to write the master source into your Google Drive folder.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
                <div>
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] inline-flex items-center justify-center mb-1.5">
                    2
                  </span>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">Open NotebookLM</div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Click <strong>Open NotebookLM</strong> to launch the web app with your account pre-selected.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
                <div>
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] inline-flex items-center justify-center mb-1.5">
                    3
                  </span>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">Select from Drive</div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    In NotebookLM, click <strong>Add Sources</strong> → <strong>Google Drive</strong> → pick <code className="text-[10px]">NotebookLM_DailyNotes_Digest.md</code>.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* What NotebookLM Can Do For You */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              Inspiring Things to Ask NotebookLM
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 rounded-xl border border-violet-200/80 dark:border-violet-900/40 bg-violet-50/40 dark:bg-violet-950/20 flex items-start gap-2.5">
                <Headphones className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-violet-950 dark:text-violet-200">Audio Overview (AI Podcast)</span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                    Click "Audio Overview" in NotebookLM to generate a lively 2-host conversational podcast discussing your notes, thoughts, and accomplishments!
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-indigo-200/80 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-indigo-950 dark:text-indigo-200">Action Items &amp; Follow-ups</span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                    Ask: <em>"Extract all unfinished tasks, follow-up items, and priority reminders from my notes into a checklist."</em>
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-emerald-200/80 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 flex items-start gap-2.5">
                <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-emerald-950 dark:text-emerald-200">Weekly or Monthly Digest</span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                    Ask: <em>"Draft an executive summary of what I worked on over the past 2 weeks, organized by project area."</em>
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-amber-200/80 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-amber-950 dark:text-amber-200">Meeting &amp; Discussion Synthesis</span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                    Ask: <em>"Review my recent meetings and correlate them with the notes and thoughts I wrote down."</em>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Copy & Download Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs">
            <span className="text-slate-600 dark:text-slate-400 font-medium">
              Alternative options:
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={handleTogglePreview}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-indigo-500" />
                <span>{showPreview ? 'Hide Preview' : 'Preview Digest'}</span>
              </button>

              <button
                onClick={handleCopyDigest}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Markdown'}</span>
              </button>

              <button
                onClick={handleDownloadDigest}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .md</span>
              </button>
            </div>
          </div>

          {/* Preview Section if toggled */}
          {showPreview && (
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
                <span>Markdown Knowledge Digest Preview</span>
                <span className="text-[11px] text-slate-500">{previewContent.length} characters</span>
              </div>
              <pre className="text-[11px] font-mono p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 overflow-x-auto max-h-60 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {previewContent}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
          <a
            href={notebookLmUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 flex items-center gap-1"
          >
            <span>Launch notebooklm.google.com</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-medium transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
