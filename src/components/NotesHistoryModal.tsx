import React, { useState } from 'react';
import {
  X,
  FolderOpen,
  Calendar,
  ExternalLink,
  Trash2,
  FileText,
  Search,
  RefreshCw,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { DriveNoteFile } from '../types';

interface NotesHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: DriveNoteFile[];
  isLoading: boolean;
  onRefresh: () => void;
  onSelectDate: (dateKey: string) => void;
  onDeleteFile: (file: DriveNoteFile) => void;
}

export const NotesHistoryModal: React.FC<NotesHistoryModalProps> = ({
  isOpen,
  onClose,
  files,
  isLoading,
  onRefresh,
  onSelectDate,
  onDeleteFile,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredFiles = files.filter(
    (file) =>
      file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.dateKey.includes(searchQuery)
  );

  const formatFileSize = (bytes?: string) => {
    if (!bytes) return '';
    const n = parseInt(bytes, 10);
    if (isNaN(n)) return '';
    if (n < 1024) return `${n} B`;
    return `${(n / 1024).toFixed(1)} KB`;
  };

  const formatDateLabel = (dateKey: string) => {
    if (!dateKey) return 'Note';
    try {
      const d = new Date(`${dateKey}T12:00:00`);
      return d.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateKey;
    }
  };

  return (
    <div
      id="notes-archive-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 dark:bg-slate-950/80 backdrop-blur-xs p-4 animate-in fade-in duration-200"
    >
      <div
        id="notes-archive-modal-card"
        className="w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh] transition-colors"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 id="archive-modal-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Google Drive Notes Archive
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Folder: <span className="font-semibold text-slate-700 dark:text-slate-300">"Daily Notes"</span> • Dedicated Day Folder for each day (Date, Month, Year)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="refresh-archive-btn"
              onClick={onRefresh}
              disabled={isLoading}
              title="Refresh notes from Google Drive"
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              id="archive-modal-close"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="pt-4 pb-2 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="search-archive-input"
              type="text"
              placeholder="Search notes by date (e.g. 2026-09) or filename..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto py-2 space-y-2.5 pr-1">
          {isLoading ? (
            <div className="space-y-2 py-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mb-1"></div>
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No notes found</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                {searchQuery
                  ? 'No daily notes match your search query.'
                  : 'Start typing notes in the editor and click "Save to Drive" to populate your archive.'}
              </p>
            </div>
          ) : (
            filteredFiles.map((file) => {
              const dateLabel = formatDateLabel(file.dateKey);
              const modifiedStr = new Date(file.modifiedTime).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={file.id}
                  id={`archive-file-${file.id}`}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30 border border-slate-200/80 dark:border-slate-800 transition-all group"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {dateLabel}
                      </span>
                      {file.dayFolderName && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 font-mono font-medium">
                          📁 {file.dayFolderName}
                        </span>
                      )}
                      {file.isUnifiedRecord && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-medium">
                          1-File Bundle
                        </span>
                      )}
                      {file.size && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                          {formatFileSize(file.size)}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-mono text-slate-400 dark:text-slate-500">{file.name}</span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                        {modifiedStr}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      id={`load-note-${file.id}`}
                      onClick={() => {
                        if (file.dateKey) onSelectDate(file.dateKey);
                        onClose();
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-medium transition-colors cursor-pointer shadow-2xs"
                    >
                      <span>Open</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>

                    {file.webViewLink && (
                      <a
                        id={`open-drive-ext-${file.id}`}
                        href={file.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open file in Google Drive"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}

                    <button
                      id={`delete-file-${file.id}`}
                      onClick={() => onDeleteFile(file)}
                      title="Delete from Google Drive"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 shrink-0">
          <span>{files.length} notes saved in Google Drive</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
