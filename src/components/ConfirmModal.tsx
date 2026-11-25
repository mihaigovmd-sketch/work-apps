import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { ConfirmDialogState } from '../types';

interface ConfirmModalProps {
  state: ConfirmDialogState;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ state, onClose }) => {
  if (!state.isOpen) return null;

  const handleConfirm = async () => {
    try {
      await state.onConfirm();
      onClose();
    } catch (err) {
      console.error('Error during confirm action:', err);
    }
  };

  return (
    <div
      id="confirm-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 dark:bg-slate-950/80 backdrop-blur-xs p-4 animate-in fade-in duration-200"
    >
      <div
        id="confirm-modal-card"
        className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-full ${
                state.isDestructive
                  ? 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400'
                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
              }`}
            >
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 id="confirm-modal-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {state.title}
            </h3>
          </div>
          <button
            id="confirm-modal-close"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p id="confirm-modal-message" className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {state.message}
        </p>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            id="confirm-modal-cancel"
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            id="confirm-modal-action"
            type="button"
            onClick={handleConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-xl transition-colors cursor-pointer shadow-xs ${
              state.isDestructive
                ? 'bg-red-600 hover:bg-red-700 focus:ring-2 focus:ring-red-500'
                : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500'
            }`}
          >
            {state.confirmLabel || (state.isDestructive ? 'Delete' : 'Confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};
