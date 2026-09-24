import { getAvailableVietnameseVoice, playVietnameseSpeech, stopVietnameseSpeech } from './vietnameseSpeech';

export type InterviewLanguage = 'vi' | 'en';

export function resolveInterviewVoice(language: InterviewLanguage): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  if (language === 'vi') return getAvailableVietnameseVoice();
  const voices = window.speechSynthesis.getVoices();
  return voices.find(voice => voice.lang.toLowerCase() === 'en-us')
    || voices.find(voice => voice.lang.toLowerCase().startsWith('en'))
    || null;
}

export function stopInterviewSpeech(): void { stopVietnameseSpeech(); }

export function playInterviewSpeech(text: string, language: InterviewLanguage, callbacks?: {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error?: unknown) => void;
}): void {
  if (language === 'vi') { playVietnameseSpeech(text, callbacks); return; }
  stopInterviewSpeech();
  const voice = resolveInterviewVoice('en');
  if (!voice || typeof window === 'undefined' || !('speechSynthesis' in window)) {
    callbacks?.onError?.(new Error('ENGLISH_TTS_VOICE_UNAVAILABLE'));
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.lang = 'en-US';
  utterance.onstart = () => callbacks?.onStart?.();
  utterance.onend = () => callbacks?.onEnd?.();
  utterance.onerror = event => callbacks?.onError?.(event);
  window.speechSynthesis.speak(utterance);
}
