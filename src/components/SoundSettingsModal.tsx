import React from 'react';
import {
  X,
  Volume2,
  VolumeX,
  Volume1,
  Play,
  Check,
  Bell,
  Sparkles,
  FileText,
  Clock,
  Calendar,
} from 'lucide-react';
import {
  NotificationSoundType,
  SoundOption,
} from '../services/soundEngine';
import { SoundSettings } from '../hooks/useSoundSettings';

interface SoundSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SoundSettings;
  onUpdateSettings: (updates: Partial<SoundSettings>) => void;
  onPreviewSound: (type?: NotificationSoundType) => void;
  soundOptions: SoundOption[];
}

export const SoundSettingsModal: React.FC<SoundSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onPreviewSound,
  soundOptions,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="sound-settings-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="sound-settings-modal-container"
        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 flex items-center justify-center shadow-xs">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Notification Sounds
                <span className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/80">
                  Office Friendly
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gentle, pleasant sounds when scheduling tasks, saving notes, or setting reminders
              </p>
            </div>
          </div>

          <button
            id="btn-close-sound-modal"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 overflow-y-auto space-y-5 text-slate-800 dark:text-slate-200 text-xs">
          {/* Sound Choices */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Select Notification Tone
              </label>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                Click to preview &amp; choose
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {soundOptions.map((opt) => {
                const isSelected = settings.soundType === opt.id;

                return (
                  <div
                    key={opt.id}
                    id={`sound-option-${opt.id}`}
                    onClick={() => {
                      onUpdateSettings({ soundType: opt.id });
                      if (opt.id !== 'silent') {
                        onPreviewSound(opt.id);
                      }
                    }}
                    className={`relative p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2 text-left ${
                      isSelected
                        ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 shadow-xs ring-1 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base select-none">{opt.iconTag}</span>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            {opt.name}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                            {opt.description}
                          </p>
                        </div>
                      </div>

                      {isSelected ? (
                        <div className="w-4 h-4 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3" />
                        </div>
                      ) : null}
                    </div>

                    {opt.id !== 'silent' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPreviewSound(opt.id);
                        }}
                        className="self-start flex items-center gap-1 text-[10px] font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline pt-0.5 cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Play sample</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Volume Control */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {settings.volume === 0 || settings.soundType === 'silent' ? (
                  <VolumeX className="w-4 h-4 text-slate-400" />
                ) : settings.volume < 0.4 ? (
                  <Volume1 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                )}
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  Notification Volume
                </span>
              </div>

              <div className="flex items-center gap-1">
                <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                  {Math.round(settings.volume * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => onPreviewSound(settings.soundType)}
                  disabled={settings.soundType === 'silent' || settings.volume === 0}
                  className="ml-2 px-2 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                >
                  Test Beep
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                id="notification-volume-slider"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.volume}
                onChange={(e) =>
                  onUpdateSettings({ volume: parseFloat(e.target.value) })
                }
                className="flex-1 accent-indigo-600 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
              <button
                type="button"
                onClick={() => onUpdateSettings({ volume: 0.25 })}
                className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                Soft (25%)
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ volume: 0.5 })}
                className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors font-semibold"
              >
                Balanced (50%)
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ volume: 0.85 })}
                className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                Clear (85%)
              </button>
            </div>
          </div>

          {/* Trigger Events */}
          <div className="space-y-2.5">
            <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs block">
              When should sounds play?
            </span>

            <div className="space-y-2">
              <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <input
                  type="checkbox"
                  checked={settings.soundOnReminders}
                  onChange={(e) =>
                    onUpdateSettings({ soundOnReminders: e.target.checked })
                  }
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <div>
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      Sticky Notes &amp; Reminders
                    </span>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Play beep when creating, editing, or completing reminder tasks
                    </p>
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <input
                  type="checkbox"
                  checked={settings.soundOnCalendar}
                  onChange={(e) =>
                    onUpdateSettings({ soundOnCalendar: e.target.checked })
                  }
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      Google Calendar Scheduling
                    </span>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Play sound when scheduling meetings or inserting events
                    </p>
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <input
                  type="checkbox"
                  checked={settings.soundOnNotes}
                  onChange={(e) =>
                    onUpdateSettings({ soundOnNotes: e.target.checked })
                  }
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      Daily Note Saving
                    </span>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Play confirmation sound when saving note changes to Google Drive
                    </p>
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onPreviewSound(settings.soundType)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current text-indigo-600 dark:text-indigo-400" />
            <span>Test Current Sound</span>
          </button>

          <button
            id="btn-done-sound-settings"
            onClick={onClose}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
