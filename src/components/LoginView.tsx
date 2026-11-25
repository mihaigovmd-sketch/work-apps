import React from 'react';
import { Calendar, FileText, HardDrive, CheckCircle2, Shield, Laptop, RefreshCw } from 'lucide-react';

interface LoginViewProps {
  onSignIn: () => Promise<void>;
  onContinueGuest?: () => void;
  isLoading: boolean;
  error?: string | null;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onSignIn,
  onContinueGuest,
  isLoading,
  error,
}) => {
  return (
    <div
      id="login-view-container"
      className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-900 dark:text-slate-100 transition-colors"
    >
      <div
        id="login-card"
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-8 md:p-10 shadow-xl shadow-slate-200/40 dark:shadow-none transition-colors"
      >
        {/* App Badge & Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-xs">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Daily Notes &amp; Calendar</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Google Drive &amp; Google Calendar Connected</p>
          </div>
        </div>

        <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-8">
          Write and organize your daily reflections, tasks, and notes directly into Google Drive, while scheduling appointments and tracking meetings seamlessly with your Google Calendar.
        </p>

        {/* Feature Highlights */}
        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-850/80 border border-slate-100 dark:border-slate-800">
            <HardDrive className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
            <div className="text-sm">
              <span className="font-semibold text-slate-800 dark:text-slate-200">Google Drive Storage:</span>{' '}
              <span className="text-slate-600 dark:text-slate-400">Daily notes are saved in your own Google Drive folder for safe, permanent access anywhere.</span>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-850/80 border border-slate-100 dark:border-slate-800">
            <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <div className="text-sm">
              <span className="font-semibold text-slate-800 dark:text-slate-200">Appointments &amp; Meetings:</span>{' '}
              <span className="text-slate-600 dark:text-slate-400">Directly view, create, and manage appointments and meetings on your primary Google Calendar.</span>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-850/80 border border-slate-100 dark:border-slate-800">
            <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
            <div className="text-sm">
              <span className="font-semibold text-slate-800 dark:text-slate-200">Your Data, Your Ownership:</span>{' '}
              <span className="text-slate-600 dark:text-slate-400">Direct client-side connection with Google Workspace with permission from your account.</span>
            </div>
          </div>
        </div>

        {error && (
          <div
            id="login-error-box"
            className="mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 space-y-2.5"
          >
            <div className="font-semibold flex items-center gap-2">
              <span>Authentication Notice</span>
            </div>
            <p className="leading-relaxed opacity-90">{error}</p>
            <p className="text-[11px] text-amber-800 dark:text-amber-300 opacity-80 leading-normal">
              Tip: If you have an ad-blocker or strict tracking protection enabled, it may block Google's login script. You can allow popups, retry, or continue immediately in offline local mode below.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 pt-2">
          {/* Primary: Sign In with Google */}
          <button
            id="google-signin-btn"
            onClick={onSignIn}
            disabled={isLoading}
            className="relative flex items-center justify-center gap-3 w-full py-3.5 px-6 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 active:bg-slate-100 text-slate-800 dark:text-slate-100 font-semibold text-sm rounded-2xl border border-slate-300 dark:border-slate-700 shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400" />
                Connecting to Google Workspace...
              </span>
            ) : (
              <>
                <svg
                  className="w-5 h-5 shrink-0"
                  viewBox="0 0 48 48"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                  <path fill="none" d="M0 0h48v48H0z" />
                </svg>
                <span>Sign in with Google</span>
              </>
            )}
          </button>

          {/* Secondary: Continue in Local / Offline Mode */}
          {onContinueGuest && (
            <button
              id="continue-guest-btn"
              onClick={onContinueGuest}
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 bg-slate-100/70 dark:bg-slate-800/60 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 rounded-xl border border-transparent hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer"
            >
              <Laptop className="w-3.5 h-3.5 text-slate-500" />
              <span>Continue in Offline / Local Mode (No Account Required)</span>
            </button>
          )}

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Connects Google Drive &amp; Calendar with user permission</span>
          </div>
        </div>
      </div>
    </div>
  );
};
