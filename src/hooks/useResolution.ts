import { useState, useEffect } from 'react';
import { ScreenResolution } from '../types';

const STORAGE_KEY = 'daily_notes_screen_resolution';

export const RESOLUTION_CONFIG: Record<
  ScreenResolution,
  {
    id: ScreenResolution;
    label: string;
    shortLabel: string;
    maxWidthClass: string;
    description: string;
    tag: string;
  }
> = {
  fhd: {
    id: 'fhd',
    label: 'Full HD (1080p)',
    shortLabel: 'FHD',
    maxWidthClass: 'max-w-[1920px]',
    description: '1920px max width, tailored for standard 1080p monitors & laptops',
    tag: '1080p',
  },
  '4k': {
    id: '4k',
    label: '4K Ultra HD (2160p)',
    shortLabel: '4K UHD',
    maxWidthClass: 'max-w-[3840px]',
    description: '3840px max width, expansive canvas for 4K, 5K & ultrawide displays',
    tag: '4K',
  },
  fluid: {
    id: 'fluid',
    label: '100% Full Width (Edge-to-Edge)',
    shortLabel: 'Fluid',
    maxWidthClass: 'max-w-none',
    description: 'No max-width limits, expands completely across any screen size',
    tag: 'Full',
  },
  standard: {
    id: 'standard',
    label: 'Standard / Compact',
    shortLabel: 'Compact',
    maxWidthClass: 'max-w-7xl',
    description: '1280px max width, focused centered column for compact windows',
    tag: '720p',
  },
};

export const useResolution = () => {
  const [resolution, setResolution] = useState<ScreenResolution>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ScreenResolution | null;
      if (saved && RESOLUTION_CONFIG[saved]) {
        return saved;
      }
      // If user is on a 4K or ultrawide screen (> 2560px), we can even smart-default to 4k!
      if (typeof window !== 'undefined' && window.innerWidth >= 2560) {
        return '4k';
      }
      // Otherwise default to Full HD ('fhd') as requested by user
      return 'fhd';
    } catch {
      return 'fhd';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, resolution);
    } catch {
      // ignore storage errors
    }
  }, [resolution]);

  const config = RESOLUTION_CONFIG[resolution];

  const cycleResolution = () => {
    const sequence: ScreenResolution[] = ['fhd', '4k', 'fluid', 'standard'];
    const currentIndex = sequence.indexOf(resolution);
    const nextIndex = (currentIndex + 1) % sequence.length;
    setResolution(sequence[nextIndex]);
  };

  return {
    resolution,
    setResolution,
    cycleResolution,
    config,
    maxWidthClass: config.maxWidthClass,
  };
};
