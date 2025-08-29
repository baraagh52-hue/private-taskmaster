import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { toast } from 'sonner';

interface TTSOptions {
  voice?: SpeechSynthesisVoice | null;
  rate?: number;
  pitch?: number;
  volume?: number;
  model?: string;
  speakerId?: string;
  languageId?: string;
}

export const useTextToSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSupported, setIsSupported] = useState(false);
  const [coquiStatus, setCoquiStatus] = useState<{
    available: boolean;
    configured: boolean;
    models?: any[];
  }>({ available: false, configured: false });
  const [isLoading, setIsLoading] = useState(false);
  
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const voicePreferences = useQuery(api.voicePreferences.getUserVoicePreferences);
  const updatePreferences = useMutation(api.voicePreferences.updateVoicePreferences);
  const textToSpeechAction = useAction(api.voice.textToSpeech);
  const checkCoquiStatusAction = useAction(api.voice.checkCoquiStatus);
  const getCoquiModelsAction = useAction(api.voice.getCoquiModels);

  // Check for browser support
  useEffect(() => {
    const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
    setIsSupported(supported);
    
    if (!supported) {
      toast.error('Your browser does not support text-to-speech');
    }
  }, []);

  // Check Coqui TTS status on mount
  useEffect(() => {
    const checkCoqui = async () => {
      try {
        const status = await checkCoquiStatusAction();
        setCoquiStatus(status);
        
        if (status.available) {
          const modelsResult = await getCoquiModelsAction();
          if (modelsResult.success) {
            setCoquiStatus(prev => ({ ...prev, models: modelsResult.models }));
          }
        }
      } catch (error) {
        console.error('Failed to check Coqui status:', error);
      }
    };
    
    checkCoqui();
  }, [checkCoquiStatusAction, getCoquiModelsAction]);

  // Load available voices
  useEffect(() => {
    if (!isSupported) return;

    const synth = window.speechSynthesis;
    
    const loadVoices = () => {
      const availableVoices = synth.getVoices();
      setVoices(availableVoices);
    };

    loadVoices();
    
    if (synth.onvoiceschanged !== undefined) {
      synth.addEventListener('voiceschanged', loadVoices);
    }

    return () => {
      if (synth.onvoiceschanged !== undefined) {
        synth.removeEventListener('voiceschanged', loadVoices);
      }
    };
  }, [isSupported]);

  // Get preferred voice
  const getPreferredVoice = useCallback(() => {
    if (!voicePreferences?.preferredVoice || voices.length === 0) {
      // Default to first English voice or first available voice
      return voices.find(voice => voice.lang.startsWith('en')) || voices[0] || null;
    }
    
    return voices.find(voice => voice.name === voicePreferences.preferredVoice) || voices[0] || null;
  }, [voices, voicePreferences?.preferredVoice]);

  const speak = useCallback(async (text: string, options?: TTSOptions) => {
    if (!text.trim()) {
      toast.error('No text provided for speech synthesis');
      return;
    }

    setIsLoading(true);
    
    try {
      // Try Coqui TTS first if available
      if (coquiStatus.available) {
        const result = await textToSpeechAction({
          text,
          model: options?.model,
          speakerId: options?.speakerId,
          languageId: options?.languageId,
        });
        
        if (result.success && result.provider === 'coqui' && result.audioData) {
          // Play Coqui-generated audio
          const audio = new Audio(result.audioUrl);
          audioRef.current = audio;
          
          audio.onloadstart = () => {
            setIsSpeaking(true);
            setIsPaused(false);
            setIsLoading(false);
          };
          
          audio.onended = () => {
            setIsSpeaking(false);
            setIsPaused(false);
          };
          
          audio.onerror = (error) => {
            console.error('Audio playback error:', error);
            toast.error('Failed to play generated audio');
            setIsSpeaking(false);
            setIsPaused(false);
            setIsLoading(false);
            // Fallback to browser TTS
            speakWithBrowser(text, options);
          };
          
          await audio.play();
          toast.success('Using Coqui TTS for high-quality speech');
          return;
        }
      }
      
      // Fallback to browser TTS
      setIsLoading(false);
      speakWithBrowser(text, options);
      
    } catch (error) {
      console.error('TTS error:', error);
      setIsLoading(false);
      toast.error('Speech synthesis failed');
      // Try browser fallback
      if (isSupported) {
        speakWithBrowser(text, options);
      }
    }
  }, [coquiStatus.available, textToSpeechAction, isSupported, voicePreferences, getPreferredVoice]);

  const speakWithBrowser = useCallback((text: string, options?: TTSOptions) => {
    if (!isSupported) {
      toast.error('Browser TTS not supported');
      return;
    }

    const synth = window.speechSynthesis;
    
    // Cancel any ongoing speech
    synth.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Apply voice preferences or options
    const voice = options?.voice || getPreferredVoice();
    if (voice) {
      utterance.voice = voice;
    }
    
    utterance.rate = options?.rate || voicePreferences?.speechRate || 1;
    utterance.pitch = options?.pitch || voicePreferences?.speechPitch || 1;
    utterance.volume = options?.volume || voicePreferences?.speechVolume || 1;
    
    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };
    
    utterance.onpause = () => {
      setIsPaused(true);
    };
    
    utterance.onresume = () => {
      setIsPaused(false);
    };
    
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      toast.error('Browser speech synthesis failed');
      setIsSpeaking(false);
      setIsPaused(false);
    };
    
    utteranceRef.current = utterance;
    synth.speak(utterance);
  }, [isSupported, voicePreferences, getPreferredVoice]);

  const pause = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setIsPaused(true);
    } else if (isSupported && window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
    }
  }, [isSupported]);

  const resume = useCallback(() => {
    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.play();
      setIsPaused(false);
    } else if (isSupported && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  }, [isSupported]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    if (isSupported) {
      window.speechSynthesis.cancel();
    }
    
    setIsSpeaking(false);
    setIsPaused(false);
  }, [isSupported]);

  const saveVoicePreferences = useCallback(async (preferences: {
    preferredVoice?: string;
    speechRate?: number;
    speechPitch?: number;
    speechVolume?: number;
  }) => {
    try {
      await updatePreferences(preferences);
      toast.success('Voice preferences saved');
    } catch (error) {
      console.error('Failed to save voice preferences:', error);
      toast.error('Failed to save voice preferences');
    }
  }, [updatePreferences]);

  return {
    speak,
    pause,
    resume,
    stop,
    isSpeaking,
    isPaused,
    isLoading,
    voices,
    isSupported,
    voicePreferences,
    saveVoicePreferences,
    preferredVoice: getPreferredVoice(),
    coquiStatus,
  };
};