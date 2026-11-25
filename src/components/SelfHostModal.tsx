import React, { useState } from 'react';
import { DriveNoteFile, ReminderNote } from '../types';
import {
  X,
  Server,
  Download,
  Copy,
  Check,
  HardDrive,
  ShieldCheck,
  Terminal,
  ExternalLink,
  Layers,
  FileJson,
  FileText,
  Cloud,
  Sparkles,
} from 'lucide-react';

interface SelfHostModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: DriveNoteFile[];
  reminders: ReminderNote[];
  currentNoteContent: string;
  currentDate: string;
  onOpenDriveBackup?: () => void;
  onOpenNotebookLM?: () => void;
}

const DOCKER_COMPOSE_YML = `version: '3.8'

services:
  daily-notes:
    build: .
    container_name: daily-notes-calendar
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      # Optional: custom Google OAuth client ID if using your own GCP project
      # - VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
`;

export const SelfHostModal: React.FC<SelfHostModalProps> = ({
  isOpen,
  onClose,
  files,
  reminders,
  currentNoteContent,
  currentDate,
  onOpenDriveBackup,
  onOpenNotebookLM,
}) => {
  const [copiedDocker, setCopiedDocker] = useState(false);
  const [activeTab, setActiveTab] = useState<'docker' | 'synology' | 'export'>('synology');

  if (!isOpen) return null;

  const handleCopyDocker = async () => {
    try {
      await navigator.clipboard.writeText(DOCKER_COMPOSE_YML);
      setCopiedDocker(true);
      setTimeout(() => setCopiedDocker(false), 2500);
    } catch {
      setCopiedDocker(true);
      setTimeout(() => setCopiedDocker(false), 2500);
    }
  };

  // Export full JSON backup of all reminders and note index
  const handleExportJson = () => {
    const backupData = {
      exportedAt: new Date().toISOString(),
      appName: 'Daily Notes & Calendar',
      currentDate,
      currentNoteContent,
      reminders,
      driveFilesCount: files.length,
      driveFiles: files,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DailyNotes_Backup_${currentDate}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export current notes and reminders as a clean Markdown backup
  const handleExportMarkdown = () => {
    let md = `# Daily Notes & Reminders Backup\nExported: ${new Date().toLocaleString()}\n\n`;

    md += `## 📌 Quick Reminders & Sticky Notes (${reminders.length})\n\n`;
    reminders.forEach((r, idx) => {
      const status = r.isCompleted ? '[x]' : '[ ]';
      md += `### ${idx + 1}. ${status} ${r.title}\n`;
      if (r.dueDate) md += `- **Due**: ${r.dueDate}\n`;
      if (r.priority) md += `- **Priority**: ${r.priority}\n`;
      if (r.content) md += `- **Details**:\n  ${r.content.replace(/\n/g, '\n  ')}\n`;
      md += '\n';
    });

    if (currentNoteContent.trim()) {
      md += `\n---\n\n## 📝 Current Daily Note (${currentDate})\n\n${currentNoteContent}\n`;
    }

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DailyNotes_${currentDate}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-linear-to-r from-emerald-50/70 dark:from-emerald-950/30 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Self-Hosting &amp; Data Export
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Host on Synology NAS (Docker/Container Manager) or local server
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

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-5 pt-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/80 text-xs font-medium">
          <button
            onClick={() => setActiveTab('synology')}
            className={`flex items-center gap-1.5 pb-2.5 px-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'synology'
                ? 'border-emerald-600 dark:border-emerald-500 text-emerald-700 dark:text-emerald-400 font-semibold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>Synology NAS Guide</span>
          </button>
          <button
            onClick={() => setActiveTab('docker')}
            className={`flex items-center gap-1.5 pb-2.5 px-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'docker'
                ? 'border-emerald-600 dark:border-emerald-500 text-emerald-700 dark:text-emerald-400 font-semibold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Docker Compose</span>
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`flex items-center gap-1.5 pb-2.5 px-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'export'
                ? 'border-emerald-600 dark:border-emerald-500 text-emerald-700 dark:text-emerald-400 font-semibold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Backup &amp; Export</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Synology NAS Tab */}
          {activeTab === 'synology' && (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-semibold text-emerald-950 dark:text-emerald-200">
                    Why Self-Host on Synology NAS?
                  </h4>
                  <p className="text-emerald-900/90 dark:text-emerald-300 leading-relaxed">
                    Just like Synology Note Station, you can run this application on your Synology NAS using <strong>Container Manager (Docker)</strong> or <strong>Web Station</strong>. All your notes continue syncing safely to your Google Drive and Google Calendar, with complete local availability on your local network!
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-slate-900 dark:text-slate-100">Step-by-Step Synology NAS Setup:</h4>
                <ol className="space-y-2 text-slate-700 dark:text-slate-300 pl-4 list-decimal leading-relaxed">
                  <li>
                    <strong>Export the Code:</strong> From the top Settings/Export menu in Google AI Studio, choose <strong>Export to ZIP</strong> or push to a GitHub repository.
                  </li>
                  <li>
                    <strong>Copy to Synology NAS:</strong> Unpack the files into a folder on your NAS (e.g. <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-800 dark:text-slate-200 font-mono text-[11px]">/docker/daily-notes</code>).
                  </li>
                  <li>
                    <strong>Launch in Container Manager:</strong> Open DSM → <strong>Container Manager</strong> → <strong>Project</strong> → <strong>Create</strong>. Select the folder containing <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-800 dark:text-slate-200 font-mono text-[11px]">docker-compose.yml</code> and click <strong>Build &amp; Run</strong>.
                  </li>
                  <li>
                    <strong>Access via LAN or Reverse Proxy:</strong> Open <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-800 dark:text-slate-200 font-mono text-[11px]">http://your-nas-ip:3000</code> or set up Synology Reverse Proxy to bind to a domain like <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-800 dark:text-slate-200 font-mono text-[11px]">https://notes.yournas.synology.me</code>.
                  </li>
                </ol>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <span className="font-semibold text-slate-800 dark:text-slate-200">Google OAuth Setup for Custom Domains:</span>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  To log into Google from your custom NAS domain, go to Google Cloud Console → APIs &amp; Services → Credentials, and add your NAS URL to <strong>Authorized JavaScript origins</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Docker Tab */}
          {activeTab === 'docker' && (
            <div className="space-y-3 text-xs">
              <p className="text-slate-600 dark:text-slate-400">
                You can run this container on any Docker host (Synology NAS, TrueNAS, Raspberry Pi, or local Linux/macOS server):
              </p>

              <div className="relative">
                <div className="absolute right-2.5 top-2.5">
                  <button
                    onClick={handleCopyDocker}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    {copiedDocker ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy compose.yml</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-4 bg-slate-950 text-slate-200 rounded-xl font-mono text-[11px] overflow-x-auto border border-slate-800 leading-relaxed">
                  {DOCKER_COMPOSE_YML}
                </pre>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                <strong>Quick Command:</strong> Run <code className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-mono text-slate-900 dark:text-slate-100">docker compose up -d</code> in the project root to start the app in the background.
              </div>
            </div>
          )}

          {/* Export Tab */}
          {activeTab === 'export' && (
            <div className="space-y-4 text-xs">
              <p className="text-slate-600 dark:text-slate-400">
                Download your notes and reminders for offline backups or importing into Synology Note Station, Obsidian, or local Markdown vaults:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/60 dark:bg-indigo-950/40 sm:col-span-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-semibold text-indigo-950 dark:text-indigo-200">
                      <Cloud className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>Automatic Google Drive Daily Backup</span>
                    </div>
                    <p className="text-indigo-800 dark:text-indigo-300 text-xs">
                      Daily consolidated snapshots stored directly in your Google Drive (<code>Daily Notes / Backups</code>) with one-click restore and history.
                    </p>
                  </div>
                  {onOpenDriveBackup && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenDriveBackup();
                      }}
                      className="shrink-0 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
                    >
                      Open Drive Backup Hub
                    </button>
                  )}
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                      <FileJson className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>Full JSON Backup</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                      Includes all {reminders.length} reminder notes, drive files catalog, and active day note with complete metadata.
                    </p>
                  </div>
                  <button
                    onClick={handleExportJson}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download JSON Backup</span>
                  </button>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                      <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Markdown Export</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                      Clean formatted Markdown document compatible with Synology Note Station, Obsidian, and Bear.
                    </p>
                  </div>
                  <button
                    onClick={handleExportMarkdown}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Markdown (.md)</span>
                  </button>
                </div>

                {/* Google NotebookLM Knowledge Source Card */}
                <div className="p-4 rounded-xl border border-violet-200 dark:border-violet-900/60 bg-violet-50/50 dark:bg-violet-950/30 sm:col-span-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-semibold text-violet-950 dark:text-violet-200">
                      <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                      <span>Google NotebookLM Connection</span>
                    </div>
                    <p className="text-violet-800 dark:text-violet-300 text-xs">
                      Sync a consolidated knowledge digest to Google Drive to ask cross-note questions, generate podcasts (Audio Overviews), and extract action items.
                    </p>
                  </div>
                  {onOpenNotebookLM && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenNotebookLM();
                      }}
                      className="shrink-0 px-3.5 py-2 bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium rounded-xl text-xs transition-all cursor-pointer shadow-xs"
                    >
                      Connect NotebookLM
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
