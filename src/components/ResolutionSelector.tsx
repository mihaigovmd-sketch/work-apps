import React, { useState, useRef, useEffect } from 'react';
import { Tv, Check, ChevronDown, Monitor, Maximize2, Minimize2 } from 'lucide-react';
import { ScreenResolution } from '../types';
import { RESOLUTION_CONFIG } from '../hooks/useResolution';

interface ResolutionSelectorProps {
  currentResolution: ScreenResolution;
  onSelectResolution: (resolution: ScreenResolution) => void;
}

export const ResolutionSelector: React.FC<ResolutionSelectorProps> = ({
  currentResolution,
  onSelectResolution,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeConfig = RESOLUTION_CONFIG[currentResolution] || RESOLUTION_CONFIG.fhd;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const resolutionOptions: ScreenResolution[] = ['fhd', '4k', 'fluid', 'standard'];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        id="btn-resolution-selector"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl transition-all shadow-xs cursor-pointer"
        title={`Current resolution: ${activeConfig.label}. Click to adjust for Full HD, 4K, or Full Width.`}
      >
        {currentResolution === '4k' ? (
          <Maximize2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
        ) : currentResolution === 'fluid' ? (
          <Tv className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        ) : currentResolution === 'fhd' ? (
          <Monitor className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
        ) : (
          <Minimize2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
        )}

        <span className="font-semibold text-[11px] text-slate-800 dark:text-slate-200 hidden sm:inline">
          {activeConfig.shortLabel}
        </span>
        <span className="text-[10px] px-1 py-0.2 rounded font-bold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
          {activeConfig.tag}
        </span>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          id="resolution-dropdown-menu"
          className="absolute right-0 mt-1.5 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Display Resolution
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              Canvas Scaling
            </span>
          </div>

          <div className="p-1 space-y-1">
            {resolutionOptions.map((resKey) => {
              const item = RESOLUTION_CONFIG[resKey];
              const isSelected = currentResolution === resKey;

              return (
                <button
                  key={resKey}
                  type="button"
                  onClick={() => {
                    onSelectResolution(resKey);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors flex items-start justify-between gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span>{item.label}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {item.tag}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                      {item.description}
                    </p>
                  </div>

                  {isSelected && (
                    <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="px-3.5 py-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400">
            Select <strong>Full HD (1080p)</strong> or <strong>4K UHD</strong> to expand across wide screens without horizontal letterboxing.
          </div>
        </div>
      )}
    </div>
  );
};
