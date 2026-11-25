/**
 * Web Audio API Sound Engine
 * Generates pleasant, warm, non-startling office notification chimes and beeps.
 * Works 100% offline without remote audio files or latency.
 */

export type NotificationSoundType =
  | 'chime'
  | 'desk_bell'
  | 'marimba'
  | 'soft_ping'
  | 'office_beep'
  | 'silent';

export interface SoundOption {
  id: NotificationSoundType;
  name: string;
  description: string;
  iconTag: string;
}

export const SOUND_OPTIONS: SoundOption[] = [
  {
    id: 'chime',
    name: 'Executive Chime',
    description: 'Soft two-tone harmonic chime (warm & modern)',
    iconTag: '🔔',
  },
  {
    id: 'desk_bell',
    name: 'Office Desk Bell',
    description: 'Crisp, gentle reception bell chime',
    iconTag: '🛎️',
  },
  {
    id: 'marimba',
    name: 'Warm Marimba',
    description: 'Relaxing 3-note ascending wooden marimba',
    iconTag: '🎵',
  },
  {
    id: 'soft_ping',
    name: 'Gentle Ping / Pop',
    description: 'Discreet water drop pop for quiet spaces',
    iconTag: '🫧',
  },
  {
    id: 'office_beep',
    name: 'Polite Office Beep',
    description: 'Soft double pip tone (gentle digital alert)',
    iconTag: '📟',
  },
  {
    id: 'silent',
    name: 'Muted / Silent',
    description: 'Visual notifications only, no sounds',
    iconTag: '🔇',
  },
];

let globalAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!globalAudioCtx) {
      const AudioCtxClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        globalAudioCtx = new AudioCtxClass();
      }
    }
    if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
      globalAudioCtx.resume().catch(() => {});
    }
    return globalAudioCtx;
  } catch {
    return null;
  }
}

/**
 * Play a synthesized tone with customizable frequency, duration, type, and start offset.
 */
function playTone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  gainLevel: number,
  waveType: OscillatorType = 'sine',
  pitchSweepTo?: number
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = waveType;
  osc.frequency.setValueAtTime(freq, startTime);
  if (pitchSweepTo) {
    osc.frequency.exponentialRampToValueAtTime(pitchSweepTo, startTime + duration);
  }

  // Smooth attack and exponential decay to prevent clicks
  const attack = Math.min(0.015, duration * 0.1);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(gainLevel, startTime + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

/**
 * Play selected notification sound
 * @param soundId Sound type to play
 * @param volume Master volume multiplier (0.0 to 1.0)
 */
export function playNotificationSound(soundId: NotificationSoundType, volume = 0.5) {
  if (soundId === 'silent' || volume <= 0) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const masterGain = Math.max(0.01, Math.min(1.0, volume)) * 0.35; // keep comfortable volume

  switch (soundId) {
    case 'chime': {
      // Warm Executive Two-tone Chime: C6 (1046.5Hz) -> E6 (1318.5Hz)
      playTone(ctx, 1046.5, now, 0.32, masterGain * 0.9, 'sine');
      playTone(ctx, 1318.5, now + 0.11, 0.48, masterGain, 'sine');
      // Gentle harmonic overtone for warmth
      playTone(ctx, 2093, now + 0.11, 0.25, masterGain * 0.15, 'sine');
      break;
    }

    case 'desk_bell': {
      // Refined desk bell: A5 (880Hz) with soft bell shimmer
      playTone(ctx, 880, now, 0.65, masterGain, 'sine');
      playTone(ctx, 1760, now, 0.45, masterGain * 0.25, 'sine');
      playTone(ctx, 2640, now, 0.25, masterGain * 0.08, 'sine');
      break;
    }

    case 'marimba': {
      // Warm 3-note marimba chord: E5 (659.3Hz) -> G#5 (830.6Hz) -> B5 (987.8Hz)
      playTone(ctx, 659.3, now, 0.22, masterGain * 0.85, 'triangle');
      playTone(ctx, 830.6, now + 0.09, 0.25, masterGain * 0.9, 'triangle');
      playTone(ctx, 987.8, now + 0.18, 0.45, masterGain, 'sine');
      break;
    }

    case 'soft_ping': {
      // Subtle water drop pop (sweep 680Hz -> 1080Hz)
      playTone(ctx, 680, now, 0.14, masterGain * 0.9, 'sine', 1080);
      break;
    }

    case 'office_beep': {
      // Friendly, non-startling double office pip
      playTone(ctx, 920, now, 0.065, masterGain * 0.85, 'sine');
      playTone(ctx, 1180, now + 0.085, 0.075, masterGain, 'sine');
      break;
    }

    default:
      break;
  }
}
