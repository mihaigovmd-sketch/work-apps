import { useState, useEffect, useCallback } from 'react';
import {
  NotificationSoundType,
  playNotificationSound,
  SOUND_OPTIONS,
} from '../services/soundEngine';

const STORAGE_KEY = 'daily_notes_sound_settings_v1';

export interface SoundSettings {
  soundType: NotificationSoundType;
  volume: number; // 0 to 1
  soundOnNotes: boolean;
  soundOnReminders: boolean;
  soundOnCalendar: boolean;
}

const DEFAULT_SETTINGS: SoundSettings = {
  soundType: 'chime',
  volume: 0.5,
  soundOnNotes: true,
  soundOnReminders: true,
  soundOnCalendar: true,
};

export function useSoundSettings() {
  const [settings, setSettings] = useState<SoundSettings>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      }
    } catch {
      // ignore JSON parse error
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore storage error
    }
  }, [settings]);

  const updateSettings = useCallback((updates: Partial<SoundSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const previewSound = useCallback(
    (type?: NotificationSoundType) => {
      const soundToPlay = type || settings.soundType;
      playNotificationSound(soundToPlay, settings.volume);
    },
    [settings.soundType, settings.volume]
  );

  const notifyNoteSaved = useCallback(() => {
    if (settings.soundOnNotes && settings.soundType !== 'silent') {
      playNotificationSound(settings.soundType, settings.volume);
    }
  }, [settings.soundOnNotes, settings.soundType, settings.volume]);

  const notifyReminderAction = useCallback(() => {
    if (settings.soundOnReminders && settings.soundType !== 'silent') {
      playNotificationSound(settings.soundType, settings.volume);
    }
  }, [settings.soundOnReminders, settings.soundType, settings.volume]);

  const notifyCalendarScheduled = useCallback(() => {
    if (settings.soundOnCalendar && settings.soundType !== 'silent') {
      playNotificationSound(settings.soundType, settings.volume);
    }
  }, [settings.soundOnCalendar, settings.soundType, settings.volume]);

  return {
    settings,
    updateSettings,
    previewSound,
    notifyNoteSaved,
    notifyReminderAction,
    notifyCalendarScheduled,
    soundOptions: SOUND_OPTIONS,
  };
}
