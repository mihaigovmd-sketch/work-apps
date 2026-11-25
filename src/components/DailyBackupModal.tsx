import React, { useState } from 'react';
import { DriveBackupFile, BackupPayload, ReminderNote, GoogleUser, DayFolderInfo } from '../types';
import { getDayFolderName } from '../utils/unifiedStorage';
import {
  X,
  Cloud,
  CloudCheck,
  RefreshCw,
  Download,
  Trash2,
  RotateCcw,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Clock,
  FileJson,
  Check,
  AlertTriangle,
  FolderOpen,
  Folder,
  Sparkles,
  ArrowDownToLine,
} from 'lucide-react';

interface DailyBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: GoogleUser | null;
  currentDate: string;
  backups: DriveBackupFile[];
  isLoadingBackups: boolean;
  isBackingUp: boolean;
  lastBackupTime: string | null;
  autoBackupEnabled: boolean;
  onToggleAutoBackup: (enabled: boolean) => void;
  onRunBackup: (isTimestamped?: boolean) => Promise<void>;
  onRestoreBackup: (fileId: string) => Promise<void>;
  onDeleteBackup: (fileId: string) => Promise<void>;
  onRefreshBackups: () => Promise<void>;
  onLocalExportJson: () => void;
  backupsFolderLink?: string;
  todayBackupFolderInfo?: DayFolderInfo | null;
}

export const DailyBackupModal: React.FC<DailyBackupModalProps> = ({
  isOpen,
  onClose,
  user,
  currentDate,
  backups,
  isLoadingBackups,
  isBackingUp,
  lastBackupTime,
  autoBackupEnabled,
  onToggleAutoBackup,
  onRunBackup,
  onRestoreBackup,
  onDeleteBackup,
  onRefreshBackups,
  onLocalExportJson,
  backupsFolderLink,
  todayBackupFolderInfo,
}) => {
  const [selectedFileForRestore, setSelectedFileForRestore] = useState<DriveBackupFile | null>(null);
  const [restoringFileId, setRestoringFileId] = useState<string | null>(null);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentDayFolderName = getDayFolderName(currentDate);

  // Check if today already has a backup in Google Drive
  const todayBackup = backups.find((b) => b.backupDate === currentDate || b.name.includes(currentDate));
  const activeDayFolderLink = todayBackupFolderInfo?.webViewLink || todayBackup?.dayFolderWebViewLink;

  const formatFileSize = (bytesStr?: string) => {
    if (!bytesStr) return '';
    const bytes = parseInt(bytesStr, 10);
    if (isNaN(bytes)) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDateTime = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  const handleConfirmRestore = async () => {
    if (!selectedFileForRestore) return;
    setRestoringFileId(selectedFileForRestore.id);
    try {
      await onRestoreBackup(selectedFileForRestore.id);
      setSelectedFileForRestore(null);
    } finally {
      setRestoringFileId(null);
    }
  };

  const handleDelete = async (file: DriveBackupFile) => {
    if (!window.confirm(`Are you sure you want to delete backup "${file.name}" from your Google Drive?`)) {
      return;
    }
    setDeletingFileId(file.id);
    try {
      await onDeleteBackup(file.id);
    } finally {
      setDeletingFileId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-linear-to-r from-indigo-50/80 dark:from-indigo-950/40 via-emerald-50/30 dark:via-emerald-950/20 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Google Drive Daily Backup
                </h3>
                <span className="text-[11px] font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/80 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Drive Synced
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Automated daily backups organized into daily folders (maps) inside your main Google Drive Backups folder (<code className="font-mono text-[11px] text-slate-700 dark:text-slate-300">Daily Notes / Backups / [Day Map]</code>)
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

        {/* Restore Confirmation Dialog View */}
        {selectedFileForRestore ? (
          <div className="p-6 space-y-4 overflow-y-auto">
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                  Confirm Restore from Google Drive Backup
                </h4>
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  You are about to restore data from <strong>{selectedFileForRestore.name}</strong> created on{' '}
                  {formatDateTime(selectedFileForRestore.createdTime)}. This will update your active reminders shelf and daily note with the snapshot content.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Backup Date:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedFileForRestore.backupDate || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Backup Size:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{formatFileSize(selectedFileForRestore.size)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Map Location:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Daily Notes &gt; Backups (Main Map) &gt; {selectedFileForRestore.dayFolderName || currentDayFolderName}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedFileForRestore(null)}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!!restoringFileId}
                onClick={handleConfirmRestore}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                {restoringFileId ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Restoring data...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Proceed with Restore</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Normal Backup Modal View */
          <div className="p-5 space-y-5 overflow-y-auto flex-1">
            {/* Status & Immediate Backup Trigger */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Today&apos;s Backup Status:
                  </span>
                  {todayBackup ? (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/80">
                      <Check className="w-3 h-3" />
                      Backed up to Drive
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/80">
                      <Clock className="w-3 h-3" />
                      Pending today&apos;s run
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {lastBackupTime
                    ? `Last backup completed on ${formatDateTime(lastBackupTime)}`
                    : todayBackup
                    ? `Last snapshot: ${formatDateTime(todayBackup.modifiedTime)}`
                    : 'A daily consolidated backup is uploaded to your Google Drive automatically.'}
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  id="btn-backup-now"
                  disabled={isBackingUp}
                  onClick={() => onRunBackup(false)}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-medium transition-colors cursor-pointer shadow-xs"
                  title="Save or refresh today's daily backup on Google Drive"
                >
                  {isBackingUp ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Backing up...</span>
                    </>
                  ) : (
                    <>
                      <Cloud className="w-3.5 h-3.5" />
                      <span>Backup to Drive Now</span>
                    </>
                  )}
                </button>

                <button
                  disabled={isBackingUp}
                  onClick={() => onRunBackup(true)}
                  className="px-2.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors cursor-pointer shadow-xs"
                  title="Create an extra timestamped snapshot on Google Drive"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                </button>
              </div>
            </div>

            {/* Daily Map Organization Banner */}
            <div className="p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-900/60 bg-linear-to-r from-indigo-50/70 via-slate-50 to-amber-50/50 dark:from-indigo-950/30 dark:via-slate-800/40 dark:to-amber-950/20 text-xs space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-xs">
                  <FolderOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Daily Map Organization on Drive
                </span>
                <span className="text-[11px] font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-100/80 dark:bg-indigo-900/50 px-2 py-0.5 rounded-full border border-indigo-200/80 dark:border-indigo-800">
                  1 New Map Every Day
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
                <span className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold shadow-2xs">
                  Daily Notes
                </span>
                <span className="text-slate-400 dark:text-slate-500 font-sans">/</span>
                <span className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-semibold shadow-2xs">
                  Backups <span className="font-sans font-normal text-[10px] text-slate-500 dark:text-slate-400">(Main Map)</span>
                </span>
                <span className="text-slate-400 dark:text-slate-500 font-sans">/</span>
                <span className="px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 font-bold shadow-2xs flex items-center gap-1">
                  <Folder className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  {currentDayFolderName} <span className="font-sans font-normal text-[10px] text-amber-700 dark:text-amber-300">(Day Map)</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans leading-relaxed">
                Backups are automatically organized by day. Every single day, a dedicated folder (map) is created inside the main Backups map to house that day&apos;s backup snapshots.
              </p>
            </div>

            {/* Auto-Backup Toggle & Drive Folder Link */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
                    Automatic Daily Backup
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block leading-tight">
                    Runs daily in the background to keep Drive in sync
                  </span>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoBackupEnabled}
                    onChange={(e) => onToggleAutoBackup(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 flex items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
                    Drive Backup Maps
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block leading-tight">
                    Main map &amp; daily day maps
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  <button
                    onClick={onLocalExportJson}
                    className="p-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                    title="Download local JSON copy to computer"
                  >
                    <ArrowDownToLine className="w-4 h-4" />
                  </button>
                  {backupsFolderLink && (
                    <a
                      href={backupsFolderLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-700 dark:hover:text-indigo-300 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                      title="Open General Backups Map on drive.google.com"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Main Map</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>
                  )}
                  {activeDayFolderLink && (
                    <a
                      href={activeDayFolderLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2 py-1.5 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-xs font-medium rounded-lg transition-colors cursor-pointer border border-amber-200 dark:border-amber-800"
                      title={`Open today's day map (${currentDayFolderName}) on drive.google.com`}
                    >
                      <Folder className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>Today&apos;s Map</span>
                      <ExternalLink className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Backups List from Google Drive */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <CloudCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Google Drive Backup Snapshots ({backups.length})</span>
                </h4>

                <button
                  onClick={onRefreshBackups}
                  disabled={isLoadingBackups}
                  className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingBackups ? 'animate-spin' : ''}`} />
                  <span>Refresh list</span>
                </button>
              </div>

              {isLoadingBackups && backups.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
                  <span>Loading backups from Google Drive...</span>
                </div>
              ) : backups.length === 0 ? (
                <div className="py-8 px-4 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col items-center justify-center gap-1.5">
                  <Cloud className="w-7 h-7 text-slate-400 dark:text-slate-500" />
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">No backup snapshots found in Drive yet</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm">
                    Click &quot;Backup to Drive Now&quot; above to create your first daily backup snapshot in Google Drive.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {backups.map((file) => {
                    const isToday = file.backupDate === currentDate || file.name.includes(currentDate);

                    return (
                      <div
                        key={file.id}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-2xs transition-all flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              isToday ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            <FileJson className="w-4 h-4" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                                {file.name}
                              </span>
                              {isToday && (
                                <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.2 rounded-md border border-emerald-200 dark:border-emerald-800">
                                  Today
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              <span>{formatDateTime(file.createdTime || file.modifiedTime)}</span>
                              {file.size && <span>• {formatFileSize(file.size)}</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 flex items-center gap-1">
                                <Folder className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                                Map: {file.dayFolderName || currentDayFolderName}
                              </span>
                              {file.dayFolderWebViewLink && (
                                <a
                                  href={file.dayFolderWebViewLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline flex items-center gap-0.5"
                                  title={`Open day map "${file.dayFolderName}" in Drive`}
                                >
                                  <span>Open Map</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                              title="View backup file in Google Drive"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}

                          <button
                            onClick={() => setSelectedFileForRestore(file)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg transition-colors cursor-pointer"
                            title="Restore reminders and note from this backup"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Restore</span>
                          </button>

                          <button
                            onClick={() => handleDelete(file)}
                            disabled={deletingFileId === file.id}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                            title="Delete backup from Google Drive"
                          >
                            {deletingFileId === file.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* What is in the backup explanation */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
              <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                What does each daily backup snapshot include?
              </span>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
                Each backup file packages all your <strong>sticky reminders</strong> (colors, priorities, due dates), your <strong>daily note text</strong>, catalog of all Drive notes, and calendar event references. Backups are stored directly in your private Google Drive and never touch any third-party servers.
              </p>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex items-center justify-between">
          <button
            onClick={onLocalExportJson}
            className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Local Copy</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white dark:text-slate-100 border border-transparent dark:border-slate-700 rounded-xl text-xs font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
