import { useState, useEffect, useRef, useCallback } from 'react';

interface UseVoiceDictationOptions {
  onTranscript?: (text: string, isFinal: boolean) => void;
  defaultLang?: string;
}

export function useVoiceDictation({
  onTranscript,
  defaultLang = 'en-US',
}: UseVoiceDictationOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedLang, setSelectedLang] = useState<string>(() => {
    if (typeof window !== 'undefined' && navigator.language) {
      return navigator.language;
    }
    return defaultLang;
  });

  const recognitionRef = useRef<any>(null);
  const isManuallyStoppedRef = useRef(false);

  // Check if speech recognition is supported in this browser
  const isSupported =
    typeof window !== 'undefined' &&
    Boolean(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const stopListening = useCallback(() => {
    isManuallyStoppedRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn('Error stopping speech recognition:', e);
      }
    }
    setIsListening(false);
    setInterimText('');
  }, []);

  const startListening = useCallback(
    async (customLang?: string) => {
      setError(null);
      if (!isSupported) {
        setError('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
        return;
      }

      isManuallyStoppedRef.current = false;

      // Explicitly prompt/verify browser & iframe microphone permission first
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          // Release track immediately so SpeechRecognition has exclusive mic access
          stream.getTracks().forEach((track) => track.stop());
        } catch (permErr: any) {
          console.warn('Microphone getUserMedia check failed:', permErr);
          const errName = permErr?.name || '';
          isManuallyStoppedRef.current = true;
          setIsListening(false);

          if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
            setError('No microphone detected. Please connect or enable a microphone on your device.');
          } else {
            setError(
              'Microphone access was denied. Please click the lock/tune icon in your browser address bar to allow Microphone access, then reload.'
            );
          }
          return;
        }
      }

      try {
        const SpeechRecognition =
          (window as any).SpeechRecognition ||
          (window as any).webkitSpeechRecognition;

        if (recognitionRef.current) {
          try {
            recognitionRef.current.abort();
          } catch {}
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = customLang || selectedLang || navigator.language || 'en-US';

        recognition.onstart = () => {
          setIsListening(true);
          setError(null);
        };

        recognition.onresult = (event: any) => {
          let currentInterim = '';
          let currentFinal = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              currentFinal += transcript + ' ';
            } else {
              currentInterim += transcript;
            }
          }

          setInterimText(currentInterim);

          if (currentFinal && onTranscript) {
            onTranscript(currentFinal, true);
          } else if (currentInterim && onTranscript) {
            onTranscript(currentInterim, false);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition event error:', event.error);
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            isManuallyStoppedRef.current = true;
            setError(
              'Microphone access was denied. Please click the lock/tune icon in your browser address bar to allow Microphone access, then reload.'
            );
            setIsListening(false);
          } else if (event.error === 'audio-capture') {
            isManuallyStoppedRef.current = true;
            setError('No working microphone found. Check your audio input device and browser permissions.');
            setIsListening(false);
          } else if (event.error === 'no-speech' || event.error === 'aborted') {
            // Transient, keep state clean
          } else if (event.error === 'network') {
            isManuallyStoppedRef.current = true;
            setError('Voice recognition network issue. Please check your internet connection.');
            setIsListening(false);
          } else {
            isManuallyStoppedRef.current = true;
            setError(`Speech recognition notice: ${event.error}`);
            setIsListening(false);
          }
        };

        recognition.onend = () => {
          setInterimText('');
          // Automatically restart only if user hasn't stopped and no fatal error occurred
          if (!isManuallyStoppedRef.current) {
            try {
              recognition.start();
            } catch {
              setIsListening(false);
            }
          } else {
            setIsListening(false);
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err: any) {
        console.error('Failed to initialize speech recognition:', err);
        isManuallyStoppedRef.current = true;
        setError(err?.message || 'Failed to start microphone transcription.');
        setIsListening(false);
      }
    },
    [isSupported, selectedLang, onTranscript]
  );

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, stopListening, startListening]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      isManuallyStoppedRef.current = true;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    interimText,
    error,
    clearError,
    selectedLang,
    setSelectedLang,
    startListening,
    stopListening,
    toggleListening,
  };
}
