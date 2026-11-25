import React, { useState } from 'react';
import { GoogleUser } from '../types';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  X,
  Link as LinkIcon,
  Copy,
  Check,
  Download,
  Smartphone,
  Monitor,
  ExternalLink,
  Share2,
  Bookmark,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface ShortcutModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: GoogleUser | null;
}

export const ShortcutModal: React.FC<ShortcutModalProps> = ({
  isOpen,
  onClose,
  user,
}) => {
  const [copied, setCopied] = useState(false);
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  if (!isOpen) return null;

  // Build direct URL with login_hint parameter based on Google Account
  const origin = window.location.origin;
  const userEmail = user?.email || '';
  const directUrl = userEmail
    ? `${origin}?login_hint=${encodeURIComponent(userEmail)}`
    : origin;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(directUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Download Windows .url shortcut file
  const downloadWindowsShortcut = () => {
    const fileContent = `[InternetShortcut]\r\nURL=${directUrl}\r\nIconIndex=0\r\n`;
    const blob = new Blob([fileContent], { type: 'application/internet-shortcut' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Daily Notes & Calendar.url';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download Mac .webloc shortcut file
  const downloadMacShortcut = () => {
    const fileContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>URL</key>
  <string>${directUrl}</string>
</dict>
</plist>`;
    const blob = new Blob([fileContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Daily Notes & Calendar.webloc';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-linear-to-r from-indigo-50/70 dark:from-indigo-950/30 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <LinkIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Direct URL &amp; App Shortcuts
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Quick 1-click access to your Daily Notes &amp; Reminders
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
          {/* Direct Google Account Link */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/90 dark:border-slate-800 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Direct Link for Your Google Account
              </span>
              {userEmail && (
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                  {userEmail}
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Opening this link automatically pre-selects your Google account for seamless access.
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={directUrl}
                className="flex-1 px-3 py-2 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 select-all focus:outline-hidden"
              />
              <button
                id="btn-copy-direct-url"
                onClick={handleCopyUrl}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-medium transition-colors cursor-pointer shrink-0 shadow-xs"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy URL</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Desktop & PWA Installation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Install as Standalone App */}
            <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/30 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-indigo-950 dark:text-indigo-200">
                  <Monitor className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Install as Desktop / Phone App</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Launch in its own window without browser toolbars, just like Synology Note Station desktop client.
                </p>
              </div>

              {isInstalled ? (
                <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 font-medium bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <Check className="w-3.5 h-3.5" />
                  <span>Already Installed as App</span>
                </div>
              ) : isInstallable ? (
                <button
                  onClick={install}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Install App Now</span>
                </button>
              ) : isIOS ? (
                <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  On iOS Safari, tap <strong>Share</strong> then <strong>Add to Home Screen</strong>.
                </div>
              ) : (
                <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  Use browser menu (⋮) → <strong>Install app</strong> or <strong>Save and Share</strong>.
                </div>
              )}
            </div>

            {/* Download Desktop Shortcut (.url / .webloc) */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-100">
                  <Download className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  <span>Download Desktop Shortcut</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Place directly onto your Windows or Mac desktop for instant double-click launch.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={downloadWindowsShortcut}
                  className="flex-1 py-1.5 px-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 transition-colors cursor-pointer text-center"
                >
                  Windows (.url)
                </button>
                <button
                  onClick={downloadMacShortcut}
                  className="flex-1 py-1.5 px-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 transition-colors cursor-pointer text-center"
                >
                  Mac (.webloc)
                </button>
              </div>
            </div>
          </div>

          {/* Quick Setup Guide */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 space-y-2 text-xs">
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Ways to Keep Daily Notes at Hand
            </h4>
            <ul className="space-y-1.5 text-slate-600 dark:text-slate-300 pl-4 list-disc">
              <li>
                <strong>Browser Bookmark:</strong> Press <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 font-mono text-[10px] text-slate-700 dark:text-slate-300">Ctrl+D</kbd> (Windows) or <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 font-mono text-[10px] text-slate-700 dark:text-slate-300">Cmd+D</kbd> (Mac) to pin to your bookmarks bar.
              </li>
              <li>
                <strong>Browser Startup Page:</strong> Set your direct link as one of your browser startup tabs to see your reminders and calendar every morning when you open your browser.
              </li>
              <li>
                <strong>Mobile Home Screen:</strong> Add to home screen on iOS or Android for an app-like icon.
              </li>
              <li>
                <strong>Full HD &amp; 4K Resolution:</strong> Toggle between Full HD (1080p), 4K UHD (2160p), or Edge-to-Edge Fluid mode in the top navigation bar to fill modern high-resolution screens without horizontal letterboxing.
              </li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
          <a
            href={directUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1"
          >
            <span>Open in new browser tab</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 text-white rounded-xl text-xs font-medium transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
